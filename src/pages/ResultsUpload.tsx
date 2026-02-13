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
import { Save, Send, AlertCircle, CheckCircle, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

interface ResultEntry {
  studentEmail: string;
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

function parseCSV(text: string): ResultEntry[] {
  const lines = text.trim().split("\n");
  const results: ResultEntry[] = [];
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((s) => s.trim());
    const email = parts[0] || "";
    const scoreRaw = parseFloat(parts[1]);
    const valid = !!email && !isNaN(scoreRaw) && scoreRaw >= 0 && scoreRaw <= 100;
    const score = valid ? scoreRaw : 0;
    results.push({
      studentEmail: email,
      score,
      grade: valid ? calculateGrade(score) : "",
      valid,
      error: !valid ? "Invalid email or score" : undefined,
    });
  }
  return results;
}

const ExistingResultsTable = ({ results }: { results: { id: string; student_id: string; score: number | null; grade: string | null; status: string }[] }) => {
  const { data: profiles = [] } = useQuery({
    queryKey: ["student-profiles-for-results", results.map((r) => r.student_id)],
    queryFn: async () => {
      const ids = [...new Set(results.map((r) => r.student_id))];
      if (ids.length === 0) return [];
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, student_id, email").in("user_id", ids);
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
              <TableHead>Score</TableHead>
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
                  <TableCell className="text-muted-foreground">{p?.email || "—"}</TableCell>
                  <TableCell>{r.score}</TableCell>
                  <TableCell>{r.grade}</TableCell>
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
  const [selectedCourse, setSelectedCourse] = useState("");
  const [academicSession, setAcademicSession] = useState("2024/2025");
  const [entries, setEntries] = useState<ResultEntry[]>([]);
  const [manualEmail, setManualEmail] = useState("");
  const [manualScore, setManualScore] = useState("");

  // Get lecturer's allocated courses
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

  // Existing results for this course
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

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setEntries(parsed);
      const validCount = parsed.filter((r) => r.valid).length;
      toast.info(`Parsed ${parsed.length} rows, ${validCount} valid`);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const addManualEntry = () => {
    const score = parseFloat(manualScore);
    if (!manualEmail || isNaN(score) || score < 0 || score > 100) {
      toast.error("Enter a valid email and score (0–100)");
      return;
    }
    setEntries((prev) => [...prev, { studentEmail: manualEmail, score, grade: calculateGrade(score), valid: true }]);
    setManualEmail("");
    setManualScore("");
  };

  const saveDraftMutation = useMutation({
    mutationFn: async (status: "draft" | "submitted") => {
      if (!user || !selectedCourse) throw new Error("Select a course first");
      const validEntries = entries.filter((e) => e.valid);
      if (validEntries.length === 0) throw new Error("No valid entries");

      // Look up student IDs by email
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
      <PageHeader title="Results Management" description="Upload and manage academic results for your courses" />

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Course</CardTitle></CardHeader>
          <CardContent>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>
                {allocations.map((a) => {
                  const course = a.courses as { id: string; code: string; title: string } | null;
                  return course ? <SelectItem key={course.id} value={course.id}>{course.code} — {course.title}</SelectItem> : null;
                })}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Academic Session</CardTitle></CardHeader>
          <CardContent>
            <Input value={academicSession} onChange={(e) => setAcademicSession(e.target.value)} placeholder="2024/2025" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Upload CSV</CardTitle></CardHeader>
          <CardContent>
            <Label htmlFor="csv-upload" className="cursor-pointer flex items-center gap-2 border border-dashed border-border rounded-md p-3 hover:bg-muted/50 transition-colors">
              <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Choose CSV file (email,score)</span>
            </Label>
            <input id="csv-upload" type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </CardContent>
        </Card>
      </div>

      {/* Manual entry */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Student Email</Label>
              <Input value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="student@university.edu" />
            </div>
            <div className="w-32 space-y-1">
              <Label className="text-xs">Score</Label>
              <Input type="number" min={0} max={100} value={manualScore} onChange={(e) => setManualScore(e.target.value)} placeholder="75" />
            </div>
            <Button variant="outline" onClick={addManualEntry}>Add</Button>
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
        <div className="bg-card border border-border rounded-lg mb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Email</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, i) => (
                <TableRow key={i}>
                  <TableCell>{entry.studentEmail}</TableCell>
                  <TableCell>{entry.score}</TableCell>
                  <TableCell>{entry.grade}</TableCell>
                  <TableCell>
                    {entry.valid ? (
                      <Badge variant="default">Valid</Badge>
                    ) : (
                      <Badge variant="destructive">{entry.error}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Existing results */}
      <ExistingResultsTable results={existingResults} />
    </div>
  );
};

export default ResultsUpload;
