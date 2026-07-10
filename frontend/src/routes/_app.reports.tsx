import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const reports = [
  { id: "RPT-2031", title: "Weekly health — acme/web", date: "Jun 3, 2026", bugs: 18, status: "Ready" },
  { id: "RPT-2030", title: "PR #482 review — billing dashboard", date: "Jun 2, 2026", bugs: 7, status: "Ready" },
  { id: "RPT-2029", title: "Security scan — acme/auth-svc", date: "May 30, 2026", bugs: 2, status: "Ready" },
  { id: "RPT-2028", title: "Predictive forecast — acme/edge-fn", date: "May 28, 2026", bugs: 11, status: "Archived" },
];

export default function Reports() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Download analysis reports as PDF or share with your team.</p>
      </div>
      <div className="glass overflow-hidden rounded-2xl">
        <div className="grid grid-cols-12 border-b border-border/60 px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <div className="col-span-1">ID</div><div className="col-span-5">Report</div>
          <div className="col-span-2">Date</div><div className="col-span-1">Bugs</div>
          <div className="col-span-1">Status</div><div className="col-span-2 text-right">Actions</div>
        </div>
        {reports.map((r) => (
          <div key={r.id} className="grid grid-cols-12 items-center border-b border-border/40 px-5 py-4 last:border-0">
            <div className="col-span-1 font-mono text-xs text-muted-foreground">{r.id}</div>
            <div className="col-span-5 flex items-center gap-2"><FileText className="h-4 w-4 text-[var(--cyan)]" /> {r.title}</div>
            <div className="col-span-2 text-sm text-muted-foreground">{r.date}</div>
            <div className="col-span-1 text-sm">{r.bugs}</div>
            <div className="col-span-1"><Badge variant="outline" className={r.status === "Ready" ? "border-[var(--success)]/40 text-[var(--success)]" : "border-border text-muted-foreground"}>{r.status}</Badge></div>
            <div className="col-span-2 text-right">
              <Button size="sm" variant="outline" className="glass"><Download className="mr-2 h-3.5 w-3.5" /> PDF</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
