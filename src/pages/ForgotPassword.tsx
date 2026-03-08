import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">UniSIMS</span>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm bg-emerald-500/10 text-emerald-600 px-3 py-2 rounded-md">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Password reset link sent to <strong>{email}</strong>
            </div>
            <p className="text-sm text-muted-foreground">
              Check your inbox and follow the link to reset your password. If you don't see it, check your spam folder.
            </p>
            <Link to="/login">
              <Button variant="outline" className="w-full gap-2 mt-2">
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-foreground mb-1">Forgot password</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Enter your email and we'll send you a link to reset your password.
            </p>

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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Send Reset Link"}
              </Button>
            </form>

            <Link
              to="/login"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-4 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Back to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
