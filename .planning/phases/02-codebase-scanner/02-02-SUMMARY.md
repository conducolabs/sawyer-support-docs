---
phase: 02-codebase-scanner
plan: 02
subsystem: scanner
tags: [claude-agent-sdk, scanner, multi-pass, prompts, feature-map, streaming]

# Dependency graph
requires:
  - phase: 02-codebase-scanner
    plan: 01
    provides: FeatureSchema, FeatureMapSchema, ScanStateSchema, readScanState, writeScanState, readFeatureMap, writeFeatureMap, needsScan, SAWYER_DOCS_DIR
  - phase: 01-foundation
    provides: buildSlug from src/paths/slugify.ts, createLogger from src/ui/logger.ts, loadConfig from src/config/loader.ts
provides:
  - SYSTEM_PROMPT, PASS1_PROMPT, PASS2_PROMPT(), PASS3_PROMPT(), PLATFORM_PROMPT in src/scanner/prompts.ts
  - runDiscoveryPass, runClassificationPass, runExtractionPass, runPlatformPass in src/scanner/passes.ts
  - mergeFeatureMaps in src/scanner/merge.ts
  - Full scan command orchestration in src/commands/scan.ts
  - Working `sawyer-docs scan` command with change detection, multi-pass scanning, merge, and state persistence
affects: [02-03, 03-article-generation]

# Tech tracking
tech-stack:
  added:
    - "@anthropic-ai/claude-agent-sdk (latest ~0.2.x) — programmatic Claude Code invocation with structured output"
  patterns:
    - "Multi-pass scanning: Pass 1 discovery, Pass 2 classification, Pass 3 extraction via query() with cwd set to each repo"
    - "Both permissionMode: 'bypassPermissions' AND allowDangerouslySkipPermissions: true required together (SDK double opt-in)"
    - "Hand-written JSON Schema for outputFormat (not derived from Zod) — per RESEARCH.md open question resolution"
    - "SDKResultSuccess vs SDKResultError type narrowing via message.subtype === 'success' before accessing message.result"
    - "Per-repo error isolation: each repo scan wrapped in try/catch, failures logged but pipeline continues"
    - "existsSync pre-check before each repo scan with graceful skip and warning"

key-files:
  created:
    - src/scanner/prompts.ts
    - src/scanner/passes.ts
    - src/scanner/merge.ts
  modified:
    - src/scanner/index.ts
    - src/commands/scan.ts
    - package.json

key-decisions:
  - "Hand-wrote JSON Schema for outputFormat rather than deriving from Zod — avoids Zod 4 toJsonSchema() compatibility uncertainty"
  - "SDKResultMessage union requires subtype === 'success' narrowing to access result/structured_output fields — SDKResultError has neither"
  - "mergeFeatureMaps gives 'end_user' audience priority in combined (mobile+dashboard) features — broader audience wins"
  - "Claude CLI auth check at startup (execSync claude --version) with clear error message before any network calls"

patterns-established:
  - "Pattern 1: All SDK query() calls must set both permissionMode: 'bypassPermissions' AND allowDangerouslySkipPermissions: true"
  - "Pattern 2: Always resolve repo paths with path.resolve() before passing as cwd to query() — absolute paths required"
  - "Pattern 3: SDKResultMessage union — always narrow with message.subtype === 'success' before accessing result fields"
  - "Pattern 4: existsSync pre-check before repo scan with graceful skip — repo paths are user-configured and may not exist"

requirements-completed: [SCAN-01, SCAN-02, SCAN-03, SCAN-04]

# Metrics
duration: 4min
completed: 2026-03-12
---

# Phase 2 Plan 02: Claude Agent SDK Scanning Pipeline Summary

**Three-pass Claude Agent SDK scanning pipeline with prompt templates, structured JSON extraction, feature map merging, and full scan command orchestration wired to change detection and state persistence**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-12T16:16:52Z
- **Completed:** 2026-03-12T16:20:57Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Installed `@anthropic-ai/claude-agent-sdk` and created three-pass prompt templates (discovery, classification, extraction) plus a platform context pass
- Implemented `passes.ts` with SDK query() invocations — correct `cwd`, `permissionMode`+`allowDangerouslySkipPermissions` double opt-in, streaming for Passes 1/2, structured JSON output for Pass 3
- Created `merge.ts` merging mobile + dashboard features by slug (combined features get sourceApp 'both') with platform context attached
- Wired full scan command: change detection per repo, sequential multi-pass scanning, smart merge against existing feature map, new/updated/unchanged count summary

## Task Commits

Each task was committed atomically:

1. **Task 1: Install SDK, create prompt templates and scan pass functions** - `ec05efb` (feat)
2. **Task 2: Wire scan command with full pipeline orchestration** - `2de147d` (feat)

**Plan metadata:** (to be added by final commit)

## Files Created/Modified
- `src/scanner/prompts.ts` - SYSTEM_PROMPT, PASS1_PROMPT, PASS2_PROMPT(), PASS3_PROMPT(), PLATFORM_PROMPT constants
- `src/scanner/passes.ts` - runDiscoveryPass, runClassificationPass, runExtractionPass, runPlatformPass with SDK invocation
- `src/scanner/merge.ts` - mergeFeatureMaps combining mobile/dashboard features by slug with platformContext
- `src/scanner/index.ts` - Updated barrel export including new passes and merge modules
- `src/commands/scan.ts` - Full scan pipeline replacing stub: change detection, multi-pass scanning, merge, state persistence
- `package.json` - Added @anthropic-ai/claude-agent-sdk dependency

## Decisions Made
- Hand-wrote JSON Schema for `outputFormat` rather than deriving from Zod — per RESEARCH.md open question, avoids Zod 4 toJsonSchema() compatibility uncertainty
- `SDKResultMessage` is a union of `SDKResultSuccess | SDKResultError` — `result` field only exists on success subtype; must narrow with `message.subtype === 'success'` before accessing
- `mergeFeatureMaps` gives `end_user` audience priority when a feature appears in both mobile and dashboard — broader audience classification wins for combined entries
- Claude CLI auth check at scan startup via `execSync('claude --version')` with clear error message, before loading config or scanning

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed SDKResultMessage type narrowing**
- **Found during:** Task 1 (scan pass functions)
- **Issue:** TypeScript error — `result` property doesn't exist on `SDKResultError`, only on `SDKResultSuccess`; the `message.type === 'result'` check wasn't sufficient for type narrowing
- **Fix:** Added `message.subtype === 'success'` narrowing in all four pass functions before accessing `message.result` or `message.structured_output`
- **Files modified:** `src/scanner/passes.ts`
- **Verification:** `npx tsc --noEmit` clean
- **Committed in:** `ec05efb` (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed incorrect existsSync import**
- **Found during:** Task 2 (scan command)
- **Issue:** `existsSync` imported from `node:path` — it's in `node:fs`, causing immediate TypeScript error
- **Fix:** Moved `existsSync` import to `node:fs`
- **Files modified:** `src/commands/scan.ts`
- **Verification:** `npx tsc --noEmit` clean
- **Committed in:** `2de147d` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 type bug, 1 blocking import error)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## User Setup Required

The `sawyer-docs scan` command requires Claude CLI to be installed and authenticated:
- Install: follow instructions at https://claude.ai/download
- Authenticate: run `claude login`
- Verify: run `claude --version`

The scan command checks for Claude CLI at startup and shows a clear error if it's not available.

## Next Phase Readiness
- Scanning pipeline complete — `sawyer-docs scan` orchestrates full multi-pass Claude scanning per configured repo
- Feature map written to `.sawyer-docs/feature-map.json`, scan state to `.sawyer-docs/scan-state.json`
- Plan 03 (validation and testing) can use the scanner outputs to verify schema compliance and scan output quality
- SDK query() patterns and SDKResultMessage type narrowing patterns established for any future SDK usage in the project

---
*Phase: 02-codebase-scanner*
*Completed: 2026-03-12*
