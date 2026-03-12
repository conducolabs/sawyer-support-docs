# Phase 2: Codebase Scanner - Research

**Researched:** 2026-03-12
**Domain:** Claude Agent SDK subprocess invocation, git diff change detection, JSON feature map schema design
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Claude Code invocation:**
- Invoke via `claude` CLI subprocess (spawn child process, capture stdout)
- Multi-pass scanning strategy: Pass 1 identifies screens/routes, Pass 2 classifies user-facing vs infrastructure, Pass 3 extracts feature details
- Streaming output — developer sees what Claude Code is finding in real-time
- Sequential scanning — one repo at a time (mobile, dashboard, platform in order)

**Feature map schema:**
- Features grouped by feature area (matches `docs/` directory structure from Phase 1)
- Each feature entry includes: feature name, slug (via `buildSlug`), source app identifier (mobile/dashboard/both), audience classification (end_user/admin with role levels), and related API context from platform scan
- Dashboard features distinguish admin role levels (club admin, company admin, super admin) — enables role-specific articles in Phase 3
- Feature map stored in `.sawyer-docs/` directory (hidden, keeps project root clean)
- Single vs per-repo file split: Claude's discretion

**Change detection:**
- Git diff against stored commit hash per repo — store last-scanned commit SHA, diff on next run to find changed files
- First run: full scan of all repos, save everything, all features marked as 'new'
- State files (commit hashes, previous feature map) committed to git — team members share scan state
- Diff summary display: Claude's discretion based on verbosity level

**Scan scope and filtering:**
- Mixed granularity — Claude Code uses judgment per case (some features are single screens, others are multi-screen flows)
- Infrastructure exclusions: navigation/routing structures, loading/error states, auth guards/wrappers, dev/debug screens
- Platform API scan produces context that feeds into feature entries — Claude decides whether inline or separate file

### Claude's Discretion
- Exact prompt templates for each scanning pass
- Single merged feature map vs per-repo files
- API context inline on features vs separate file
- Diff summary display based on verbosity flags
- Error handling and retry logic for Claude Code subprocess

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SCAN-01 | CLI invokes Claude Code to analyze the mobile app codebase and identify user-facing screens and flows | Claude Agent SDK `query()` with `cwd` set to mobile repo path; multi-pass prompts with Read/Grep/Glob tools |
| SCAN-02 | CLI invokes Claude Code to analyze the dashboard codebase and identify user-facing screens and flows | Same SDK pattern as SCAN-01, different `cwd` and system prompt context for admin classification |
| SCAN-03 | CLI invokes Claude Code to extract context from the platform API codebase (data models, endpoints) without generating articles for it | Third SDK invocation; system prompt explicitly scoped to context extraction only |
| SCAN-04 | Claude Code classifies components as user-facing features vs infrastructure (filters out loading screens, nav wrappers, etc.) | Multi-pass strategy: Pass 2 is the classification pass; structured output schema enforces the classification field |
| SCAN-05 | Scanning produces a structured feature map (JSON) that feeds into article generation | Zod schema for feature map; `outputFormat: { type: 'json_schema' }` in SDK options; single `.sawyer-docs/feature-map.json` |
| SCAN-06 | Feature map uses stable, deterministic identifiers for features (idempotent — rerunning produces same file names) | Slugs derived via `buildSlug()` from stable feature names; slug is the canonical ID; same name → same slug always |
| SCAN-07 | Scanner detects changed features via git diff against a stored state file, only regenerating docs for changes | `git diff --name-only <stored-sha> HEAD` via `execAsync`; state stored in `.sawyer-docs/scan-state.json` |
</phase_requirements>

---

## Summary

Phase 2 is fundamentally a Claude-in-Claude architecture: the `sawyer-docs` CLI uses the `@anthropic-ai/claude-agent-sdk` TypeScript package to spawn a subordinate Claude Code process, point it at a repo directory, and collect structured JSON output describing user-facing features. This approach avoids all custom AST parsing and delegates codebase understanding entirely to Claude Code's built-in tools (Read, Grep, Glob, Bash).

The three critical technical areas are: (1) correct Claude Agent SDK usage — particularly `cwd` option, `permissionMode: 'bypassPermissions'`, `outputFormat` with a JSON schema, and streaming message handling; (2) change detection via `git diff --name-only <stored-sha> HEAD` executed via `child_process.execAsync` in the repo directory; and (3) a Zod-validated feature map schema that enforces the shape Claude must produce.

A significant gotcha exists for Node.js subprocess spawning: using the default `stdio: 'pipe'` configuration can cause Claude CLI to hang indefinitely on macOS. The Claude Agent SDK handles this correctly internally — using the SDK package is strongly preferred over manually spawning the `claude` CLI with `child_process.spawn`. The SDK also provides structured output support via `outputFormat: { type: 'json_schema' }`, which is the right mechanism to get deterministic JSON from each scan pass.

**Primary recommendation:** Use `@anthropic-ai/claude-agent-sdk` (latest ~v0.2.x) with `permissionMode: 'bypassPermissions'`, set `cwd` to each repo path, and use `outputFormat` with a Zod-derived JSON schema for the final extraction pass.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/claude-agent-sdk` | `^0.2.x` (latest) | Programmatic Claude Code invocation | Official SDK; handles stdio hang bug, streaming, structured output |
| `zod` | `^4.3.6` (already installed) | Feature map schema definition and validation | Already in project; used by project convention for all schemas |
| `node:child_process` (built-in) | Node 18+ | `execAsync` for `git diff` / `git rev-parse` commands | No extra dependency; sufficient for git commands |
| `node:fs` / `node:path` (built-in) | Node 18+ | `.sawyer-docs/` directory creation, state file I/O | No extra dependency |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `util.promisify` (built-in) | Node 18+ | Promisify `exec` for git commands | Use `promisify(exec)` pattern for git subprocess calls |
| `ora` (already installed) | `^9.3.0` | Spinner per scan pass | Wrap each Claude invocation with a spinner from `createLogger()` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@anthropic-ai/claude-agent-sdk` | `child_process.spawn('claude', ['-p', ...])` | Manual spawn has known macOS hang bug (stdio: pipe); SDK fixes this and adds structured output support |
| `git diff` via `execAsync` | `simple-git` npm package | `simple-git` is heavier and adds a dependency; the two git commands needed here (rev-parse, diff --name-only) are trivial with `execAsync` |
| `outputFormat: { type: 'json_schema' }` | Prompt-only JSON extraction | Schema-less extraction is unreliable; structured output with Zod schema enforces shape contract |

**Installation:**
```bash
npm install @anthropic-ai/claude-agent-sdk
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── commands/
│   └── scan.ts               # Entry point — wires CLI options to scanner
├── scanner/
│   index.ts                  # scanRepo() orchestrator — calls passes in order
│   passes.ts                 # runPass1(), runPass2(), runPass3() — SDK invocations
│   prompts.ts                # Prompt templates for each pass (constants)
│   schema.ts                 # Zod schemas: FeatureMap, Feature, ScanState
│   change-detection.ts       # getStoredSha(), getCurrentSha(), getChangedFiles()
│   state.ts                  # readScanState(), writeScanState() for .sawyer-docs/
│   merge.ts                  # mergeFeatureMaps() — combines per-repo results
└── ui/
    └── logger.ts             # (existing) createLogger()

.sawyer-docs/
├── feature-map.json          # Merged feature map (committed to git)
└── scan-state.json           # Stored SHAs and last-scan metadata (committed to git)
```

### Pattern 1: Claude Agent SDK `query()` for Structured Scan Pass

**What:** Use `query()` with `outputFormat: { type: 'json_schema' }` to get typed JSON back from each scan pass.
**When to use:** Pass 3 (feature detail extraction) and any pass where structured data is required.

```typescript
// Source: https://platform.claude.com/docs/en/agent-sdk/typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const featureSchema = {
  type: 'object' as const,
  properties: {
    features: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          slug: { type: 'string' },
          featureArea: { type: 'string' },
          sourceApp: { type: 'string', enum: ['mobile', 'dashboard', 'both'] },
          audience: { type: 'string', enum: ['end_user', 'admin'] },
          adminRoles: { type: 'array', items: { type: 'string' } },
          description: { type: 'string' },
        },
        required: ['name', 'slug', 'featureArea', 'sourceApp', 'audience'],
      },
    },
  },
  required: ['features'],
};

for await (const message of query({
  prompt: PASS3_PROMPT,
  options: {
    cwd: repoPath,                    // CRITICAL: sets Claude's working directory
    allowedTools: ['Read', 'Grep', 'Glob'],
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 20,
    outputFormat: { type: 'json_schema', schema: featureSchema },
    systemPrompt: SCANNER_SYSTEM_PROMPT,
  },
})) {
  if (message.type === 'result') {
    const structured = message.structured_output;  // typed by schema
    // validate with Zod before use
  }
  if (message.type === 'assistant') {
    // stream partial text to user via logger
    logger.info(extractText(message));
  }
}
```

### Pattern 2: Streaming Pass (Passes 1 & 2 — Discovery and Classification)

**What:** For passes that don't need structured output, use `query()` with `includePartialMessages` for real-time display.
**When to use:** Pass 1 (screen discovery) and Pass 2 (classification) where the developer watches Claude work.

```typescript
// Source: https://platform.claude.com/docs/en/agent-sdk/typescript
for await (const message of query({
  prompt: PASS1_PROMPT,
  options: {
    cwd: repoPath,
    allowedTools: ['Read', 'Grep', 'Glob'],
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    includePartialMessages: true,
    maxTurns: 10,
  },
})) {
  if (message.type === 'assistant' && message.message.content) {
    // print streaming text to console for real-time developer feedback
    process.stdout.write(extractPartialText(message));
  }
  if (message.type === 'result') {
    return message.result;  // text result used as input to Pass 2
  }
}
```

### Pattern 3: Git Change Detection

**What:** Run `git rev-parse HEAD` and `git diff --name-only <stored-sha> HEAD` to identify changed files since last scan.
**When to use:** Every scan run after the first to determine which repos need re-scanning.

```typescript
// Source: Node.js child_process docs + git-scm.com/docs/git-diff
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

async function getCurrentSha(repoPath: string): Promise<string> {
  const { stdout } = await execAsync('git rev-parse HEAD', { cwd: repoPath });
  return stdout.trim();
}

async function getChangedFiles(repoPath: string, storedSha: string): Promise<string[]> {
  const currentSha = await getCurrentSha(repoPath);
  if (currentSha === storedSha) return [];  // no changes — skip scan

  const { stdout } = await execAsync(
    `git diff --name-only ${storedSha} ${currentSha}`,
    { cwd: repoPath }
  );
  return stdout.trim().split('\n').filter(Boolean);
}
```

### Pattern 4: Multi-Pass with Session Resume

**What:** Each scan pass can capture a `sessionId` from `query()` result and pass it to the next pass via `--resume` / `resume` option for context continuity.
**When to use:** When Pass 2 needs to reason about Pass 1's findings without re-reading the codebase.

```typescript
// Source: https://code.claude.com/docs/en/headless
let sessionId: string | undefined;

// Pass 1 — discovery
for await (const msg of query({ prompt: PASS1_PROMPT, options: { cwd: repoPath, ... } })) {
  if (msg.type === 'result') sessionId = msg.session_id;
}

// Pass 2 — classification (resumes Pass 1 context)
for await (const msg of query({
  prompt: PASS2_PROMPT,
  options: { cwd: repoPath, resume: sessionId, ... }
})) { ... }
```

### Anti-Patterns to Avoid

- **Manual `child_process.spawn('claude', ...)`:** Known macOS bug where `stdio: 'pipe'` hangs indefinitely. Always use `@anthropic-ai/claude-agent-sdk` instead.
- **All-in-one prompt:** Trying to discover, classify, and extract in a single pass produces worse results and makes JSON schema harder to enforce. Use the multi-pass strategy.
- **Storing slug as derived-at-write:** The slug must ALWAYS be derived via `buildSlug(featureName)` at read time by consumers — never store a different slug value or manually compute it. This is the established pattern from Phase 1.
- **Absolute repo paths in feature map:** Feature map entries should use relative paths or identifiers only. Absolute paths break when different team members have repos in different locations.
- **`permissionMode: 'bypassPermissions'` without `allowDangerouslySkipPermissions: true`:** Both flags are required together. Setting only one causes a permission error.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Codebase understanding | Custom AST parser for RN navigation | `claude-agent-sdk` + Read/Grep/Glob tools | Claude handles React Navigation AND Expo Router; AST parsing breaks on non-standard patterns |
| Structured output from LLM | Regex/string parsing of Claude's text response | `outputFormat: { type: 'json_schema' }` | Native structured output enforces schema; string parsing is fragile across model versions |
| Git change detection | File hashing / mtime comparison | `git diff --name-only <sha> HEAD` | Git diff is authoritative; mtime changes on checkout; content hashing misses deletions |
| Subprocess spawning of `claude` | `child_process.spawn` with custom stdio | `@anthropic-ai/claude-agent-sdk` | SDK solves the macOS stdio hang bug and handles streaming JSON internally |
| Feature slug generation | Custom slugify implementation | `buildSlug()` from `src/paths/slugify.ts` | Already exists, tested, deterministic — don't duplicate |

**Key insight:** The entire value of this phase comes from delegating codebase understanding to Claude Code. The scanner's job is orchestration (invoke, validate, store) — not analysis.

---

## Common Pitfalls

### Pitfall 1: SDK `cwd` Option Must Be the Repo Root

**What goes wrong:** Claude Code can only access files within its working directory. If `cwd` is set to the sawyer-docs project root instead of the repo being scanned, Claude cannot read any mobile/dashboard/platform files.
**Why it happens:** `process.cwd()` is the default, which is the sawyer-docs CLI's working directory, not the target repo.
**How to avoid:** Always pass `cwd: repoPath` in options, where `repoPath` comes from `config.repos.mobile` (etc.), resolved to an absolute path.
**Warning signs:** Claude responds that it cannot find any files, or describes the sawyer-docs project structure instead of the target repo.

### Pitfall 2: `permissionMode: 'bypassPermissions'` Requires Both Flags

**What goes wrong:** Setting `permissionMode: 'bypassPermissions'` alone throws an error. The `allowDangerouslySkipPermissions: true` flag is also required.
**Why it happens:** The SDK enforces an explicit double opt-in for bypassing permissions.
**How to avoid:** Always set both together:
```typescript
options: {
  permissionMode: 'bypassPermissions',
  allowDangerouslySkipPermissions: true,
}
```
**Warning signs:** Runtime error: "allowDangerouslySkipPermissions must be true when using permissionMode: bypassPermissions".

### Pitfall 3: Feature Slugs Must Be Stable Across Runs

**What goes wrong:** If Claude returns different feature names (e.g., "Login Screen" vs "Login" vs "User Login") across runs, `buildSlug()` produces different slugs and the change detection system treats them as new features.
**Why it happens:** LLM output is not deterministic by default, and feature naming is ambiguous.
**How to avoid:** (a) The Pass 2/3 system prompts must instruct Claude to use canonical feature names. (b) Pass 3 structured output schema should require a `canonicalName` field. (c) The scan state stores the previous feature map — a merge step should match on slug before treating a feature as new.
**Warning signs:** Feature count grows on re-runs of unchanged code; articles are regenerated for features that haven't changed.

### Pitfall 4: `git diff` Fails on First Run (No Stored SHA)

**What goes wrong:** On first run, there is no stored SHA in `.sawyer-docs/scan-state.json`. Attempting to run `git diff <undefined> HEAD` throws a git error.
**Why it happens:** The state file doesn't exist yet.
**How to avoid:** Always check if a stored SHA exists before running git diff. If absent, treat as a full scan (all features are 'new'). After the scan, write the current SHA to state.
**Warning signs:** `git diff` exits with code 128 (invalid object name).

### Pitfall 5: Context Overflow in Non-Interactive Mode

**What goes wrong:** If the scanned repo is very large, a single-pass scan can exhaust Claude's context window. In non-interactive (SDK) mode, there is no recovery mechanism — the session simply fails with no partial result.
**Why it happens:** Large codebases produce large tool outputs that fill context rapidly.
**How to avoid:** Use `maxTurns` to limit each pass. Structure prompts to focus on specific directories (e.g., `src/screens/`, `src/pages/`). The multi-pass strategy naturally scopes each pass.
**Warning signs:** SDK throws a context limit error; scan terminates early with no output.

### Pitfall 6: `.sawyer-docs/` Directory Must Be Created Before Writing

**What goes wrong:** Writing `scan-state.json` to `.sawyer-docs/` before the directory exists throws `ENOENT`.
**Why it happens:** `node:fs.writeFileSync` does not create parent directories.
**How to avoid:** Use `fs.mkdirSync(sawyerDocsPath, { recursive: true })` before any write operations.
**Warning signs:** `ENOENT: no such file or directory` on first run.

---

## Code Examples

Verified patterns from official sources:

### Claude Agent SDK — Query with Structured Output

```typescript
// Source: https://platform.claude.com/docs/en/agent-sdk/typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

for await (const message of query({
  prompt: 'Identify all user-facing screens in this React Native codebase.',
  options: {
    cwd: '/path/to/mobile-repo',
    allowedTools: ['Read', 'Grep', 'Glob'],
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 15,
    outputFormat: {
      type: 'json_schema',
      schema: featureMapSchema,
    },
    systemPrompt: 'You are analyzing a mobile app codebase...',
  },
})) {
  if (message.type === 'result') {
    console.log(message.structured_output);
  }
}
```

### Git Change Detection — execAsync Pattern

```typescript
// Source: Node.js child_process docs (nodejs.org/api/child_process.html)
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

async function getCurrentSha(repoPath: string): Promise<string> {
  const { stdout } = await execAsync('git rev-parse HEAD', { cwd: repoPath });
  return stdout.trim();
}

async function hasChanges(repoPath: string, storedSha: string): Promise<boolean> {
  const current = await getCurrentSha(repoPath);
  return current !== storedSha;
}

async function getChangedFiles(repoPath: string, fromSha: string): Promise<string[]> {
  const { stdout } = await execAsync(
    `git diff --name-only ${fromSha} HEAD`,
    { cwd: repoPath }
  );
  return stdout.trim().split('\n').filter(Boolean);
}
```

### Feature Map Schema (Zod + JSON Schema)

```typescript
// Source: Project convention — matches Zod 4 patterns already in codebase
import { z } from 'zod';

const AdminRoleSchema = z.enum(['club_admin', 'company_admin', 'super_admin']);

const FeatureSchema = z.object({
  name: z.string(),           // canonical name used for slug generation
  slug: z.string(),           // buildSlug(name) — stable identifier
  featureArea: z.string(),    // maps to docs/ directory (e.g., 'authentication')
  sourceApp: z.enum(['mobile', 'dashboard', 'both']),
  audience: z.enum(['end_user', 'admin']),
  adminRoles: z.array(AdminRoleSchema).optional(),  // only for admin features
  description: z.string(),    // brief feature description for article generation
  apiContext: z.string().optional(),  // from platform scan
});

const FeatureMapSchema = z.object({
  generatedAt: z.string(),    // ISO timestamp
  features: z.array(FeatureSchema),
});

export type Feature = z.infer<typeof FeatureSchema>;
export type FeatureMap = z.infer<typeof FeatureMapSchema>;
```

### Scan State Schema

```typescript
// Stored in .sawyer-docs/scan-state.json
const ScanStateSchema = z.object({
  mobile: z.object({ sha: z.string(), scannedAt: z.string() }).optional(),
  dashboard: z.object({ sha: z.string(), scannedAt: z.string() }).optional(),
  platform: z.object({ sha: z.string(), scannedAt: z.string() }).optional(),
});

export type ScanState = z.infer<typeof ScanStateSchema>;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual `child_process.spawn('claude', ['-p', ...])` | `@anthropic-ai/claude-agent-sdk` TypeScript package | Late 2024 / Early 2025 | SDK fixes stdio hang bug, adds structured output and streaming callbacks |
| `--output-format json` (text field only) | `outputFormat: { type: 'json_schema', schema: ... }` in SDK | 2025 | Enforces structured output shape natively; response in `structured_output` field |
| Claude Code SDK | Now called **Claude Agent SDK** (package renamed) | 2025 | Package is `@anthropic-ai/claude-agent-sdk`; old `@anthropic-ai/claude-code-sdk` name may still work but is deprecated |
| Headless mode (`-p` docs) | "Run Claude Code programmatically" (docs renamed) | 2025 | Same functionality; new term is "headless" via CLI, SDK gives richer control |

**Deprecated/outdated:**
- Manual `child_process.spawn` with `stdio: 'pipe'` for `claude` CLI: causes indefinite hang on macOS (confirmed in multiple GitHub issues). Use the SDK package instead.
- `@anthropic-ai/claude-code-sdk` package name: rebranded to `@anthropic-ai/claude-agent-sdk`. Do not install the old package name.

---

## Open Questions

1. **Zod version compatibility with `tool()` function**
   - What we know: The SDK's `tool()` helper supports "Zod 3 and Zod 4" per docs. The project already uses Zod 4 (`^4.3.6`).
   - What's unclear: Whether Zod 4 z-to-JSON-schema derivation for `outputFormat` is automatic or requires a conversion step.
   - Recommendation: Test the `outputFormat` JSON schema by hand-writing the JSON Schema object (not from Zod's `toJsonSchema()`). If Zod 4 has a built-in `.toJsonSchema()` method, use it; otherwise inline the schema as a plain object.

2. **React Native navigation library in mobile repo**
   - What we know: STATE.md flags this as a known concern (React Navigation vs Expo Router changes what Claude needs to look for).
   - What's unclear: Which library the mobile repo uses — confirmed open question from project state.
   - Recommendation: The multi-pass scanning approach handles this — Pass 1 prompt should instruct Claude to detect and report the navigation library used, then Pass 3 adjusts accordingly. The prompt template (Claude's discretion) should anticipate both patterns.

3. **SDK version to install**
   - What we know: Version ~v0.2.x is current; v0.1.58 also referenced. Active rapid development means patch versions change often.
   - What's unclear: Whether a specific minimum version is required for `outputFormat: { type: 'json_schema' }`.
   - Recommendation: Install `@anthropic-ai/claude-agent-sdk` without a pinned version on first install, capture the resolved version, then pin it in package.json. Verify `outputFormat` is available.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCAN-05 | Feature map Zod schema parses valid feature map JSON | unit | `npm test -- --reporter=verbose tests/scanner.test.ts` | ❌ Wave 0 |
| SCAN-05 | Feature map schema rejects invalid entries (missing required fields) | unit | `npm test -- tests/scanner.test.ts` | ❌ Wave 0 |
| SCAN-06 | Same feature name always produces the same slug (idempotency) | unit | `npm test -- tests/scanner.test.ts` | ❌ Wave 0 (reuses `buildSlug` already tested) |
| SCAN-07 | `getChangedFiles` returns empty array when SHA is unchanged | unit | `npm test -- tests/change-detection.test.ts` | ❌ Wave 0 |
| SCAN-07 | `getChangedFiles` returns file list when SHA has changed | unit | `npm test -- tests/change-detection.test.ts` | ❌ Wave 0 |
| SCAN-07 | Scan state is written and read correctly as JSON | unit | `npm test -- tests/scan-state.test.ts` | ❌ Wave 0 |
| SCAN-01/02/03 | Claude Agent SDK invocation is integration-tested | manual-only | N/A — requires live `claude` CLI and real repos | — |
| SCAN-04 | Classification exclusion logic | manual-only | N/A — requires Claude inference | — |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/scanner.test.ts` — covers SCAN-05 (schema validation), SCAN-06 (slug stability)
- [ ] `tests/change-detection.test.ts` — covers SCAN-07 (git diff logic, SHA comparison)
- [ ] `tests/scan-state.test.ts` — covers SCAN-07 (state read/write, first-run handling, `.sawyer-docs/` creation)

---

## Sources

### Primary (HIGH confidence)
- `platform.claude.com/docs/en/agent-sdk/typescript` — Full TypeScript API reference for `query()`, `Options` type, `outputFormat`, `permissionMode`, `cwd`
- `code.claude.com/docs/en/headless` — CLI flags for non-interactive mode, session continuity patterns
- `nodejs.org/api/child_process.html` — `exec`, `spawn`, `promisify` patterns for git subprocess calls
- `git-scm.com/docs/git-diff` — `--name-only` flag documentation for change detection

### Secondary (MEDIUM confidence)
- `github.com/anthropics/claude-code/issues/771` — Confirmed macOS stdio hang bug with manual spawn; workaround is `stdio: ["inherit", "pipe", "pipe"]` or use SDK
- `npmjs.com` search results — `@anthropic-ai/claude-agent-sdk` package name, current version range ~v0.2.x, Node 18+ requirement
- `claudelog.com/faqs/what-is-print-flag-in-claude-code/` — Confirmed `-p`/`--print` non-interactive behavior

### Tertiary (LOW confidence)
- Various community sources confirming ~12s SDK startup overhead per `query()` call — flagged as known performance characteristic, not a blocker for batch scanning

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — SDK confirmed via official docs; Zod and `child_process` are stable Node/project standards
- Architecture (multi-pass, cwd, structured output): HIGH — derived from official API reference
- Git change detection: HIGH — standard git commands, well-documented
- Pitfalls: HIGH for SDK-specific ones (confirmed via GitHub issues); MEDIUM for slug stability (LLM non-determinism is inherent)
- Prompt templates: LOW — intentionally left to Claude's discretion; no research done per CONTEXT.md

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (SDK actively developed; recheck version before install)
