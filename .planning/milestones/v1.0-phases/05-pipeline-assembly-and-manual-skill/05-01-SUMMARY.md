---
phase: 05-pipeline-assembly-and-manual-skill
plan: 01
subsystem: cli
tags: [commander, pipeline, scan, generate, translate, change-detection, dry-run]

requires:
  - phase: 04-translation-pipeline
    provides: "translateArticle, createDeepLClient, checkGating, parseFrontmatter, computeHash from translator/index.js"
  - phase: 03-article-generation
    provides: "runGeneration, writeArticle from generator/index.js"
  - phase: 02-codebase-scanner
    provides: "readScanState, writeScanState, needsScan, mergeFeatureMaps, readFeatureMap, writeFeatureMap from scanner/index.js"
provides:
  - "sawyer-docs run command: full pipeline orchestration (scan -> generate -> translate)"
  - "deriveSlugsFromChangedRepos: pure helper for change detection per sourceApp"
  - "findMissingArticles: pure helper detecting features with no German article on disk"
affects: [05-pipeline-assembly-and-manual-skill]

tech-stack:
  added: []
  patterns:
    - "Change detection via SHA comparison of newState vs existingState per repo"
    - "Selective generation: union of changedSlugs and missingSlugs feeds generate stage"
    - "Translate stage gated to generatedSlugs only — not all features"
    - "Dry-run: scan runs normally (uses Claude), generate and translate stages are previewed only"

key-files:
  created:
    - src/commands/run.ts
    - tests/run-command.test.ts
  modified:
    - src/bin/cli.ts

key-decisions:
  - "deriveSlugsFromChangedRepos uses Set<string> return type — callers union/intersect as needed"
  - "findMissingArticles checks resolved absolute path via existsSync — consistent with scan state persistence"
  - "Translate stage uses generatedSlugs (not changedSlugs) — only freshly generated articles get translated"
  - "Dry-run explicitly states scan used Claude API before previewing generate/translate — implements CLI-04 requirement"
  - "No-changes path: if changedRepos is empty, check for missing articles; only exit early if both conditions are false"

patterns-established:
  - "Pipeline commands copy scan logic inline — no shell-out to sub-commands"
  - "Per-feature error isolation with failed counter and process.exit(1) at end of full loop"

requirements-completed: [CLI-01, CLI-04]

duration: 3min
completed: 2026-03-12
---

# Phase 5 Plan 01: Pipeline Assembly Summary

**`sawyer-docs run` command orchestrating scan -> generate -> translate with change detection, selective regeneration, and dry-run preview of generate/translate stages without API calls**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T22:04:31Z
- **Completed:** 2026-03-12T22:07:35Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `sawyer-docs run` command wires all three pipeline stages into a single developer workflow
- Change detection via SHA comparison narrows generation to only affected features; `sourceApp: 'both'` correctly triggers on either repo
- Translate stage restricted to `generatedSlugs` so unchanged articles never incur unnecessary DeepL charges
- Dry-run mode runs scan (Claude API required for discovery/classification) then previews generate list and estimated DeepL character cost

## Task Commits

Each task was committed atomically:

1. **Task 1: Unit tests and helper function deriveSlugsFromChangedRepos** - `56a0e7c` (feat)
2. **Task 2: Implement run command and wire into CLI** - `10564ce` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/commands/run.ts` - Full pipeline orchestration command plus exported helpers `deriveSlugsFromChangedRepos` and `findMissingArticles`
- `tests/run-command.test.ts` - 15 unit tests covering all sourceApp combinations and missing-article detection
- `src/bin/cli.ts` - Added runCommand import and `program.addCommand(runCommand)`

## Decisions Made

- Translate stage uses `generatedSlugs` not `changedSlugs` — only translate articles that were freshly generated in this run
- Dry-run explicitly notifies developer that scan used Claude API before previewing remaining stages (CLI-04)
- No-changes early exit also checks for missing articles — ensures no silent skip when articles were deleted

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `sawyer-docs run` command is complete and all tests pass (157 total)
- TypeScript compiles cleanly with no errors
- Phase 5 plan 02 (manual skill for `sawyer-docs article new`) can proceed independently

---
*Phase: 05-pipeline-assembly-and-manual-skill*
*Completed: 2026-03-12*
