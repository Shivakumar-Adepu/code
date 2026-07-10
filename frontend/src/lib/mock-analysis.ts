export type Severity = "critical" | "high" | "medium" | "low";
export type Category =
  | "security"
  | "bug"
  | "performance"
  | "maintainability"
  | "style"
  | "accessibility";

export interface Issue {
  id: string;
  line: number;
  severity: Severity;
  category: Category;
  title: string;
  what: string;
  why: string;
  fix: string;
  bestPractice: string;
  snippet?: string;
  suggestedFix?: string;
  cwe?: string;
}

export interface AnalysisResult {
  bugsFound: number;
  critical: number;
  riskScore: number;
  qualityScore: number;
  bugProbability: number;
  maintainabilityIndex: number;
  complexity: number;
  linesOfCode: number;
  duplication: number;
  issues: Issue[];
  categoryBreakdown: { name: string; value: number }[];
  severityDistribution: { name: string; value: number }[];
  trend: { day: string; bugs: number; risk: number }[];
  summary: string;
  recommendations: string[];
}

interface Rule {
  id: string;
  pattern: RegExp;
  severity: Severity;
  category: Category;
  title: string;
  what: string;
  why: string;
  fix: string;
  bestPractice: string;
  suggestedFix?: (match: string) => string;
  cwe?: string;
  languages?: string[]; // file extensions, undefined = all
}

const RULES: Rule[] = [
  // ---------- Security ----------
  {
    id: "sec-eval",
    pattern: /\beval\s*\(/,
    severity: "critical",
    category: "security",
    title: "Use of eval() detected",
    what: "`eval()` executes arbitrary strings as code.",
    why: "It enables remote code execution if any operand is attacker-influenced and disables JS engine optimizations.",
    fix: "Replace with `JSON.parse`, a lookup table, or `Function` only when strictly necessary.",
    bestPractice: "Never execute untrusted strings; validate and parse instead.",
    cwe: "CWE-95",
  },
  {
    id: "sec-innerhtml",
    pattern: /\.innerHTML\s*=/,
    severity: "high",
    category: "security",
    title: "Direct innerHTML assignment (XSS risk)",
    what: "Setting `innerHTML` with unsanitized data injects markup into the DOM.",
    why: "Attacker-controlled strings become executable HTML/JS — classic XSS.",
    fix: "Use `textContent`, framework bindings, or sanitize with DOMPurify.",
    bestPractice: "Prefer declarative rendering; never concat HTML strings.",
    cwe: "CWE-79",
    suggestedFix: (m) => m.replace(".innerHTML", ".textContent"),
  },
  {
    id: "sec-document-write",
    pattern: /document\.write\s*\(/,
    severity: "high",
    category: "security",
    title: "document.write is unsafe",
    what: "`document.write` rewrites the document and bypasses sanitization.",
    why: "Blocks parsing, breaks SPAs, and enables XSS.",
    fix: "Render via React/DOM APIs instead.",
    bestPractice: "Use modern declarative rendering only.",
  },
  {
    id: "sec-hardcoded-secret",
    pattern: /(?:api[_-]?key|secret|token|password|passwd|pwd)\s*[:=]\s*["'][A-Za-z0-9_\-]{12,}["']/i,
    severity: "critical",
    category: "security",
    title: "Hard-coded secret or API key",
    what: "A credential-looking literal is embedded in source.",
    why: "Anything committed to a repo is leaked permanently — even after deletion.",
    fix: "Move to environment variables / a secrets manager.",
    bestPractice: "Use `process.env.*` on the server; never ship secrets to the client.",
    cwe: "CWE-798",
  },
  {
    id: "sec-math-random",
    pattern: /Math\.random\s*\(/,
    severity: "medium",
    category: "security",
    title: "Math.random() for security context",
    what: "`Math.random()` is not cryptographically secure.",
    why: "Predictable PRNG; unsafe for tokens, IDs, or session keys.",
    fix: "Use `crypto.getRandomValues()` or `crypto.randomUUID()`.",
    bestPractice: "Reserve `Math.random` for non-security UX only.",
    cwe: "CWE-338",
  },
  {
    id: "sec-sql-concat",
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE)\b[^;`]*["'`]\s*\+\s*\w+/i,
    severity: "high",
    category: "security",
    title: "Possible SQL injection",
    what: "Query string concatenated with a variable.",
    why: "Bypasses prepared statements; attacker can inject SQL.",
    fix: "Use parameterized queries / prepared statements / an ORM.",
    bestPractice: "Treat all external input as untrusted.",
    cwe: "CWE-89",
  },
  {
    id: "sec-dangerouslysethtml",
    pattern: /dangerouslySetInnerHTML/,
    severity: "high",
    category: "security",
    title: "dangerouslySetInnerHTML used",
    what: "React's escape hatch around HTML escaping.",
    why: "Unsanitized HTML opens XSS.",
    fix: "Sanitize with DOMPurify or avoid raw HTML.",
    bestPractice: "Render strings as text, not HTML.",
    cwe: "CWE-79",
  },

  // ---------- Bugs ----------
  {
    id: "bug-loose-eq",
    pattern: /[^=!]==[^=]/,
    severity: "medium",
    category: "bug",
    title: "Loose equality (==) used",
    what: "JavaScript `==` performs type coercion.",
    why: "Causes subtle bugs (`0 == ''`, `null == undefined`).",
    fix: "Use strict equality `===` / `!==`.",
    bestPractice: "Enable `eqeqeq` ESLint rule.",
    suggestedFix: (m) => m.replace("==", "==="),
  },
  {
    id: "bug-var",
    pattern: /^\s*var\s+/m,
    severity: "low",
    category: "bug",
    title: "`var` declaration",
    what: "`var` is function-scoped and hoists.",
    why: "Leads to scoping bugs and TDZ-confusion.",
    fix: "Use `const` for immutable bindings, `let` otherwise.",
    bestPractice: "Prefer `const` by default.",
    suggestedFix: (m) => m.replace(/var\s+/, "const "),
  },
  {
    id: "bug-empty-catch",
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/,
    severity: "high",
    category: "bug",
    title: "Empty catch block swallows errors",
    what: "Errors are caught but never handled or logged.",
    why: "Silent failure makes debugging impossible.",
    fix: "Log the error, rethrow, or handle it explicitly.",
    bestPractice: "Use structured logging in catch blocks.",
  },
  {
    id: "bug-await-in-loop",
    pattern: /for\s*\([^)]*\)\s*\{[^}]*await\s+/,
    severity: "medium",
    category: "performance",
    title: "Await inside a for-loop",
    what: "Sequential awaits inside a loop serialize all I/O.",
    why: "Wastes parallelism — N requests take N × latency.",
    fix: "Use `await Promise.all(items.map(async (x) => ...))` when order doesn't matter.",
    bestPractice: "Batch I/O; cap concurrency with a semaphore for large sets.",
  },
  {
    id: "bug-null-deref",
    pattern: /\b(\w+)\.\w+\.(?:toUpperCase|toLowerCase|map|filter|forEach|length|split|trim)\b/,
    severity: "high",
    category: "bug",
    title: "Possible null/undefined dereference",
    what: "Chained property access without a guard.",
    why: "If the intermediate value is `null`/`undefined`, this throws at runtime.",
    fix: "Use optional chaining `a?.b?.c` or add a guard.",
    bestPractice: "Enable strict null checks in TypeScript.",
    cwe: "CWE-476",
  },
  {
    id: "bug-fetch-no-error",
    pattern: /fetch\s*\([^)]*\)\s*\.then\([^)]*\)(?!\s*\.catch)/,
    severity: "medium",
    category: "bug",
    title: "Fetch without .catch()",
    what: "A network promise chain has no rejection handler.",
    why: "Unhandled promise rejection — silent on success, crash on failure.",
    fix: "Add `.catch(err => ...)` or wrap in `try/await/catch`.",
    bestPractice: "Always handle async failure paths.",
  },
  {
    id: "bug-useeffect-empty-deps",
    pattern: /useEffect\s*\(\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[\s*\]\s*\)/,
    severity: "medium",
    category: "bug",
    title: "useEffect with empty deps using outer values",
    what: "An effect with `[]` deps but closes over props/state.",
    why: "Captures stale values; only runs once with initial closure.",
    fix: "List all referenced dependencies, or use `useCallback`/refs.",
    bestPractice: "Enable `react-hooks/exhaustive-deps`.",
  },

  // ---------- Maintainability & Style ----------
  {
    id: "main-console-log",
    pattern: /console\.(log|debug)\s*\(/,
    severity: "low",
    category: "maintainability",
    title: "console.log left in code",
    what: "Debug log statement reached production code.",
    why: "Noisy logs leak data and slow the console.",
    fix: "Remove or replace with a real logger gated by env.",
    bestPractice: "Use a logger with levels; strip in production builds.",
  },
  {
    id: "main-todo",
    pattern: /\/\/\s*(TODO|FIXME|XXX|HACK)\b/i,
    severity: "low",
    category: "maintainability",
    title: "TODO/FIXME marker",
    what: "Unresolved work marker in source.",
    why: "Accumulates as silent tech debt.",
    fix: "Track in your issue tracker and reference the ticket ID.",
    bestPractice: "TODOs should always link to a ticket.",
  },
  {
    id: "main-any",
    pattern: /:\s*any\b/,
    severity: "low",
    category: "maintainability",
    title: "Explicit `any` type",
    what: "TypeScript type erased to `any`.",
    why: "Disables type-checking for the value.",
    fix: "Use `unknown` + narrowing, or a precise type.",
    bestPractice: "Prefer `unknown` over `any` at boundaries.",
    languages: ["ts", "tsx"],
  },
  {
    id: "main-long-line",
    pattern: /^.{160,}$/m,
    severity: "low",
    category: "style",
    title: "Very long line (>160 chars)",
    what: "Line exceeds reasonable width.",
    why: "Hurts readability and review diffs.",
    fix: "Break into multiple lines or extract helpers.",
    bestPractice: "Configure Prettier with a sensible printWidth.",
  },
  {
    id: "main-magic-number",
    pattern: /\b(?<![\w.])\d{4,}(?![\w.])/,
    severity: "low",
    category: "maintainability",
    title: "Magic number",
    what: "Large numeric literal used without a name.",
    why: "Obscures intent; hard to grep.",
    fix: "Extract into a named `const`.",
    bestPractice: "Centralize tunables in a config module.",
  },

  // ---------- Accessibility ----------
  {
    id: "a11y-img-alt",
    pattern: /<img\b(?![^>]*\balt=)[^>]*>/,
    severity: "medium",
    category: "accessibility",
    title: "<img> missing alt attribute",
    what: "Image rendered without accessible text.",
    why: "Screen readers cannot describe the image.",
    fix: "Add `alt=\"...\"` (use empty string for decorative).",
    bestPractice: "Treat alt text as a content requirement.",
  },
  {
    id: "a11y-click-div",
    pattern: /<div\b[^>]*\bonClick=/,
    severity: "low",
    category: "accessibility",
    title: "Clickable <div> instead of <button>",
    what: "Non-interactive element used as a button.",
    why: "Not focusable, not keyboard-accessible.",
    fix: "Use `<button>` or add role, tabIndex and keydown handler.",
    bestPractice: "Prefer semantic interactive elements.",
  },
];

const uid = () => Math.random().toString(36).slice(2, 9);

export function analyzeCode(code: string, language?: string): AnalysisResult {
  const rawLines = code.split("\n");
  const linesOfCode = rawLines.filter((l) => l.trim() && !/^\s*\/\//.test(l)).length || 1;
  const ext = (language || "").toLowerCase();

  const issues: Issue[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line.trim()) continue;
    for (const rule of RULES) {
      if (rule.languages && ext && !rule.languages.includes(ext)) continue;
      const m = rule.pattern.exec(line);
      if (!m) continue;
      const key = rule.id + ":" + (i + 1);
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push({
        id: `${rule.id}-${uid()}`,
        line: i + 1,
        severity: rule.severity,
        category: rule.category,
        title: rule.title,
        what: rule.what,
        why: rule.why,
        fix: rule.fix,
        bestPractice: rule.bestPractice,
        snippet: line.trim().slice(0, 200),
        suggestedFix: rule.suggestedFix ? rule.suggestedFix(line.trim()).slice(0, 200) : undefined,
        cwe: rule.cwe,
      });
    }
  }

  // multi-line heuristic: file-level duplication score
  const dedup = new Map<string, number>();
  rawLines.forEach((l) => {
    const k = l.trim();
    if (k.length > 30) dedup.set(k, (dedup.get(k) || 0) + 1);
  });
  const dupCount = Array.from(dedup.values()).filter((v) => v > 1).reduce((a, b) => a + b, 0);
  const duplication = Math.min(100, Math.round((dupCount / linesOfCode) * 100));

  // cyclomatic-ish complexity: count branches
  const complexity =
    1 +
    ((code.match(/\b(if|for|while|case|catch|&&|\|\||\?)\b|\?\./g) || []).length);

  issues.sort((a, b) => {
    const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity] || a.line - b.line;
  });

  const critical = issues.filter((i) => i.severity === "critical").length;
  const high = issues.filter((i) => i.severity === "high").length;
  const medium = issues.filter((i) => i.severity === "medium").length;
  const low = issues.filter((i) => i.severity === "low").length;

  const risk = Math.min(100, critical * 28 + high * 16 + medium * 7 + low * 2 + Math.floor(complexity / 4));
  const maintainability = Math.max(10, 100 - Math.floor(complexity * 1.5) - duplication / 2 - low * 2);
  const quality = Math.max(15, Math.round(100 - risk * 0.7 + maintainability * 0.1));
  const prob = Math.min(99, Math.round(15 + risk * 0.7));

  const categories: Category[] = ["security", "bug", "performance", "maintainability", "style", "accessibility"];
  const categoryBreakdown = categories
    .map((c) => ({ name: c, value: issues.filter((i) => i.category === c).length }))
    .filter((c) => c.value > 0);

  const recommendations: string[] = [];
  if (critical > 0) recommendations.push("Resolve all critical security findings before merging.");
  if (high > 0) recommendations.push("Triage high-severity issues; they typically cause production incidents.");
  if (complexity > 20) recommendations.push("Break down complex functions — cyclomatic complexity is high.");
  if (duplication > 15) recommendations.push("Refactor duplicated logic into shared helpers.");
  if (issues.some((i) => i.category === "security")) recommendations.push("Run a dependency vulnerability scan.");
  if (issues.length === 0) recommendations.push("Looks clean — add tests to lock in this state.");

  return {
    bugsFound: issues.length,
    critical,
    riskScore: Math.round(risk),
    qualityScore: Math.round(quality),
    bugProbability: prob,
    maintainabilityIndex: Math.round(maintainability),
    complexity,
    linesOfCode,
    duplication,
    issues,
    categoryBreakdown,
    severityDistribution: [
      { name: "Critical", value: critical },
      { name: "High", value: high },
      { name: "Medium", value: medium },
      { name: "Low", value: low },
    ],
    trend: Array.from({ length: 7 }).map((_, i) => ({
      day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
      bugs: Math.max(0, issues.length + ((i * 3) % 5) - 2),
      risk: Math.min(100, Math.max(5, Math.round(risk + Math.sin(i) * 12))),
    })),
    summary:
      issues.length === 0
        ? `Clean pass — no significant risks across ${linesOfCode} lines.`
        : `Found ${issues.length} issue${issues.length === 1 ? "" : "s"} (${critical} critical, ${high} high) across ${linesOfCode} lines. ${
            critical ? "Address critical findings immediately." : "Start with high-severity items."
          }`,
    recommendations,
  };
}

export const sampleCode = `// Paste or write code, then run AI analysis
import { useEffect, useState } from "react";

const API_KEY = "sk_live_1234567890abcdef"; // hardcoded secret

export function UserCard({ userId }) {
  var user = null;

  useEffect(() => {
    fetch("/api/users/" + userId)
      .then(r => r.json())
      .then(setUser);
  }, []);

  if (user.name == "admin") {
    document.getElementById("root").innerHTML = "<h1>" + user.name + "</h1>";
  }

  return <div onClick={() => console.log(user)}>{user.name.toUpperCase()}</div>;
}
`;
