import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="glass mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-2xl px-5 py-3">
        <Logo />
        <nav className="hidden gap-7 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground transition">Features</a>
          <a href="#how" className="hover:text-foreground transition">How it works</a>
          <a href="#stack" className="hover:text-foreground transition">Stack</a>
          <a href="#testimonials" className="hover:text-foreground transition">Loved by</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/login">Sign in</Link></Button>
          <Button asChild size="sm" className="bg-[var(--gradient-primary)] text-primary-foreground glow hover:opacity-90">
            <Link to="/register">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
