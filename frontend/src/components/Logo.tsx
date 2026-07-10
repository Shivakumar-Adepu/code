import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const px = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <span className="relative grid h-9 w-9 place-items-center rounded-lg bg-[var(--gradient-primary)] glow">
        <ShieldCheck className="h-5 w-5 text-primary-foreground" />
        <span className="absolute inset-0 rounded-lg pulse-ring" />
      </span>
      <span className={`${px} font-semibold tracking-tight`}>
        Code<span className="gradient-text">Guard</span> AI
      </span>
    </Link>
  );
}
