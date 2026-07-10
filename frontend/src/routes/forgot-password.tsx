import { Link } from "react-router-dom";
import { AuthCard } from "@/components/AuthCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ForgotPassword() {
  return (
    <AuthCard
      title="Reset your password"
      subtitle="We'll send a reset link to your inbox."
      footer={<><Link to="/login" className="text-primary hover:underline">Back to sign in</Link></>}
    >
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div><Label>Email</Label><Input type="email" placeholder="you@company.dev" required className="mt-1.5" /></div>
        <Button type="submit" className="w-full bg-[var(--gradient-primary)] text-primary-foreground glow">Send reset link</Button>
      </form>
    </AuthCard>
  );
}
