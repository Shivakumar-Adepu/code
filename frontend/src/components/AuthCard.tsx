import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import type { ReactNode } from "react";

export function AuthCard({
  title, subtitle, children, footer,
}: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-grid -z-10" />
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
        <div className="mb-8"><Logo size="lg" /></div>
        <div className="glass w-full rounded-2xl p-8 shadow-[var(--shadow-elegant)]">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6 space-y-4">{children}</div>
          {footer && <div className="mt-6 border-t border-border/50 pt-4 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
        <Link to="/" className="mt-6 text-xs text-muted-foreground hover:text-foreground">← Back to home</Link>
      </div>
    </div>
  );
}
