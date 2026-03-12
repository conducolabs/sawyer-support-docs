# Phase 2: Codebase Scanner - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Claude Code-powered feature detection from all three codebases. CLI invokes Claude Code to analyze local repo clones and produce a structured JSON feature map of user-facing screens and flows. Change detection identifies what's new or modified. No article generation or translation — just scanning and mapping.

</domain>

<decisions>
## Implementation Decisions

### Claude Code invocation
- Invoke via `claude` CLI subprocess (spawn child process, capture stdout)
- Multi-pass scanning strategy: Pass 1 identifies screens/routes, Pass 2 classifies user-facing vs infrastructure, Pass 3 extracts feature details
- Streaming output — developer sees what Claude Code is finding in real-time
- Sequential scanning — one repo at a time (mobile, dashboard, platform in order)

### Feature map schema
- Features grouped by feature area (matches `docs/` directory structure from Phase 1)
- Each feature entry includes: feature name, slug (via `buildSlug`), source app identifier (mobile/dashboard/both), audience classification (end_user/admin with role levels), and related API context from platform scan
- Dashboard features distinguish admin role levels (club admin, company admin, super admin) — enables role-specific articles in Phase 3
- Feature map stored in `.sawyer-docs/` directory (hidden, keeps project root clean)
- Single vs per-repo file split: Claude's discretion

### Change detection
- Git diff against stored commit hash per repo — store last-scanned commit SHA, diff on next run to find changed files
- First run: full scan of all repos, save everything, all features marked as 'new'
- State files (commit hashes, previous feature map) committed to git — team members share scan state
- Diff summary display: Claude's discretion based on verbosity level

### Scan scope and filtering
- Mixed granularity — Claude Code uses judgment per case (some features are single screens, others are multi-screen flows)
- Infrastructure exclusions: navigation/routing structures, loading/error states, auth guards/wrappers, dev/debug screens
- Platform API scan produces context that feeds into feature entries — Claude decides whether inline or separate file

### Claude's Discretion
- Exact prompt templates for each scanning pass
- Single merged feature map vs per-repo files
- API context inline on features vs separate file
- Diff summary display based on verbosity flags
- Error handling and retry logic for Claude Code subprocess

</decisions>

<specifics>
## Specific Ideas

- Multi-pass scanning gives better classification than trying to do everything in one prompt — first find, then classify, then detail
- Streaming output keeps the developer informed during what could be a long-running scan
- `.sawyer-docs/` as the hidden state directory mirrors patterns like `.next/` or `.turbo/`
- State in git means a new team member cloning the repo gets the scan baseline — they don't have to do a full initial scan

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/config/loader.ts` — `loadConfig()` provides repo paths and validated config
- `src/paths/slugify.ts` — `buildSlug()` generates deterministic feature slugs
- `src/ui/logger.ts` — `createLogger()` for spinner/info/warn/error/success output
- `src/commands/scan.ts` — stub command, ready to be implemented

### Established Patterns
- ESM-only TypeScript with `.js` import extensions
- Zod for schema validation (can be used for feature map schema)
- Commander.js subcommand pattern (scan command already registered)
- Config + .env overlay pattern

### Integration Points
- `src/commands/scan.ts` is the entry point — receives repo path overrides from CLI flags
- Config `repos.mobile`, `repos.dashboard`, `repos.platform` provide default paths
- Feature map output will be consumed by the generator in Phase 3
- `.sawyer-docs/` directory needs to be created and potentially added to the repo

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-codebase-scanner*
*Context gathered: 2026-03-12*
