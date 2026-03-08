import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, AlertCircle } from "lucide-react";

const Login = () => {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect when authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      // Don't navigate here — the useEffect above handles it after auth state updates
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid email or password.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-40 h-40 border border-primary-foreground/30 rounded-full" />
          <div className="absolute bottom-32 right-16 w-64 h-64 border border-primary-foreground/20 rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-24 h-24 border border-primary-foreground/25 rounded-full" />
        </div>
        <div className="relative z-10 max-w-md text-primary-foreground">
          <div className="w-14 h-14 rounded-xl bg-primary-foreground/15 flex items-center justify-center mb-8">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold mb-4">University Student Information Management System</h2>
          <p className="text-primary-foreground/70 text-sm leading-relaxed">
            A secure, centralized platform for managing academic records, student data, and institutional workflows.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[
              { num: "2,400+", label: "Students" },
              { num: "180+", label: "Courses" },
              { num: "12", label: "Departments" },
            ].map((s) => (
              <div key={s.label} className="bg-primary-foreground/10 rounded-lg p-3">
                <p className="text-lg font-bold">{s.num}</p>
                <p className="text-[11px] text-primary-foreground/60">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">UniSIMS</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1">Sign in</h1>
          <p className="text-sm text-muted-foreground mb-6">Enter your credentials to access the portal</p>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-md mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
