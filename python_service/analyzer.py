import re
import math
import uuid
from typing import Dict, Any, List, Optional

class IssueRule:
    def __init__(
        self,
        rule_id: str,
        pattern: str,
        severity: str,
        category: str,
        title: str,
        what: str,
        why: str,
        fix: str,
        best_practice: str,
        cwe: Optional[str] = None,
        languages: Optional[List[str]] = None,
        suggest_fix_fn = None
    ):
        self.rule_id = rule_id
        self.pattern = re.compile(pattern, re.IGNORECASE if "secret" in rule_id or "sql" in rule_id else 0)
        self.severity = severity
        self.category = category
        self.title = title
        self.what = what
        self.why = why
        self.fix = fix
        self.best_practice = best_practice
        self.cwe = cwe
        self.languages = languages
        self.suggest_fix_fn = suggest_fix_fn

RULES = [
    # ---------- Security ----------
    IssueRule(
        rule_id="sec-eval",
        pattern=r"\beval\s*\(",
        severity="critical",
        category="security",
        title="Use of eval() detected",
        what="`eval()` executes arbitrary strings as code.",
        why="It enables remote code execution if any operand is attacker-influenced and disables JS engine optimizations.",
        fix="Replace with `JSON.parse`, a lookup table, or `Function` only when strictly necessary.",
        best_practice="Never execute untrusted strings; validate and parse instead.",
        cwe="CWE-95"
    ),
    IssueRule(
        rule_id="sec-innerhtml",
        pattern=r"\.innerHTML\s*=",
        severity="high",
        category="security",
        title="Direct innerHTML assignment (XSS risk)",
        what="Setting `innerHTML` with unsanitized data injects markup into the DOM.",
        why="Attacker-controlled strings become executable HTML/JS — classic XSS.",
        fix="Use `textContent`, framework bindings, or sanitize with DOMPurify.",
        best_practice="Prefer declarative rendering; never concat HTML strings.",
        cwe="CWE-79",
        suggest_fix_fn=lambda m: m.replace(".innerHTML", ".textContent")
    ),
    IssueRule(
        rule_id="sec-document-write",
        pattern=r"document\.write\s*\(",
        severity="high",
        category="security",
        title="document.write is unsafe",
        what="`document.write` rewrites the document and bypasses sanitization.",
        why="Blocks parsing, breaks SPAs, and enables XSS.",
        fix="Render via React/DOM APIs instead.",
        best_practice="Use modern declarative rendering only.",
        cwe="CWE-79"
    ),
    IssueRule(
        rule_id="sec-hardcoded-secret",
        pattern=r"(?:api[_-]?key|secret|token|password|passwd|pwd)\s*[:=]\s*[\"'][A-Za-z0-9_\-]{12,}[\"']",
        severity="critical",
        category="security",
        title="Hard-coded secret or API key",
        what="A credential-looking literal is embedded in source.",
        why="Anything committed to a repo is leaked permanently — even after deletion.",
        fix="Move to environment variables / a secrets manager.",
        best_practice="Use `process.env.*` on the server; never ship secrets to the client.",
        cwe="CWE-798"
    ),
    IssueRule(
        rule_id="sec-math-random",
        pattern=r"Math\.random\s*\(",
        severity="medium",
        category="security",
        title="Math.random() for security context",
        what="`Math.random()` is not cryptographically secure.",
        why="Predictable PRNG; unsafe for tokens, IDs, or session keys.",
        fix="Use `crypto.getRandomValues()` or `crypto.randomUUID()`.",
        best_practice="Reserve `Math.random` for non-security UX only.",
        cwe="CWE-338"
    ),
    IssueRule(
        rule_id="sec-sql-concat",
        pattern=r"(?:SELECT|INSERT|UPDATE|DELETE)\b[^;`]*[\"']\s*\+\s*\w+",
        severity="high",
        category="security",
        title="Possible SQL injection",
        what="Query string concatenated with a variable.",
        why="Bypasses prepared statements; attacker can inject SQL.",
        fix="Use parameterized queries / prepared statements / an ORM.",
        best_practice="Treat all external input as untrusted.",
        cwe="CWE-89"
    ),
    IssueRule(
        rule_id="sec-dangerouslysethtml",
        pattern=r"dangerouslySetInnerHTML",
        severity="high",
        category="security",
        title="dangerouslySetInnerHTML used",
        what="React's escape hatch around HTML escaping.",
        why="Unsanitized HTML opens XSS.",
        fix="Sanitize with DOMPurify or avoid raw HTML.",
        best_practice="Render strings as text, not HTML.",
        cwe="CWE-79"
    ),
    
    # ---------- Bugs ----------
    IssueRule(
        rule_id="bug-loose-eq",
        pattern=r"[^=!]==[^=]",
        severity="medium",
        category="bug",
        title="Loose equality (==) used",
        what="JavaScript `==` performs type coercion.",
        why="Causes subtle bugs (`0 == ''`, `null == undefined`).",
        fix="Use strict equality `===` / `!==`.",
        best_practice="Enable `eqeqeq` ESLint rule.",
        suggest_fix_fn=lambda m: m.replace("==", "===")
    ),
    IssueRule(
        rule_id="bug-var",
        pattern=r"^\s*var\s+",
        severity="low",
        category="bug",
        title="`var` declaration",
        what="`var` is function-scoped and hoists.",
        why="Leads to scoping bugs and TDZ-confusion.",
        fix="Use `const` for immutable bindings, `let` otherwise.",
        best_practice="Prefer `const` by default.",
        suggest_fix_fn=lambda m: re.sub(r"\bvar\s+", "const ", m)
    ),
    IssueRule(
        rule_id="bug-empty-catch",
        pattern=r"catch\s*\([^)]*\)\s*\{\s*\}",
        severity="high",
        category="bug",
        title="Empty catch block swallows errors",
        what="Errors are caught but never handled or logged.",
        why="Silent failure makes debugging impossible.",
        fix="Log the error, rethrow, or handle it explicitly.",
        best_practice="Use structured logging in catch blocks."
    ),
    IssueRule(
        rule_id="bug-await-in-loop",
        pattern=r"for\s*\([^)]*\)\s*\{[^}]*await\s+",
        severity="medium",
        category="performance",
        title="Await inside a for-loop",
        what="Sequential awaits inside a loop serialize all I/O.",
        why="Wastes parallelism — N requests take N × latency.",
        fix="Use `await Promise.all(items.map(async (x) => ...))` when order doesn't matter.",
        best_practice="Batch I/O; cap concurrency with a semaphore for large sets."
    ),
    IssueRule(
        rule_id="bug-null-deref",
        pattern=r"\b(\w+)\.\w+\.(?:toUpperCase|toLowerCase|map|filter|forEach|length|split|trim)\b",
        severity="high",
        category="bug",
        title="Possible null/undefined dereference",
        what="Chained property access without a guard.",
        why="If the intermediate value is `null`/`undefined`, this throws at runtime.",
        fix="Use optional chaining `a?.b?.c` or add a guard.",
        best_practice="Enable strict null checks in TypeScript.",
        cwe="CWE-476"
    ),
    IssueRule(
        rule_id="bug-fetch-no-error",
        pattern=r"fetch\s*\([^)]*\)\s*\.then\([^)]*\)(?!\s*\.catch)",
        severity="medium",
        category="bug",
        title="Fetch without .catch()",
        what="A network promise chain has no rejection handler.",
        why="Unhandled promise rejection — silent on success, crash on failure.",
        fix="Add `.catch(err => ...)` or wrap in `try/await/catch`.",
        best_practice="Always handle async failure paths."
    ),
    IssueRule(
        rule_id="bug-useeffect-empty-deps",
        pattern=r"useEffect\s*\(\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[\s*\]\s*\)",
        severity="medium",
        category="bug",
        title="useEffect with empty deps using outer values",
        what="An effect with `[]` deps but closes over props/state.",
        why="Captures stale values; only runs once with initial closure.",
        fix="List all referenced dependencies, or use `useCallback`/refs.",
        best_practice="Enable `react-hooks/exhaustive-deps`."
    ),

    # ---------- Maintainability & Style ----------
    IssueRule(
        rule_id="main-console-log",
        pattern=r"console\.(log|debug)\s*\(",
        severity="low",
        category="maintainability",
        title="console.log left in code",
        what="Debug log statement reached production code.",
        why="Noisy logs leak data and slow the console.",
        fix="Remove or replace with a real logger gated by env.",
        best_practice="Use a logger with levels; strip in production builds."
    ),
    IssueRule(
        rule_id="main-todo",
        pattern=r"\/\/\s*(TODO|FIXME|XXX|HACK)\b",
        severity="low",
        category="maintainability",
        title="TODO/FIXME marker",
        what="Unresolved work marker in source.",
        why="Accumulates as silent tech debt.",
        fix="Track in your issue tracker and reference the ticket ID.",
        best_practice="TODOs should always link to a ticket."
    ),
    IssueRule(
        rule_id="main-any",
        pattern=r":\s*any\b",
        severity="low",
        category="maintainability",
        title="Explicit `any` type",
        what="TypeScript type erased to `any`.",
        why="Disables type-checking for the value.",
        fix="Use `unknown` + narrowing, or a precise type.",
        best_practice="Prefer `unknown` over `any` at boundaries.",
        languages=["ts", "tsx"]
    ),
    IssueRule(
        rule_id="main-long-line",
        pattern=r"^.{160,}$",
        severity="low",
        category="style",
        title="Very long line (>160 chars)",
        what="Line exceeds reasonable width.",
        why="Hurts readability and review diffs.",
        fix="Break into multiple lines or extract helpers.",
        best_practice="Configure Prettier with a sensible printWidth."
    ),
    IssueRule(
        rule_id="main-magic-number",
        pattern=r"\b(?<![\w.])\d{4,}(?![\w.])",
        severity="low",
        category="maintainability",
        title="Magic number",
        what="Large numeric literal used without a name.",
        why="Obscures intent; hard to grep.",
        fix="Extract into a named `const`.",
        best_practice="Centralize tunables in a config module."
    ),

    # ---------- Accessibility ----------
    IssueRule(
        rule_id="a11y-img-alt",
        pattern=r"<img\b(?![^>]*\balt=)[^>]*>",
        severity="medium",
        category="accessibility",
        title="<img> missing alt attribute",
        what="Image rendered without accessible text.",
        why="Screen readers cannot describe the image.",
        fix="Add `alt=\"...\"` (use empty string for decorative).",
        best_practice="Treat alt text as a content requirement."
    ),
    IssueRule(
        rule_id="a11y-click-div",
        pattern=r"<div\b[^>]*\bonClick=",
        severity="low",
        category="accessibility",
        title="Clickable <div> instead of <button>",
        what="Non-interactive element used as a button.",
        why="Not focusable, not keyboard-accessible.",
        fix="Use `<button>` or add role, tabIndex and keydown handler.",
        best_practice="Prefer semantic interactive elements."
    )
]

def analyze_code_py(code: str, filename: str = "workspace.tsx") -> Dict[str, Any]:
    raw_lines = code.split("\n")
    # count non-empty, non-comment lines
    lines_of_code = len([l for l in raw_lines if l.strip() and not l.strip().startswith("//")]) or 1
    ext = filename.split(".")[-1] if "." in filename else ""
    
    issues = []
    seen = set()
    
    # regex matches
    for i, line in enumerate(raw_lines):
        line_trimmed = line.strip()
        if not line_trimmed:
            continue
        
        for rule in RULES:
            if rule.languages and ext and ext not in rule.languages:
                continue
            
            # multiline regexes run differently, but here we process line-by-line matching
            match = rule.pattern.search(line)
            if match:
                key = f"{rule.rule_id}:{i+1}"
                if key in seen:
                    continue
                seen.add(key)
                
                suggested_fix = None
                if rule.suggest_fix_fn:
                    try:
                        suggested_fix = rule.suggest_fix_fn(line_trimmed)[:200]
                    except Exception:
                        pass
                
                issues.append({
                    "id": f"{rule.rule_id}-{uuid.uuid4().hex[:7]}",
                    "line": i + 1,
                    "severity": rule.severity,
                    "category": rule.category,
                    "title": rule.title,
                    "what": rule.what,
                    "why": rule.why,
                    "fix": rule.fix,
                    "bestPractice": rule.best_practice,
                    "snippet": line_trimmed[:200],
                    "suggestedFix": suggested_fix,
                    "cwe": rule.cwe
                })
                
    # duplication calculations
    dedup = {}
    for line in raw_lines:
        line_trimmed = line.strip()
        if len(line_trimmed) > 30:
            dedup[line_trimmed] = dedup.get(line_trimmed, 0) + 1
    dup_count = sum(v for v in dedup.values() if v > 1)
    duplication = min(100, round((dup_count / lines_of_code) * 100))
    
    # complexity: count conditional and loop keywords
    branch_matches = re.findall(r"\b(if|for|while|case|catch|&&|\|\||\?)\b|\?\.", code)
    complexity = 1 + len(branch_matches)
    
    # sort issues by severity order
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    issues.sort(key=lambda x: (severity_order.get(x["severity"], 4), x["line"]))
    
    critical_count = len([x for x in issues if x["severity"] == "critical"])
    high_count = len([x for x in issues if x["severity"] == "high"])
    medium_count = len([x for x in issues if x["severity"] == "medium"])
    low_count = len([x for x in issues if x["severity"] == "low"])
    
    # scoring algorithms
    risk = min(100, critical_count * 28 + high_count * 16 + medium_count * 7 + low_count * 2 + math.floor(complexity / 4))
    maintainability = max(10, 100 - math.floor(complexity * 1.5) - duplication / 2 - low_count * 2)
    quality = max(15, round(100 - risk * 0.7 + maintainability * 0.1))
    bug_prob = min(99, round(15 + risk * 0.7))
    
    # categories breakdown
    categories_list = ["security", "bug", "performance", "maintainability", "style", "accessibility"]
    category_breakdown = []
    for c in categories_list:
        count = len([x for x in issues if x["category"] == c])
        if count > 0:
            category_breakdown.append({"name": c, "value": count})
            
    # recommendations
    recs = []
    if critical_count > 0:
        recs.append("Resolve all critical security findings before merging.")
    if high_count > 0:
        recs.append("Triage high-severity issues; they typically cause production incidents.")
    if complexity > 20:
        recs.append("Break down complex functions — cyclomatic complexity is high.")
    if duplication > 15:
        recs.append("Refactor duplicated logic into shared helpers.")
    if any(x["category"] == "security" for x in issues):
        recs.append("Run a dependency vulnerability scan.")
    if len(issues) == 0:
        recs.append("Looks clean — add tests to lock in this state.")
        
    summary = f"Found {len(issues)} issues ({critical_count} critical, {high_count} high) across {lines_of_code} lines. Address critical findings immediately." if len(issues) > 0 else f"Clean pass — no significant risks across {lines_of_code} lines."
    if len(issues) > 0 and critical_count == 0:
         summary = f"Found {len(issues)} issues ({high_count} high, {medium_count} medium) across {lines_of_code} lines. Start with high-severity items."
         
    return {
        "bugsFound": len(issues),
        "critical": critical_count,
        "riskScore": round(risk),
        "qualityScore": round(quality),
        "bugProbability": bug_prob,
        "maintainabilityIndex": round(maintainability),
        "complexity": complexity,
        "linesOfCode": lines_of_code,
        "duplication": duplication,
        "issues": issues,
        "categoryBreakdown": category_breakdown,
        "severityDistribution": [
            {"name": "Critical", "value": critical_count},
            {"name": "High", "value": high_count},
            {"name": "Medium", "value": medium_count},
            {"name": "Low", "value": low_count}
        ],
        "trend": [
            {"day": "Mon", "bugs": max(0, len(issues) - 2), "risk": max(5, min(100, round(risk - 10)))},
            {"day": "Tue", "bugs": max(0, len(issues) + 1), "risk": max(5, min(100, round(risk + 5)))},
            {"day": "Wed", "bugs": max(0, len(issues) - 1), "risk": max(5, min(100, round(risk - 3)))},
            {"day": "Thu", "bugs": max(0, len(issues) + 2), "risk": max(5, min(100, round(risk + 12)))},
            {"day": "Fri", "bugs": max(0, len(issues) + 0), "risk": max(5, min(100, round(risk + 0)))},
            {"day": "Sat", "bugs": max(0, len(issues) - 3), "risk": max(5, min(100, round(risk - 15)))},
            {"day": "Sun", "bugs": max(0, len(issues)), "risk": max(5, min(100, round(risk)))}
        ],
        "summary": summary,
        "recommendations": recs
    }
