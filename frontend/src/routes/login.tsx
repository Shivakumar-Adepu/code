import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { AuthCard } from "@/components/AuthCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { signIn } from "@/lib/auth";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
      setError("Enter a valid email and a password of at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("/api/auth/login", { email, password });
      const { token, user } = response.data;
      signIn(token, user);
      nav("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid credentials or server connection failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to continue your code review."
      footer={<>New here? <Link to="/register" className="text-primary hover:underline">Create an account</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label>Email</Label>
          <Input type="email" placeholder="you@company.dev" required className="mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label>Password</Label>
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary">Forgot?</Link>
          </div>
          <Input type="password" placeholder="••••••••" required className="mt-1.5" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" className="w-full bg-[var(--gradient-primary)] text-primary-foreground glow" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />OR<span className="h-px flex-1 bg-border" /></div>
        <Button 
          type="button" 
          variant="outline" 
          className="w-full glass" 
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              // Mock register/login via credentials for Github SSO simulation
              const githubMail = `github-${Math.random().toString(36).slice(2, 6)}@user.dev`;
              const response = await axios.post("/api/auth/register", {
                name: "GitHub User",
                email: githubMail,
                password: "github_mock_password_123"
              });
              const { token, user } = response.data;
              signIn(token, user);
              nav("/dashboard");
            } catch (err) {
              // Fallback directly to simulated sign in if server is offline
              signIn("mock_token", { name: "GitHub User", email: "github@user.dev", plan: "Pro plan" });
              nav("/dashboard");
            } finally {
              setLoading(false);
            }
          }}
        >
          <Github className="mr-2 h-4 w-4" /> Continue with GitHub
        </Button>
      </form>
    </AuthCard>
  );
}
