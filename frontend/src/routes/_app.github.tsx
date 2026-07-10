import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Github, GitPullRequest, GitCommit, Star, AlertCircle, ChevronRight, Loader2, LogOut, ExternalLink, FolderGit2, FileCode2, ArrowLeft, Send, ShieldCheck, KeyRound, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Account = { username: string; token?: string; avatar?: string; name?: string };
type Repo = { id: number; name: string; full_name: string; stargazers_count: number; open_issues_count: number; language: string | null; html_url: string; pushed_at: string; score: number };
type PR = { id: number; title: string; user: { login: string }; html_url: string; repo: string; additions?: number; deletions?: number; risk: "low" | "medium" | "high" };
type Commit = { sha: string; message: string; date: string; repo: string };
type TreeNode = { path: string; type: "blob" | "tree"; sha: string; size?: number };

const STORAGE_KEY = "codeguard.github.account";
const TOKEN_KEY = "codeguard.github.token";
export const WORKSPACE_QUEUE_KEY = "codeguard.workspace.queue";

function loadAccount(): Account | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (!v) return null;
    const parsed = JSON.parse(v) as Account;
    // Token lives only in sessionStorage (cleared when the tab closes) to
    // reduce the blast radius if an XSS or extension reads persistent storage.
    const token = sessionStorage.getItem(TOKEN_KEY) || undefined;
    return { ...parsed, token };
  } catch {
    return null;
  }
}

function authHeaders(token?: string): HeadersInit {
  const h: HeadersInit = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (token) (h as Record<string, string>).Authorization = `Bearer ${token}`;
  return h;
}

function scoreRepo(r: { open_issues_count: number; stargazers_count: number; pushed_at: string }) {
  const daysSince = (Date.now() - new Date(r.pushed_at).getTime()) / 86400000;
  const freshness = Math.max(0, 40 - daysSince * 0.5);
  const popularity = Math.min(30, Math.log10(r.stargazers_count + 1) * 12);
  const stability = Math.max(0, 30 - r.open_issues_count * 1.2);
  return Math.round(Math.max(5, Math.min(100, freshness + popularity + stability)));
}

function riskFor(pr: { additions?: number; deletions?: number }): "low" | "medium" | "high" {
  const total = (pr.additions ?? 0) + (pr.deletions ?? 0);
  if (total > 500) return "high";
  if (total > 100) return "medium";
  return "low";
}

export default function GitHubPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [prs, setPrs] = useState<PR[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formUser, setFormUser] = useState("");
  const [formToken, setFormToken] = useState("");
  const [connecting, setConnecting] = useState(false);

  // Repo browser state
  const [browseRepo, setBrowseRepo] = useState<Repo | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  async function openRepoBrowser(repo: Repo) {
    setBrowseRepo(repo);
    setSelectedFiles(new Set());
    setTree([]);
    setTreeLoading(true);
    try {
      // Get default branch
      const repoRes = await fetch(`https://api.github.com/repos/${repo.full_name}`, { headers: authHeaders(account?.token) });
      const repoData = await repoRes.json();
      const branch = repoData.default_branch || "main";
      const treeRes = await fetch(`https://api.github.com/repos/${repo.full_name}/git/trees/${branch}?recursive=1`, { headers: authHeaders(account?.token) });
      if (!treeRes.ok) throw new Error(`Failed to load files (${treeRes.status})`);
      const data = await treeRes.json();
      const items: TreeNode[] = (data.tree || []).filter((n: any) => n.type === "blob" || n.type === "tree");
      setTree(items);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load repository");
    } finally {
      setTreeLoading(false);
    }
  }

  function toggleFile(path: string) {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function analyzeSelected() {
    if (!browseRepo || selectedFiles.size === 0) return;
    setSending(true);
    try {
      const repoRes = await fetch(`https://api.github.com/repos/${browseRepo.full_name}`, { headers: authHeaders(account?.token) });
      const branch = (await repoRes.json()).default_branch || "main";
      const paths = Array.from(selectedFiles).slice(0, 15);
      const queue = await Promise.all(paths.map(async (p) => {
        const url = `https://raw.githubusercontent.com/${browseRepo.full_name}/${branch}/${p}`;
        const res = await fetch(url);
        const text = res.ok ? await res.text() : `// Failed to fetch ${p}`;
        return { name: p.split("/").pop() || p, code: text };
      }));
      localStorage.setItem(WORKSPACE_QUEUE_KEY, JSON.stringify(queue));
      toast.success(`Sending ${queue.length} file${queue.length > 1 ? "s" : ""} to workspace`);
      setBrowseRepo(null);
      navigate("/workspace");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to fetch files");
    } finally {
      setSending(false);
    }
  }


  useEffect(() => {
    const a = loadAccount();
    if (a) { setAccount(a); void fetchAll(a); }
  }, []);

  async function fetchAll(a: Account) {
    setLoading(true);
    try {
      const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(a.username)}`, { headers: authHeaders(a.token) });
      if (!userRes.ok) throw new Error(userRes.status === 404 ? "GitHub user not found" : `GitHub API error (${userRes.status})`);
      const user = await userRes.json();

      // Paginate through ALL repos
      const allRaw: any[] = [];
      for (let page = 1; page <= 10; page++) {
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(a.username)}/repos?per_page=100&sort=updated&page=${page}`, { headers: authHeaders(a.token) });
        if (!res.ok) throw new Error(`Failed to load repos (${res.status})`);
        const batch: any[] = await res.json();
        allRaw.push(...batch);
        if (batch.length < 100) break;
      }
      const mapped: Repo[] = allRaw.map((r) => ({
        id: r.id, name: r.name, full_name: r.full_name,
        stargazers_count: r.stargazers_count, open_issues_count: r.open_issues_count,
        language: r.language, html_url: r.html_url, pushed_at: r.pushed_at,
        score: scoreRepo(r),
      }));
      setRepos(mapped);

      // PRs + commits from top 3 repos
      const top = mapped.slice(0, 3);
      const prLists = await Promise.all(top.map(async (r) => {
        const res = await fetch(`https://api.github.com/repos/${r.full_name}/pulls?state=open&per_page=3`, { headers: authHeaders(a.token) });
        if (!res.ok) return [];
        const items: any[] = await res.json();
        return items.map<PR>((p) => ({
          id: p.id, title: p.title, user: { login: p.user?.login ?? "unknown" },
          html_url: p.html_url, repo: r.full_name,
          additions: p.additions, deletions: p.deletions, risk: riskFor(p),
        }));
      }));
      setPrs(prLists.flat().slice(0, 6));

      const commitLists = await Promise.all(top.map(async (r) => {
        const res = await fetch(`https://api.github.com/repos/${r.full_name}/commits?per_page=3`, { headers: authHeaders(a.token) });
        if (!res.ok) return [];
        const items: any[] = await res.json();
        return items.map<Commit>((c) => ({
          sha: c.sha, message: (c.commit?.message ?? "").split("\n")[0],
          date: c.commit?.author?.date ?? "", repo: r.full_name,
        }));
      }));
      setCommits(commitLists.flat().slice(0, 6));

      setAccount({ ...a, avatar: user.avatar_url, name: user.name ?? user.login });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load GitHub data");
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!formUser.trim()) return;
    setConnecting(true);
    try {
      const probe = await fetch(`https://api.github.com/users/${encodeURIComponent(formUser.trim())}`, { headers: authHeaders(formToken.trim() || undefined) });
      if (!probe.ok) {
        toast.error(probe.status === 404 ? "GitHub user not found" : probe.status === 401 ? "Invalid token" : `GitHub error (${probe.status})`);
        return;
      }
      const u = await probe.json();
      const token = formToken.trim() || undefined;
      const a: Account = { username: u.login, token, avatar: u.avatar_url, name: u.name ?? u.login };
      // Persist non-secret profile data only; keep PAT in sessionStorage.
      const { token: _omit, ...persistable } = a;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
      if (token) sessionStorage.setItem(TOKEN_KEY, token);
      else sessionStorage.removeItem(TOKEN_KEY);
      setAccount(a);
      setDialogOpen(false);
      setFormUser(""); setFormToken("");
      toast.success(`Connected to @${a.username}`);
      void fetchAll(a);
    } catch {
      toast.error("Network error. Check your connection.");
    } finally {
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    setAccount(null); setRepos([]); setPrs([]); setCommits([]);
    toast.success("Disconnected GitHub account");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">GitHub Integration</h1>
          <p className="text-sm text-muted-foreground">Analyze repositories, pull requests, and commits.</p>
        </div>
        <div className="flex gap-2">
          {account && (
            <Button variant="outline" onClick={() => fetchAll(account)} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Refresh
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[var(--gradient-primary)] text-primary-foreground glow">
                <Github className="mr-2 h-4 w-4" /> {account ? "Connect another" : "Connect GitHub"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect a GitHub account</DialogTitle>
                <DialogDescription>
                  Enter your GitHub username. Add a Personal Access Token (optional) to access private repos and higher rate limits.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleConnect} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="gh-user">GitHub username</Label>
                  <Input id="gh-user" placeholder="octocat" value={formUser} onChange={(e) => setFormUser(e.target.value)} autoFocus required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gh-token">Personal Access Token (optional)</Label>
                  <Input id="gh-token" type="password" placeholder="ghp_..." value={formToken} onChange={(e) => setFormToken(e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    Create one at{" "}
                    <a className="underline" href="https://github.com/settings/tokens" target="_blank" rel="noreferrer">github.com/settings/tokens</a>
                    {" "}with <code>repo</code> scope. Stored locally in your browser.
                  </p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={connecting} className="bg-[var(--gradient-primary)] text-primary-foreground">
                    {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />} Connect
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!account ? (
        <div className="glass flex flex-col items-center justify-center gap-3 rounded-2xl p-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-foreground/5 ring-1 ring-border"><Github className="h-7 w-7" /></div>
          <h2 className="text-lg font-semibold">No GitHub account connected</h2>
          <p className="max-w-md text-sm text-muted-foreground">Connect your GitHub account to analyze repositories, scan pull requests for risk, and review recent commits.</p>
          <Button onClick={() => setDialogOpen(true)} className="mt-2 bg-[var(--gradient-primary)] text-primary-foreground glow">
            <Github className="mr-2 h-4 w-4" /> Connect GitHub
          </Button>
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl p-5">
            <div className="flex flex-wrap items-center gap-4">
              {account.avatar ? (
                <img src={account.avatar} alt={account.username} className="h-12 w-12 rounded-full ring-1 ring-border" />
              ) : (
                <div className="grid h-12 w-12 place-items-center rounded-full bg-foreground/5 ring-1 ring-border"><Github className="h-6 w-6" /></div>
              )}
              <div>
                <div className="font-semibold">@{account.username}</div>
                <div className="text-xs text-muted-foreground">
                  {account.name && <>{account.name} · </>}{repos.length} repositories synced
                </div>
              </div>
              <Badge variant="outline" className="ml-auto border-[var(--success)]/40 text-[var(--success)]">
                <ShieldCheck className="mr-1 h-3 w-3" /> Connected
              </Badge>
              <Button variant="outline" size="sm" onClick={handleDisconnect} className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                <ShieldOff className="mr-1.5 h-3.5 w-3.5" /> Disconnect & clear token
              </Button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  Personal Access Token
                </div>
                {account.token ? (
                  <>
                    <div className="mt-1 font-mono text-xs">
                      {account.token.slice(0, 4)}…{account.token.slice(-4)}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Stored in <code>sessionStorage</code> only — cleared automatically when this tab closes.
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    No token configured. Public API only (rate-limited, no private repos).
                  </p>
                )}
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--success)]" />
                  Profile cache
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Username and avatar persist in <code>localStorage</code> so you stay connected across tabs.
                  Disconnecting wipes both stores.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Repositories</h2>
            {loading && repos.length === 0 ? (
              <div className="glass grid place-items-center rounded-2xl p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : repos.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">No public repositories found for this account.</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {repos.map((r) => (
                  <div key={r.id} className="glass rounded-2xl p-5 transition hover:-translate-y-0.5 hover:glow">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="font-mono text-sm flex items-center gap-1.5 truncate">
                          <FolderGit2 className="h-4 w-4 text-primary shrink-0" />
                          <span className="truncate">{r.full_name}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {r.language && <span>{r.language}</span>}
                          <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" /> {r.stargazers_count}</span>
                          <span className="inline-flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {r.open_issues_count} issues</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-semibold gradient-text">{r.score}</div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Health</div>
                      </div>
                    </div>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-[var(--gradient-primary)]" style={{ width: `${r.score}%` }} />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" onClick={() => openRepoBrowser(r)} className="flex-1 bg-[var(--gradient-primary)] text-primary-foreground">
                        <FolderGit2 className="mr-1.5 h-3.5 w-3.5" /> Open & analyze
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={r.html_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Dialog open={!!browseRepo} onOpenChange={(o) => !o && setBrowseRepo(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-mono text-base">
                  <FolderGit2 className="h-4 w-4 text-primary" /> {browseRepo?.full_name}
                </DialogTitle>
                <DialogDescription>
                  Select files to send to the workspace for AI analysis. Up to 15 files at once.
                </DialogDescription>
              </DialogHeader>
              {treeLoading ? (
                <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <>
                  {(() => {
                    const blobs = tree.filter(n => n.type === "blob").slice(0, 300);
                    const allSelected = blobs.length > 0 && blobs.every(n => selectedFiles.has(n.path));
                    return (
                      <div className="flex items-center justify-between px-1 pb-2 text-xs">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => {
                              if (allSelected) setSelectedFiles(new Set());
                              else setSelectedFiles(new Set(blobs.slice(0, 15).map(b => b.path)));
                            }}
                            className="accent-primary"
                          />
                          <span className="font-medium">Select all (first 15)</span>
                        </label>
                        <span className="text-muted-foreground">{blobs.length} files · max 15</span>
                      </div>
                    );
                  })()}
                  <div className="max-h-[420px] overflow-y-auto rounded-lg border border-border/60 bg-secondary/20 p-2">
                  {tree.filter(n => n.type === "blob").length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">No files found.</div>
                  ) : (
                    <ul className="space-y-0.5 text-sm">
                      {tree.filter(n => n.type === "blob").slice(0, 300).map((n) => {
                        const checked = selectedFiles.has(n.path);
                        return (
                          <li key={n.sha}>
                            <label className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition ${checked ? "bg-primary/15" : "hover:bg-secondary/50"}`}>
                              <input type="checkbox" checked={checked} onChange={() => toggleFile(n.path)} className="accent-primary" />
                              <FileCode2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <span className="font-mono text-xs truncate">{n.path}</span>
                              {n.size != null && <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{(n.size / 1024).toFixed(1)} KB</span>}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  </div>
                </>
              )}
              <DialogFooter className="items-center sm:justify-between">
                <span className="text-xs text-muted-foreground">{selectedFiles.size} selected</span>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setBrowseRepo(null)}><ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back</Button>
                  <Button disabled={selectedFiles.size === 0 || sending} onClick={analyzeSelected} className="bg-[var(--gradient-primary)] text-primary-foreground">
                    {sending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
                    Send to workspace
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Pull request reviews</h2>
            <div className="glass divide-y divide-border/60 rounded-2xl">
              {prs.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No open pull requests in top repositories.</div>
              ) : prs.map((p) => (
                <a key={p.id} href={p.html_url} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 hover:bg-secondary/30">
                  <GitPullRequest className="h-5 w-5 text-[var(--cyan)]" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.title}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{p.repo} · @{p.user.login}</div>
                  </div>
                  <Badge variant="outline" className={
                    p.risk === "high" ? "border-destructive/40 text-destructive"
                    : p.risk === "medium" ? "border-[var(--warning)]/40 text-[var(--warning)]"
                    : "border-[var(--success)]/40 text-[var(--success)]"
                  }>{p.risk} risk</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <h2 className="mb-3 text-lg font-semibold flex items-center gap-2"><GitCommit className="h-4 w-4" /> Recent commits</h2>
            {commits.length === 0 ? (
              <div className="text-sm text-muted-foreground">No commits available.</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {commits.map((c) => (
                  <li key={c.sha} className="flex items-center justify-between gap-3 border-b border-border/40 pb-2 last:border-0">
                    <span className="font-mono text-xs text-muted-foreground truncate">{c.repo}: {c.message}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{c.date ? new Date(c.date).toLocaleDateString() : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
