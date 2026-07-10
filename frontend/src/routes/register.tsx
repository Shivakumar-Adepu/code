import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import { AuthCard } from "@/components/AuthCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth";

export default function Register() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
      setError("Provide your name, a valid email and a password of at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("/api/auth/register", {
        name: name.trim(),
        email,
        password,
      });
      const { token, user } = response.data;
      signIn(token, user);
      nav("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed. Server error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start analyzing your codebase in seconds."
      footer={<>Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label>Full name</Label>
          <Input placeholder="Ada Lovelace" required className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
        </div>
        <div>
          <Label>Work email</Label>
          <Input type="email" placeholder="ada@company.dev" required className="mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
        </div>
        <div>
          <Label>Password</Label>
          <Input type="password" placeholder="••••••••" required className="mt-1.5" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" className="w-full bg-[var(--gradient-primary)] text-primary-foreground glow" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
