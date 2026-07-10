import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  History, Trash2, GitCompare, ArrowDown, ArrowUp, Minus, FileCode2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  getHistory, clearHistory, deleteScan, diffScans, type ScanRecord,
} from "@/lib/scan-history";

function fmt(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function ScansPage() {
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const refresh = async () => {
      const history = await getHistory();
      setRecords(history);
    };
    refresh();
    window.addEventListener("codeguard:scan-history", refresh);
    return () => {
      window.removeEventListener("codeguard:scan-history", refresh);
    };
  }, []);

  const filtered = useMemo(
    () => records.filter((r) => r.fileName.toLowerCase().includes(query.toLowerCase())),
    [records, query],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= 2) {
          // drop the oldest selection
          const first = next.values().next().value;
          if (first) next.delete(first);
        }
        next.add(id);
      }
      return next;
    });
  };

  const selectedRecords = Array.from(selected)
    .map((id) => records.find((r) => r.id === id))
    .filter((r): r is ScanRecord => Boolean(r))
    .sort((a, b) => a.timestamp - b.timestamp);

  const diff = selectedRecords.length === 2 ? diffScans(selectedRecords[0], selectedRecords[1]) : null;

  const stats = useMemo(() => {
    if (records.length === 0) return null;
    const totalBugs = records.reduce((s, r) => s + r.bugsFound, 0);
    const totalCritical = records.reduce((s, r) => s + r.critical, 0);
    const avgRisk = Math.round(records.reduce((s, r) => s + r.riskScore, 0) / records.length);
    return { totalBugs, totalCritical, avgRisk };
  }, [records]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Scan History</h1>
          <p className="text-sm text-muted-foreground">
            Review previous analyses and select any two to compare how findings changed.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Filter by filename…"
            value={query} onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-56 bg-secondary/50"
          />
          <Button
            variant="outline" size="sm"
            disabled={records.length === 0}
            onClick={async () => {
              await clearHistory();
              setSelected(new Set());
              setRecords([]);
              toast.success("Scan history cleared");
            }}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear all
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="glass rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">Total scans</div>
            <div className="mt-1 text-2xl font-semibold">{records.length}</div>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">Bugs found</div>
            <div className="mt-1 text-2xl font-semibold">{stats.totalBugs}</div>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">Critical</div>
            <div className="mt-1 text-2xl font-semibold text-destructive">{stats.totalCritical}</div>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">Avg risk score</div>
            <div className="mt-1 text-2xl font-semibold gradient-text">{stats.avgRisk}</div>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-3 rounded-2xl p-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-foreground/5 ring-1 ring-border">
            <History className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold">No scans recorded yet</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Run an analysis in the Code Review workspace and it will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
          <div className="glass overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3 text-xs">
              <div className="font-medium uppercase tracking-wide text-muted-foreground">
                {filtered.length} scan{filtered.length !== 1 ? "s" : ""}
              </div>
              <div className="text-muted-foreground">
                Pick up to 2 to compare · {selected.size}/2 selected
              </div>
            </div>
            <div className="divide-y divide-border/40 max-h-[640px] overflow-auto">
              {filtered.map((r) => {
                const isSel = selected.has(r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => toggle(r.id)}
                    className={`flex w-full items-center gap-4 px-5 py-3 text-left transition hover:bg-secondary/40 ${isSel ? "bg-primary/10" : ""}`}
                  >
                    <div className={`grid h-9 w-9 place-items-center rounded-lg ring-1 ${isSel ? "bg-primary/15 ring-primary/40 text-primary" : "bg-foreground/5 ring-border"}`}>
                      <FileCode2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-mono text-sm">{r.fileName}</span>
                        <Badge variant="outline" className="text-[10px]">{r.language}</Badge>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{fmt(r.timestamp)}</div>
                    </div>
                    <div className="hidden gap-2 sm:flex">
                      {r.critical > 0 && <Badge variant="outline" className="border-destructive/40 text-destructive">{r.critical} crit</Badge>}
                      <Badge variant="outline">{r.bugsFound} bugs</Badge>
                      <Badge variant="outline">risk {r.riskScore}</Badge>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await deleteScan(r.id);
                        setSelected((p) => {
                          const n = new Set(p);
                          n.delete(r.id);
                          return n;
                        });
                        toast.success("Scan record deleted");
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      aria-label="Delete scan"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </button>
                );
              })}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-5"
          >
            <div className="mb-4 flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Compare scans</h3>
            </div>

            {selectedRecords.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Select a scan from the list to view its details. Pick a second one to see the delta.
              </p>
            )}

            {selectedRecords.length === 1 && (
              <div className="space-y-3">
                <div>
                  <div className="font-mono text-sm">{selectedRecords[0].fileName}</div>
                  <div className="text-xs text-muted-foreground">{fmt(selectedRecords[0].timestamp)}</div>
                </div>
                <p className="text-sm text-muted-foreground">{selectedRecords[0].summary}</p>
                <p className="text-xs text-muted-foreground">Pick one more scan to compare.</p>
              </div>
            )}

            {selectedRecords.length === 2 && diff && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {selectedRecords.map((r, i) => (
                    <div key={r.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {i === 0 ? "Before" : "After"}
                      </div>
                      <div className="mt-0.5 truncate font-mono">{r.fileName}</div>
                      <div className="text-muted-foreground">{fmt(r.timestamp)}</div>
                    </div>
                  ))}
                </div>

                <div className="divide-y divide-border/40 rounded-lg border border-border/60">
                  {diff.map((d) => {
                    const improved = d.betterIsLower ? d.delta < 0 : d.delta > 0;
                    const worse = d.betterIsLower ? d.delta > 0 : d.delta < 0;
                    const Icon = d.delta === 0 ? Minus : d.delta > 0 ? ArrowUp : ArrowDown;
                    const tone = d.delta === 0
                      ? "text-muted-foreground"
                      : improved ? "text-[var(--success)]" : worse ? "text-destructive" : "text-muted-foreground";
                    return (
                      <div key={d.field} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="text-muted-foreground">{d.label}</span>
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span>{d.before}</span>
                          <span className="text-muted-foreground">→</span>
                          <span>{d.after}</span>
                          <span className={`inline-flex items-center gap-0.5 ${tone}`}>
                            <Icon className="h-3 w-3" />
                            {d.delta > 0 ? `+${d.delta}` : d.delta}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
