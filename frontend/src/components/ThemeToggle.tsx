import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "codeguard.theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && (localStorage.getItem(KEY) as "dark" | "light" | null)) || "dark";
    apply(saved);
    setTheme(saved);
  }, []);

  function apply(t: "dark" | "light") {
    const root = document.documentElement;
    if (t === "light") root.classList.add("light");
    else root.classList.remove("light");
  }

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    apply(next);
    try { localStorage.setItem(KEY, next); } catch {}
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme" className="rounded-full">
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
