---
phase: 02-codebase-scanner
plan: 01
subsystem: scanner
tags: [zod, scanner, feature-map, git, change-detection, scan-state]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: buildSlug from src/paths/slugify.ts, Zod schemas pattern, ESM conventions
provides:
  - FeatureSchema, FeatureMapSchema, ScanStateSchema with inferred TypeScript types
  - readScanState/writeScanState for .sawyer-docs/scan-state.json persistence
  - readFeatureMap/writeFeatureMap for .sawyer-docs/feature-map.json persistence
  - getCurrentSha, getChangedFiles, needsScan for git-based change detection
  - Barrel export via src/scanner/index.ts
affects: [02-02, 02-03, 03-article-generation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Zod safeParse pattern for all schema validation (never raw ZodError)
    - ESM .js extensions on all imports within scanner module
    - TDD RED-GREEN workflow for scanner module development
    - execAsync (promisify(exec)) for git subprocess calls
    - mkdirSync recursive for .sawyer-docs/ directory creation

key-files:
  created:
    - src/scanner/schema.ts
    - src/scanner/state.ts
    - src/scanner/change-detection.ts
    - src/scanner/index.ts
    - tests/scanner-schema.test.ts
    - tests/scan-state.test.ts
    - tests/change-detection.test.ts
  modified: []

key-decisions:
  - "getChangedFiles returns empty array for empty storedSha — caller is responsible for triggering full scan, not this function"
  - "needsScan returns empty changedFiles on first run (no storedSha) — full scan is caller's concern, not file listing"
  - "SAWYER_DOCS_DIR exported as named constant so consumers can reference path without magic strings"

patterns-established:
  - "Pattern 1: All .sawyer-docs/ writes use mkdirSync({ recursive: true }) before writeFileSync to avoid ENOENT on first run"
  - "Pattern 2: State read functions return empty/null on missing files, never throw — graceful first-run handling"
  - "Pattern 3: git subprocess calls use execAsync(promisify(exec)) with cwd option, never process.cwd()"

requirements-completed: [SCAN-05, SCAN-06, SCAN-07]

# Metrics
duration: 8min
completed: 2026-03-12
---

# Phase 2 Plan 01: Scanner Schemas, State Persistence, and Git Change Detection Summary

**Zod-validated FeatureMap/ScanState schemas, .sawyer-docs/ state persistence (read/write round-trip), and git diff-based change detection via execAsync — all with 43 new tests green (74 total)**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-12T17:11:16Z
- **Completed:** 2026-03-12T17:14:30Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Zod schemas for Feature, FeatureMap, and ScanState with strict validation of audience, adminRoles, sourceApp enums
- readScanState/writeScanState with graceful first-run handling (missing file returns empty state), recursive directory creation, 2-space JSON indentation
- getCurrentSha, getChangedFiles, needsScan git change detection covering unchanged/changed/first-run scenarios
- Barrel export in src/scanner/index.ts covering all three modules
- 43 new tests (32 schema+state, 11 change-detection) all green; 31 prior tests untouched

## Task Commits

Each task was committed atomically using TDD (RED then GREEN commits):

1. **Task 1: Scanner schemas and scan state — RED** - `a396151` (test)
2. **Task 1: Scanner schemas and scan state — GREEN** - `cec1cd7` (feat)
3. **Task 2: Git change detection — RED** - `5337cc1` (test)
4. **Task 2: Git change detection — GREEN** - `ba03577` (feat)

_TDD tasks have RED (failing test) and GREEN (implementation) commits_

## Files Created/Modified
- `src/scanner/schema.ts` - AdminRoleSchema, FeatureSchema, FeatureMapSchema, ScanStateSchema with inferred types
- `src/scanner/state.ts` - readScanState, writeScanState, readFeatureMap, writeFeatureMap + SAWYER_DOCS_DIR constant
- `src/scanner/change-detection.ts` - getCurrentSha, getChangedFiles, needsScan via execAsync git commands
- `src/scanner/index.ts` - Barrel export for all scanner module public API
- `tests/scanner-schema.test.ts` - 24 tests covering FeatureSchema, FeatureMapSchema, ScanStateSchema, buildSlug idempotency
- `tests/scan-state.test.ts` - 8 tests covering readScanState/writeScanState round-trip and SAWYER_DOCS_DIR constant
- `tests/change-detection.test.ts` - 11 tests covering getCurrentSha, getChangedFiles, needsScan

## Decisions Made
- `getChangedFiles` returns empty array for empty storedSha (not an error) — caller handles full scan logic
- `needsScan` returns empty changedFiles on first run — full scan scope is caller's responsibility
- `SAWYER_DOCS_DIR` exported as named constant so Plan 02 consumers don't hardcode the string

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All foundational scanner types and utilities ready for Plan 02 (Claude Agent SDK scanning)
- src/scanner/index.ts barrel export provides clean import surface for orchestrator
- .sawyer-docs/ state persistence tested and verified; Plan 02 can call readScanState/writeScanState directly
- Change detection tested against the actual git repo; Plan 02 passes repo paths from config.repos.*

---
*Phase: 02-codebase-scanner*
*Completed: 2026-03-12*
