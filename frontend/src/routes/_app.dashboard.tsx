import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bug, ShieldAlert, Activity, GitPullRequest, ArrowUpRight, Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from "recharts";
import { Button } from "@/components/ui/button";

const trend = Array.from({ length: 12 }).map((_, i) => ({
  d: `W${i + 1}`, bugs: Math.round(5 + Math.sin(i) * 4 + i * 0.6), risk: 30 + ((i * 11) % 50),
}));
const severity = [
  { name: "Critical", value: 4, color: "oklch(0.65 0.22 25)" },
  { name: "High", value: 9, color: "oklch(0.78 0.16 75)" },
  { name: "Medium", value: 16, color: "oklch(0.72 0.18 230)" },
  { name: "Low", value: 22, color: "oklch(0.72 0.17 155)" },
];

const stats = [
  { label: "Total bugs found", value: "1,284", delta: "+12%", icon: Bug, accent: "from-[oklch(0.65_0.22_25)] to-[oklch(0.78_0.16_75)]" },
  { label: "Critical issues", value: "37", delta: "-8%", icon: ShieldAlert, accent: "from-[oklch(0.78_0.16_75)] to-[oklch(0.72_0.18_230)]" },
  { label: "Risk score", value: "42 / 100", delta: "-4 pts", icon: Activity, accent: "from-[oklch(0.72_0.18_230)] to-[oklch(0.82_0.15_200)]" },
  { label: "PRs reviewed", value: "218", delta: "+22%", icon: GitPullRequest, accent: "from-[oklch(0.82_0.15_200)] to-[oklch(0.72_0.17_155)]" },
];

const recent = [
  { repo: "acme/payments", lang: "TypeScript", risk: 72, time: "12m ago" },
  { repo: "acme/web", lang: "TSX", risk: 38, time: "1h ago" },
  { repo: "acme/edge-fn", lang: "Python", risk: 54, time: "3h ago" },
  { repo: "acme/auth-svc", lang: "Go", risk: 18, time: "Yesterday" },
];

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Welcome back, Ada</h1>
          <p className="text-sm text-muted-foreground">Here's your code health snapshot for this week.</p>
        </div>
        <Button asChild className="bg-[var(--gradient-primary)] text-primary-foreground glow">
          <Link to="/workspace"><Sparkles className="mr-2 h-4 w-4" /> Run new analysis</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass relative overflow-hidden rounded-2xl p-5"
          >
            <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${s.accent} opacity-25 blur-2xl`} />
            <div className="flex items-start justify-between">
              <s.icon className="h-5 w-5 text-muted-foreground" />
              <span className="rounded-md bg-secondary/60 px-2 py-0.5 text-xs text-muted-foreground">{s.delta}</span>
            </div>
            <div className="mt-4 text-2xl font-semibold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Bug analytics</h3>
            <span className="text-xs text-muted-foreground">Last 12 weeks</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.72 0.18 230)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.72 0.18 230)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.82 0.15 200)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="oklch(0.82 0.15 200)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="d" stroke="oklch(0.6 0.03 245)" fontSize={11} />
              <YAxis stroke="oklch(0.6 0.03 245)" fontSize={11} />
              <Tooltip contentStyle={{ background: "oklch(0.21 0.035 252)", border: "1px solid oklch(0.3 0.04 252)", borderRadius: 12 }} />
              <Area type="monotone" dataKey="bugs" stroke="oklch(0.72 0.18 230)" fill="url(#g1)" strokeWidth={2} />
              <Area type="monotone" dataKey="risk" stroke="oklch(0.82 0.15 200)" fill="url(#g2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 font-semibold">Risk score</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadialBarChart innerRadius={70} outerRadius={100} barSize={14} data={[{ name: "risk", value: 42, fill: "oklch(0.72 0.18 230)" }]} startAngle={210} endAngle={-30}>
              <RadialBar background={{ fill: "oklch(0.26 0.04 252)" }} dataKey="value" cornerRadius={8} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="-mt-32 text-center">
            <div className="text-4xl font-semibold gradient-text">42</div>
            <div className="text-xs text-muted-foreground">moderate</div>
          </div>
          <div className="mt-24 text-center text-xs text-muted-foreground">
            Down 4 points from last week
          </div>
        </div>
      </div>

      {/* Lower row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Recent analyses</h3>
            <Link to="/reports" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center">
              View all <ArrowUpRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border/50">
            {recent.map((r) => (
              <div key={r.repo} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-mono text-sm">{r.repo}</div>
                  <div className="text-xs text-muted-foreground">{r.lang} · {r.time}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-[var(--gradient-primary)]" style={{ width: `${r.risk}%` }} />
                  </div>
                  <span className="w-10 text-right text-sm font-medium">{r.risk}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 font-semibold">Severity distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={severity} dataKey="value" innerRadius={48} outerRadius={78} paddingAngle={3}>
                {severity.map((s) => <Cell key={s.name} fill={s.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "oklch(0.21 0.035 252)", border: "1px solid oklch(0.3 0.04 252)", borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5 text-xs">
            {severity.map((s) => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} /> {s.name}</div>
                <span className="text-muted-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
