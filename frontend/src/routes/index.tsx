import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck, Zap, Github, Brain, Activity, GitPullRequest,
  CheckCircle2, ArrowRight, Sparkles, Code2, Cpu, LineChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";

const features = [
  { icon: Brain, title: "Predictive Bug Detection", desc: "ML-driven probability scores predict failure areas before deployment." },
  { icon: Sparkles, title: "AI Explanation Mode", desc: "What's wrong, why it happened, how to fix it — explained like a senior engineer." },
  { icon: Github, title: "GitHub Integration", desc: "Review pull requests, commits and repo health automatically." },
  { icon: Activity, title: "Real-Time Analysis", desc: "Live indicators as you type in the Monaco-powered workspace." },
  { icon: ShieldCheck, title: "Security Scanning", desc: "Detect injection, unsafe patterns, and risky dependencies." },
  { icon: LineChart, title: "Quality Metrics", desc: "Risk score, severity distribution, and trend analytics." },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-24 pt-20">
        <div className="absolute inset-0 bg-grid -z-10" />
        <div className="mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse" />
            <span className="text-muted-foreground">v1.0 — Now with predictive bug forecasting</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="text-balance text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl"
          >
            AI-Powered <span className="gradient-text">Real-Time Code Review</span><br />
            & Predictive Bug Detection
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
          >
            CodeGuard AI scans every line, predicts future failures, and explains every issue —
            so your team ships clean code with confidence.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Button asChild size="lg" className="bg-[var(--gradient-primary)] text-primary-foreground glow hover:opacity-90">
              <Link to="/register">Start free analysis <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="glass">
              <Link to="/workspace">Try the workspace</Link>
            </Button>
          </motion.div>

          {/* Mock terminal preview */}
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="mx-auto mt-16 max-w-4xl"
          >
            <div className="glass rounded-2xl p-2 shadow-[var(--shadow-elegant)]">
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="h-3 w-3 rounded-full bg-destructive/70" />
                <span className="h-3 w-3 rounded-full bg-[var(--warning)]/80" />
                <span className="h-3 w-3 rounded-full bg-[var(--success)]/80" />
                <span className="ml-3 text-xs text-muted-foreground font-mono">codeguard ~ analysis.tsx</span>
              </div>
              <pre className="overflow-hidden rounded-xl bg-background/80 p-5 text-left text-sm leading-relaxed font-mono">
<span className="text-muted-foreground">$ codeguard analyze ./src</span>{"\n"}
<span className="text-[var(--cyan)]">→ parsing AST...</span>{"\n"}
<span className="text-[var(--cyan)]">→ running predictive model (gpt-shield-v3)...</span>{"\n"}
<span className="text-[var(--warning)]">⚠  3 high-risk patterns detected</span>{"\n"}
<span className="text-destructive">✕  1 critical: possible null dereference at UserCard.tsx:14</span>{"\n"}
<span className="text-[var(--success)]">✓  Risk score: 42/100  · Quality: 78/100</span>{"\n"}
<span className="text-muted-foreground">  view report → /dashboard</span>
              </pre>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-semibold tracking-tight">Built for modern engineering teams</h2>
          <p className="mt-3 text-muted-foreground">Every feature designed to remove friction from code review.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-6 transition hover:-translate-y-1 hover:glow"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--gradient-primary)] text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-semibold tracking-tight">How it works</h2>
          <p className="mt-3 text-muted-foreground">From code to insight in seconds.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-4">
          {[
            { icon: Code2, t: "Write or paste code", d: "Use the Monaco editor or upload files." },
            { icon: Cpu, t: "AI engine parses it", d: "Static + ML hybrid analysis." },
            { icon: GitPullRequest, t: "Predict & explain", d: "Bug probability with human-readable fixes." },
            { icon: CheckCircle2, t: "Ship with confidence", d: "Export reports or sync to GitHub PRs." },
          ].map((s, i) => (
            <div key={s.t} className="relative glass rounded-2xl p-6">
              <span className="absolute -top-3 right-4 rounded-full bg-[var(--gradient-primary)] px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                Step {i + 1}
              </span>
              <s.icon className="mb-4 h-6 w-6 text-[var(--cyan)]" />
              <h3 className="text-base font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stack */}
      <section id="stack" className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-muted-foreground">
          Powered by a battle-tested stack
        </h2>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
          {["React", "TypeScript", "Node.js", "Express", "Python", "FastAPI", "Monaco", "GitHub API", "TanStack"].map((t) => (
            <span key={t} className="glass rounded-full px-4 py-1.5 font-mono text-xs text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { q: "CodeGuard caught a null bug in seconds. Saved our launch.", a: "Maya R.", r: "Staff Engineer, Loop" },
            { q: "The explanations feel like pairing with a senior dev.", a: "Daniel K.", r: "CTO, Northwind" },
            { q: "Our PR review time dropped by 60%. Game changer.", a: "Priya S.", r: "Engineering Manager, Lyra" },
          ].map((t) => (
            <div key={t.a} className="glass rounded-2xl p-6">
              <Zap className="mb-3 h-5 w-5 text-[var(--cyan)]" />
              <p className="text-sm leading-relaxed">"{t.q}"</p>
              <div className="mt-4 text-xs text-muted-foreground">
                <strong className="text-foreground">{t.a}</strong> · {t.r}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 pb-24">
        <div className="glass rounded-3xl p-10 text-center glow">
          <h3 className="text-3xl font-semibold tracking-tight">Stop chasing bugs. Predict them.</h3>
          <p className="mt-3 text-muted-foreground">Start free. No credit card required.</p>
          <Button asChild size="lg" className="mt-6 bg-[var(--gradient-primary)] text-primary-foreground glow">
            <Link to="/register">Create your account <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/50 px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-muted-foreground md:flex-row">
          <span>© 2026 CodeGuard AI · All rights reserved.</span>
          <div className="flex gap-5">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
