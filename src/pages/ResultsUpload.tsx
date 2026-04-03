import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Send, AlertCircle, CheckCircle, FileSpreadsheet, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface ResultEntry {
  studentEmail: string;
  test1: number;
  individualAssignment: number;
  groupAssignment: number;
  universityExam: number;
  courseworkTotal: number;
  score: number;
  grade: string;
  valid: boolean;
  error?: string;
}

function calculateGrade(score: number): string {
  if (score >= 70) return "A";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  if (score >= 45) return "D";
  if (score >= 40) return "E";
  return "F";
}

function computeFinalScore(test1: number, individual: number, group: number, ue: number) {
  const courseworkTotal = (test1 * 0.20) + (individual * 0.15) + (group * 0.15);
  const ueWeighted = ue * 0.50;
  return { courseworkTotal, finalScore: Math.round(courseworkTotal + ueWeighted) };
}

function parseCSV(text: string): ResultEntry[] {
  const lines = text.trim().split("\n");
  const results: ResultEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((s) => s.trim());
    const email = parts[0] || "";
    const test1 = parseFloat(parts[1]);
    const individual = parseFloat(parts[2]);
    const group = parseFloat(parts[3]);
    const ue = parseFloat(parts[4]);
    const allValid = [test1, individual, group, ue].every((v) => !isNaN(v) && v >= 0 && v <= 100);
    const valid = !!email && allValid;
    if (valid) {
      const { courseworkTotal, finalScore } = computeFinalScore(test1, individual, group, ue);
      results.push({ studentEmail: email, test1, individualAssignment: individual, groupAssignment: group, universityExam: ue, courseworkTotal, score: finalScore, grade: calculateGrade(finalScore), valid: true });
    } else {
      results.push({ studentEmail: email, test1: test1 || 0, individualAssignment: individual || 0, groupAssignment: group || 0, universityExam: ue || 0, courseworkTotal: 0, score: 0, grade: "", valid: false, error: "Invalid data" });
    }
  }
  return results;
}

const ExistingResultsTable = ({ results }: { results: any[] }) => {
  const { data: profiles = [] } = useQuery({
    queryKey: ["student-profiles-for-results", results.map((r) => r.student_id)],
    queryFn: async () => {
      const ids = [...new Set(results.map((r) => r.student_id))];
      if (ids.length === 0) return [];
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids);
      if (error) throw error;
      return data;
    },
    enabled: results.length > 0,
  });
  const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
  if (results.length === 0) return null;

  return (
    <>
      <h3 className="text-sm font-semibold text-foreground mb-2">Previously Uploaded Results</h3>
      <div className="bg-card border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>T1 (20%)</TableHead>
              <TableHead>IA (15%)</TableHead>
              <TableHead>GA (15%)</TableHead>
              <TableHead>UE (50%)</TableHead>
              <TableHead>CW Total</TableHead>
              <TableHead>Final</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((r) => {
              const p = profileMap.get(r.student_id);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{p?.full_name || r.student_id.slice(0, 8)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{p?.email || "—"}</TableCell>
                  <TableCell>{r.test1_score ?? "—"}</TableCell>
                  <TableCell>{r.individual_assignment ?? "—"}</TableCell>
                  <TableCell>{r.group_assignment ?? "—"}</TableCell>
                  <TableCell>{r.university_exam ?? "—"}</TableCell>
                  <TableCell>{r.coursework_total != null ? Number(r.coursework_total).toFixed(1) : "—"}</TableCell>
                  <TableCell className="font-semibold">{r.score ?? "—"}</TableCell>
                  <TableCell className="font-semibold">{r.grade || "—"}</TableCell>
                  <TableCell><Badge variant={r.status === "approved" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

const ResultsUpload = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedAllocation, setSelectedAllocation] = useState("");
  const [entries, setEntries] = useState<ResultEntry[]>([]);
  const [manualEmail, setManualEmail] = useState("");
  const [manualTest1, setManualTest1] = useState("");
  const [manualIndividual, setManualIndividual] = useState("");
  const [manualGroup, setManualGroup] = useState("");
  const [manualUE, setManualUE] = useState("");

  const { data: allocations = [] } = useQuery({
    queryKey: ["my-allocations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("course_allocations")
        .select("*, courses:course_id(id, code, title)")
        .eq("lecturer_id", user.id)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const currentAllocation = allocations.find((a) => a.id === selectedAllocation);
  const selectedCourse = currentAllocation ? (currentAllocation.courses as any)?.id : "";
  const academicSession = currentAllocation?.academic_session || "";
  const allocationSemester = (currentAllocation as any)?.semester || "";
  const allocationLevel = (currentAllocation as any)?.level || "";
  const allocationYear = (currentAllocation as any)?.year_of_study || "";

  const { data: existingResults = [] } = useQuery({
    queryKey: ["my-results-upload", selectedCourse, academicSession],
    queryFn: async () => {
      if (!selectedCourse || !user) return [];
      const { data, error } = await supabase
        .from("results")
        .select("*")
        .eq("course_id", selectedCourse)
        .eq("lecturer_id", user.id)
        .eq("academic_session", academicSession);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCourse && !!user,
  });

  const downloadTemplate = () => {
    const header = "student_email,test1_score,individual_assignment,group_assignment,university_exam";
    const sampleRows = [
      "student1@university.edu,75,80,70,65",
      "student2@university.edu,60,55,70,58",
    ];
    const csv = [header, ...sampleRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "results_template.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setEntries(parsed);
      toast.info(`Parsed ${parsed.length} rows, ${parsed.filter((r) => r.valid).length} valid`);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const addManualEntry = () => {
    const t1 = parseFloat(manualTest1);
    const ind = parseFloat(manualIndividual);
    const grp = parseFloat(manualGroup);
    const ue = parseFloat(manualUE);
    if (!manualEmail || [t1, ind, grp, ue].some((v) => isNaN(v) || v < 0 || v > 100)) {
      toast.error("Enter valid email and scores (0–100 each)");
      return;
    }
    const { courseworkTotal, finalScore } = computeFinalScore(t1, ind, grp, ue);
    setEntries((prev) => [...prev, {
      studentEmail: manualEmail, test1: t1, individualAssignment: ind, groupAssignment: grp,
      universityExam: ue, courseworkTotal, score: finalScore, grade: calculateGrade(finalScore), valid: true,
    }]);
    setManualEmail(""); setManualTest1(""); setManualIndividual(""); setManualGroup(""); setManualUE("");
  };

  const saveDraftMutation = useMutation({
    mutationFn: async (status: "draft" | "submitted") => {
      if (!user || !selectedCourse) throw new Error("Select a course first");
      const validEntries = entries.filter((e) => e.valid);
      if (validEntries.length === 0) throw new Error("No valid entries");

      const { data: studentProfiles, error: lookupError } = await supabase
        .from("profiles")
        .select("user_id, email")
        .in("email", validEntries.map((e) => e.studentEmail));
      if (lookupError) throw lookupError;

      const emailToId = new Map(studentProfiles?.map((p) => [p.email, p.user_id]) || []);
      const rows = validEntries
        .filter((e) => emailToId.has(e.studentEmail))
        .map((e) => ({
          student_id: emailToId.get(e.studentEmail)!,
          course_id: selectedCourse,
          lecturer_id: user.id,
          academic_session: academicSession,
          test1_score: e.test1,
          individual_assignment: e.individualAssignment,
          group_assignment: e.groupAssignment,
          university_exam: e.universityExam,
          coursework_total: e.courseworkTotal,
          score: e.score,
          grade: e.grade,
          status,
          submitted_at: status === "submitted" ? new Date().toISOString() : null,
        }));

      if (rows.length === 0) throw new Error("No matching student profiles found");
      const { error } = await supabase.from("results").upsert(rows, { onConflict: "student_id,course_id,academic_session" as never });
      if (error) throw error;
    },
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ["my-results-upload"] });
      toast.success(status === "submitted" ? "Results submitted for approval" : "Draft saved");
      if (status === "submitted") setEntries([]);
    },
    onError: (e) => toast.error(e.message),
  });

  const validCount = entries.filter((e) => e.valid).length;
  const invalidCount = entries.length - validCount;

  return (
    <div>
      <PageHeader title="Results Management" description="Upload results — Coursework (50%): Test1 20%, Individual 15%, Group 15% | UE (50%)" />

      <div className="grid gap-4 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Course Allocation</CardTitle></CardHeader>
          <CardContent>
            <Select value={selectedAllocation} onValueChange={setSelectedAllocation}>
              <SelectTrigger><SelectValue placeholder="Select assigned course" /></SelectTrigger>
              <SelectContent>
                {allocations.map((a) => {
                  const course = a.courses as { id: string; code: string; title: string } | null;
                  return course ? (
                    <SelectItem key={a.id} value={a.id}>
                      {course.code} — {course.title} ({a.academic_session})
                    </SelectItem>
                  ) : null;
                })}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Session / Semester / Level</CardTitle></CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <p className="font-medium">{academicSession || "—"}</p>
              <p className="text-muted-foreground text-xs">
                {allocationSemester ? `Semester ${allocationSemester}` : "—"} · <span className="capitalize">{allocationLevel || "—"}</span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Upload CSV</CardTitle></CardHeader>
          <CardContent>
            <Label htmlFor="csv-upload" className="cursor-pointer flex items-center gap-2 border border-dashed border-border rounded-md p-3 hover:bg-muted/50 transition-colors">
              <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upload CSV file</span>
            </Label>
            <input id="csv-upload" type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Template</CardTitle></CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={downloadTemplate}>
              <FileSpreadsheet className="w-4 h-4" /> Download CSV Template
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Manual entry with coursework breakdown */}
      <Card className="mb-6">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Manual Entry</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Student Email</Label>
              <Input value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="student@university.edu" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Test 1 (20%)</Label>
              <Input type="number" min={0} max={100} value={manualTest1} onChange={(e) => setManualTest1(e.target.value)} placeholder="0-100" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Individual (15%)</Label>
              <Input type="number" min={0} max={100} value={manualIndividual} onChange={(e) => setManualIndividual(e.target.value)} placeholder="0-100" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Group (15%)</Label>
              <Input type="number" min={0} max={100} value={manualGroup} onChange={(e) => setManualGroup(e.target.value)} placeholder="0-100" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">UE (50%)</Label>
              <Input type="number" min={0} max={100} value={manualUE} onChange={(e) => setManualUE(e.target.value)} placeholder="0-100" />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="outline" onClick={addManualEntry}>Add Entry</Button>
          </div>
        </CardContent>
      </Card>

      {/* Validation summary */}
      {entries.length > 0 && (
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5 text-sm">
            <CheckCircle className="w-4 h-4 text-accent" />
            <span>{validCount} valid</span>
          </div>
          {invalidCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span>{invalidCount} invalid</span>
            </div>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => saveDraftMutation.mutate("draft")} disabled={saveDraftMutation.isPending}>
              <Save className="w-4 h-4 mr-1" /> Save Draft
            </Button>
            <Button size="sm" onClick={() => saveDraftMutation.mutate("submitted")} disabled={saveDraftMutation.isPending}>
              <Send className="w-4 h-4 mr-1" /> Submit for Approval
            </Button>
          </div>
        </div>
      )}

      {/* Entries table */}
      {entries.length > 0 && (
        <div className="bg-card border border-border rounded-lg mb-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>T1 (20%)</TableHead>
                <TableHead>IA (15%)</TableHead>
                <TableHead>GA (15%)</TableHead>
                <TableHead>UE (50%)</TableHead>
                <TableHead>CW Total</TableHead>
                <TableHead>Final</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">{entry.studentEmail}</TableCell>
                  <TableCell>{entry.test1}</TableCell>
                  <TableCell>{entry.individualAssignment}</TableCell>
                  <TableCell>{entry.groupAssignment}</TableCell>
                  <TableCell>{entry.universityExam}</TableCell>
                  <TableCell>{entry.courseworkTotal.toFixed(1)}</TableCell>
                  <TableCell className="font-semibold">{entry.score}</TableCell>
                  <TableCell className="font-semibold">{entry.grade}</TableCell>
                  <TableCell>
                    {entry.valid ? <Badge variant="default">Valid</Badge> : <Badge variant="destructive">{entry.error}</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ExistingResultsTable results={existingResults} />

      {existingResults.length > 0 && selectedCourse && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={async () => {
              try {
                const { data, error } = await supabase.functions.invoke("send-sms-notification", {
                  body: { type: "published", course_id: selectedCourse, academic_session: academicSession },
                });
                if (error) throw error;
                toast.success(`SMS sent to ${data?.sent || 0} students`);
              } catch (e: any) {
                toast.error(e.message || "Failed to send SMS");
              }
            }}
          >
            <MessageSquare className="w-4 h-4" /> Notify Students via SMS
          </Button>
        </div>
      )}
    </div>
  );
};

export default ResultsUpload;
