import Editor from "@monaco-editor/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Upload, Loader2, FileCode2, ShieldAlert, Lightbulb, Wrench, BookOpen,
  CheckCircle2, Plus, X, FolderOpen, FileText, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { analyzeCode, sampleCode, type AnalysisResult, type Severity } from "@/lib/mock-analysis";
import { recordScan } from "@/lib/scan-history";
import { toast } from "sonner";
import axios from "axios";
import { getToken } from "@/lib/auth";

async function runCodeAnalysisAPI(code: string, fileName: string, language: string): Promise<AnalysisResult> {
  try {
    const token = getToken();
    const response = await axios.post("/api/scans/analyze", {
      code,
      fileName,
      language,
      saveToHistory: !!token,
    }, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    });
    return response.data.result;
  } catch (error: any) {
    console.warn("API analysis failed, falling back to client-side heuristics:", error.message);
    const result = analyzeCode(code, language);
    // Write locally to make sure it appears in localStorage history if the server is offline
    recordScan({ fileName, language, result });
    return result;
  }
}

const sevColor: Record<Severity, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-[oklch(0.78_0.16_75)]/15 text-[oklch(0.85_0.18_75)] border-[oklch(0.78_0.16_75)]/30",
  medium: "bg-primary/15 text-primary border-primary/30",
  low: "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30",
};

type FileEntry = {
  id: string;
  name: string;
  language: string;
  code: string;
  result: AnalysisResult | null;
  analyzing: boolean;
};

const LANG_MAP: Record<string, string> = {
  ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
  py: "python", go: "go", rs: "rust", java: "java", cs: "csharp",
  cpp: "cpp", c: "c", h: "cpp", rb: "ruby", php: "php", swift: "swift",
  kt: "kotlin", json: "json", css: "css", html: "html", md: "markdown",
};
const detectLang = (name: string) => LANG_MAP[name.split(".").pop()?.toLowerCase() ?? ""] ?? "plaintext";
const uid = () => Math.random().toString(36).slice(2, 10);
const WORKSPACE_QUEUE_KEY = "codeguard.workspace.queue";

function consumeQueue(): FileEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WORKSPACE_QUEUE_KEY);
    if (!raw) return [];
    localStorage.removeItem(WORKSPACE_QUEUE_KEY);
    const items: { name: string; code: string }[] = JSON.parse(raw);
    return items.map((i) => ({
      id: uid(), name: i.name, language: detectLang(i.name), code: i.code, result: null, analyzing: false,
    }));
  } catch { return []; }
}

export default function Workspace() {
  const [files, setFiles] = useState<FileEntry[]>(() => {
    const queued = consumeQueue();
    if (queued.length > 0) return queued;
    return [{ id: uid(), name: "scratch.tsx", language: "typescript", code: sampleCode, result: null, analyzing: false }];
  });
  const [activeId, setActiveId] = useState(files[0].id);
  const [query, setQuery] = useState("");
  const [batchRunning, setBatchRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-analyze any files that arrive without results (e.g. from GitHub queue)
  useEffect(() => {
    files.forEach(async (f) => {
      if (!f.result && !f.analyzing && f.code.trim().length > 0 && f.name !== "scratch.tsx") {
        setFiles((prev) => prev.map((x) => (x.id === f.id ? { ...x, analyzing: true } : x)));
        const result = await runCodeAnalysisAPI(f.code, f.name, f.language);
        setFiles((prev) => prev.map((x) => (x.id === f.id ? { ...x, analyzing: false, result } : x)));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = files.find((f) => f.id === activeId) ?? files[0];

  const update = (id: string, patch: Partial<FileEntry>) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const runOne = async (id: string) => {
    const f = files.find((x) => x.id === id);
    if (!f) return;
    update(id, { analyzing: true, result: null });
    const result = await runCodeAnalysisAPI(f.code, f.name, f.language);
    update(id, { analyzing: false, result });
  };

  const runAll = async () => {
    setBatchRunning(true);
    setFiles((prev) => prev.map((f) => ({ ...f, analyzing: true, result: null })));
    for (const f of files) {
      await new Promise((r) => setTimeout(r, 400));
      const result = analyzeCode(f.code, f.language);
      recordScan({ fileName: f.name, language: f.language, result });
      setFiles((prev) => prev.map((x) => (x.id === f.id ? { ...x, analyzing: false, result } : x)));
    }
    setBatchRunning(false);
    toast.success(`Analyzed ${files.length} file${files.length > 1 ? "s" : ""}`);
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;

    const TEXT_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|cs|cpp|cc|c|h|hpp|rb|php|swift|kt|kts|json|css|scss|html|htm|md|txt|yml|yaml|toml|xml|sh|sql|vue|svelte)$/i;
    const collected: FileEntry[] = [];

    for (const f of Array.from(list)) {
      if (/\.zip$/i.test(f.name)) {
        try {
          const JSZip = (await import("jszip")).default;
          const zip = await JSZip.loadAsync(f);
          const entries = Object.values(zip.files).filter((z) => !z.dir && TEXT_EXT.test(z.name));
          toast.info(`Found ${entries.length} code file${entries.length !== 1 ? "s" : ""} in ${f.name}`);
          for (const z of entries.slice(0, 40)) {
            const code = await z.async("string");
            collected.push({
              id: uid(), name: z.name.split("/").pop() || z.name,
              language: detectLang(z.name), code, result: null, analyzing: false,
            });
          }
        } catch (err) {
          toast.error(`Failed to read ${f.name}`);
        }
      } else {
        const code = await f.text();
        collected.push({
          id: uid(), name: f.name, language: detectLang(f.name),
          code, result: null, analyzing: false,
        });
      }
    }

    if (collected.length === 0) {
      toast.error("No readable code files found");
      e.target.value = "";
      return;
    }

    setFiles((prev) => [...prev, ...collected]);
    setActiveId(collected[0].id);
    toast.success(`Loaded ${collected.length} file${collected.length > 1 ? "s" : ""} — analyzing…`);
    for (const entry of collected) {
      await new Promise((r) => setTimeout(r, 250));
      const result = analyzeCode(entry.code, entry.language);
      recordScan({ fileName: entry.name, language: entry.language, result });
      setFiles((prev) => prev.map((x) => (x.id === entry.id ? { ...x, result } : x)));
    }
    e.target.value = "";
  };

  const addBlank = () => {
    const f: FileEntry = { id: uid(), name: `untitled-${files.length + 1}.ts`, language: "typescript", code: "", result: null, analyzing: false };
    setFiles((prev) => [...prev, f]);
    setActiveId(f.id);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (next.length === 0) {
        const fresh: FileEntry = { id: uid(), name: "scratch.tsx", language: "typescript", code: sampleCode, result: null, analyzing: false };
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  };

  const filtered = useMemo(
    () => files.filter((f) => f.name.toLowerCase().includes(query.toLowerCase())),
    [files, query],
  );

  const totalIssues = files.reduce((sum, f) => sum + (f.result?.bugsFound ?? 0), 0);
  const totalCritical = files.reduce((sum, f) => sum + (f.result?.critical ?? 0), 0);

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Code Review Workspace</h1>
          <p className="text-sm text-muted-foreground">
            Upload one or many files — CodeGuard analyzes each, flags bugs, and explains the fix.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileInputRef} type="file" hidden multiple accept=".zip,.ts,.tsx,.js,.jsx,.py,.go,.rs,.java,.cs,.cpp,.c,.rb,.php,.swift,.kt,.json,.css,.html,.md,.txt,.yml,.yaml,.sql,.sh,.vue,.svelte" onChange={onUpload} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="glass">
            <Upload className="mr-2 h-4 w-4" /> Upload files / ZIP
          </Button>
          <Button variant="outline" onClick={addBlank} className="glass">
            <Plus className="mr-2 h-4 w-4" /> New file
          </Button>
          <Button onClick={runAll} disabled={batchRunning} className="bg-[var(--gradient-primary)] text-primary-foreground glow">
            {batchRunning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing all</> : <><Play className="mr-2 h-4 w-4" /> Analyze all</>}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Files panel */}
        <aside className="glass rounded-2xl p-3 lg:col-span-3">
          <div className="flex items-center justify-between px-1 pb-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FolderOpen className="h-4 w-4 text-primary" /> Files
              <Badge variant="outline" className="ml-1 border-primary/30 text-primary">{files.length}</Badge>
            </div>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search files…" className="h-8 pl-8 text-xs bg-secondary/40" />
          </div>
          <div className="space-y-1 max-h-[640px] overflow-y-auto pr-1">
            {filtered.map((f) => {
              const isActive = f.id === activeId;
              const issues = f.result?.bugsFound ?? 0;
              const crit = f.result?.critical ?? 0;
              return (
                <div
                  key={f.id}
                  onClick={() => setActiveId(f.id)}
                  className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm transition ${
                    isActive ? "bg-primary/15 text-foreground ring-1 ring-primary/30" : "hover:bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate font-mono text-xs">{f.name}</span>
                  {f.analyzing ? (
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  ) : f.result ? (
                    crit > 0 ? (
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-destructive/40 text-destructive">{crit}!</Badge>
                    ) : issues > 0 ? (
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-[var(--warning)]/40 text-[var(--warning)]">{issues}</Badge>
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />
                    )
                  ) : null}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                    className="opacity-0 transition group-hover:opacity-100"
                    aria-label="Remove file"
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">No matching files.</div>
            )}
          </div>

          <div className="mt-3 space-y-1 rounded-lg border border-border/60 bg-secondary/30 p-2 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Total issues</span><span className="font-semibold">{totalIssues}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Critical</span><span className="font-semibold text-destructive">{totalCritical}</span></div>
          </div>
        </aside>

        {/* Editor */}
        <div className="glass overflow-hidden rounded-2xl lg:col-span-6">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileCode2 className="h-4 w-4" />
              <span className="font-mono">{active.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Select value={active.language} onValueChange={(v) => update(active.id, { language: v })}>
                <SelectTrigger className="h-8 w-32 text-xs bg-secondary/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["typescript","javascript","python","go","rust","java","csharp","cpp","ruby","php","html","css","json","markdown","plaintext"].map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => runOne(active.id)} disabled={active.analyzing} className="h-8 bg-[var(--gradient-primary)] text-primary-foreground">
                {active.analyzing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
                Analyze
              </Button>
            </div>
          </div>
          <Editor
            height="640px"
            language={active.language}
            value={active.code}
            onChange={(v) => update(active.id, { code: v || "", result: null })}
            theme="vs-dark"
            options={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 12, bottom: 12 },
              smoothScrolling: true,
            }}
          />
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          <ResultsPanel file={active} />
        </div>
      </div>
    </div>
  );
}

function ResultsPanel({ file }: { file: FileEntry }) {
  if (file.analyzing) {
    return (
      <div className="glass grid h-[400px] place-items-center rounded-2xl text-center">
        <div>
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
          <div className="font-medium">Analyzing {file.name}</div>
          <div className="text-xs text-muted-foreground">Parsing · scoring risk · generating fixes</div>
        </div>
      </div>
    );
  }
  if (!file.result) {
    return (
      <div className="glass grid h-[400px] place-items-center rounded-2xl p-8 text-center">
        <div>
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <div className="font-medium">No analysis yet</div>
          <div className="text-xs text-muted-foreground">Click "Analyze" to scan this file.</div>
        </div>
      </div>
    );
  }
  const r = file.result;
  const catColor: Record<string, string> = {
    security: "border-destructive/40 text-destructive",
    bug: "border-[oklch(0.78_0.16_75)]/40 text-[oklch(0.85_0.18_75)]",
    performance: "border-[var(--cyan)]/40 text-[var(--cyan)]",
    maintainability: "border-primary/40 text-primary",
    style: "border-muted-foreground/40 text-muted-foreground",
    accessibility: "border-[var(--success)]/40 text-[var(--success)]",
  };
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <ScoreTile label="Risk" value={r.riskScore} accent="oklch(0.65 0.22 25)" />
          <ScoreTile label="Quality" value={r.qualityScore} accent="oklch(0.72 0.17 155)" />
          <ScoreTile label="Bug %" value={r.bugProbability} accent="oklch(0.72 0.18 230)" suffix="%" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ScoreTile label="Maintain." value={r.maintainabilityIndex} accent="oklch(0.72 0.15 280)" />
          <ScoreTile label="Complexity" value={Math.min(100, r.complexity * 4)} accent="oklch(0.7 0.18 50)" />
          <ScoreTile label="Dup %" value={r.duplication} accent="oklch(0.7 0.14 340)" suffix="%" />
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-semibold">{r.bugsFound}</span>
              <span className="text-muted-foreground"> issues · </span>
              <span className="font-semibold text-destructive">{r.critical}</span>
              <span className="text-muted-foreground"> critical · {r.linesOfCode} LOC</span>
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Done
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{r.summary}</p>
          {r.categoryBreakdown.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {r.categoryBreakdown.map((c) => (
                <Badge key={c.name} variant="outline" className={`text-[10px] ${catColor[c.name] ?? ""}`}>
                  {c.name} · {c.value}
                </Badge>
              ))}
            </div>
          )}
        </div>
        {r.recommendations.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="h-4 w-4 text-[var(--cyan)]" /> AI recommendations
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {r.recommendations.map((rec, i) => (
                <li key={i} className="flex gap-2"><span className="text-primary">›</span>{rec}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
          {r.issues.length === 0 && (
            <div className="glass rounded-2xl p-6 text-center text-sm">
              <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-[var(--success)]" />
              No issues found — your code looks clean.
            </div>
          )}
          {r.issues.map((iss, i) => (
            <motion.div
              key={iss.id}
              initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="glass rounded-2xl p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={sevColor[iss.severity]}>{iss.severity}</Badge>
                <Badge variant="outline" className={`text-[10px] ${catColor[iss.category] ?? ""}`}>{iss.category}</Badge>
                {iss.cwe && <Badge variant="outline" className="text-[10px] border-muted-foreground/40 text-muted-foreground">{iss.cwe}</Badge>}
                <span className="ml-auto text-xs text-muted-foreground font-mono">Line {iss.line}</span>
              </div>
              <h4 className="mt-1.5 font-semibold text-sm">{iss.title}</h4>
              {iss.snippet && (
                <pre className="mt-2 overflow-x-auto rounded-md bg-secondary/60 p-2 text-[11px] font-mono text-foreground/90 border-l-2 border-destructive/60"><code>{iss.snippet}</code></pre>
              )}
              {iss.suggestedFix && iss.suggestedFix !== iss.snippet && (
                <pre className="mt-1 overflow-x-auto rounded-md bg-[var(--success)]/10 p-2 text-[11px] font-mono text-foreground/90 border-l-2 border-[var(--success)]/60"><code>{iss.suggestedFix}</code></pre>
              )}
              <div className="mt-3 space-y-2 text-xs">
                <ExplainRow icon={ShieldAlert} label="What" text={iss.what} />
                <ExplainRow icon={Lightbulb} label="Why" text={iss.why} />
                <ExplainRow icon={Wrench} label="Fix" text={iss.fix} />
                <ExplainRow icon={BookOpen} label="Best practice" text={iss.bestPractice} />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ScoreTile({ label, value, accent, suffix = "" }: { label: string; value: number; accent: string; suffix?: string }) {
  return (
    <div className="glass rounded-2xl p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold" style={{ color: accent }}>{value}{suffix}</div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary/60">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: accent }} />
      </div>
    </div>
  );
}

function ExplainRow({ icon: Icon, label, text }: { icon: React.ComponentType<{ className?: string }>; label: string; text: string }) {
  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--cyan)]" />
      <div><span className="font-semibold text-foreground">{label}:</span> <span className="text-muted-foreground">{text}</span></div>
    </div>
  );
}
