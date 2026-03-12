---
phase: 04-translation-pipeline
plan: "02"
subsystem: translation
tags: [deepl-node, commander, hash-gating, dry-run, esm, cli]

# Dependency graph
requires:
  - phase: 04-translation-pipeline/04-01
    provides: computeHash, checkGating, parseFrontmatter, buildTranslatedFrontmatter, createDeepLClient, translateArticle, formatDeepLError, readGermanArticle, writeTranslatedArticle via src/translator/index.ts
  - phase: 03-article-generation
    provides: German .md articles in docs/de/ with title/language frontmatter
provides:
  - Fully functional `sawyer-docs translate` command with --features, --languages, --dry-run, --force flags
  - Hash-gated translation loop that skips unchanged files and warns on manually edited translations
  - --dry-run mode previewing jobs and estimating DeepL character count without API calls
  - Per-job spinner progress display with translated/skipped/failed end-of-run summary
  - process.exit(1) on any DeepL failures for CI-safe operation
affects: [05-docs-publishing, any CI/CD pipeline consuming translated docs]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - translate command mirrors generate command structure exactly — outer feature loop, inner language loop, same error isolation pattern
    - DeepL client created once before loop (not per-job) — single connection reused across all translations
    - --languages validation: parse comma-separated, validate against SUPPORTED_LANGS, intersect with config.languages
    - Dry-run accumulates character estimates from parsed body lengths before any API call
    - buildArticlePath(lang, featureArea, slug) + resolve(cwd, ...) for absolute target path in gating check

key-files:
  created: []
  modified:
    - src/commands/translate.ts — full translate command implementation replacing stub (158 lines)

key-decisions:
  - "translate command creates DeepL client once before the loop — avoids per-job connection overhead"
  - "config.languages filtered to exclude 'de' before intersecting with --languages flag — German is never a translation target"
  - "Human end-to-end verification confirmed: files landed in docs/en/, docs/nl/, docs/tr/, docs/uk/ with correct source_hash frontmatter"

patterns-established:
  - "Translate outer loop = features, inner loop = languages — sequential both axes, same as generate"
  - "Gating check uses absolute path (resolve(cwd, buildArticlePath(...))) to avoid CWD sensitivity"
  - "--dry-run path exits before client creation — no API key required for dry run"

requirements-completed: [TRANS-01, TRANS-02, TRANS-03, TRANS-04, CLI-05]

# Metrics
duration: 7min
completed: 2026-03-12
---

# Phase 4 Plan 02: Translate Command Summary

**Commander.js translate command wiring all translator module building blocks into a single CLI command with hash gating, --dry-run preview, --force override, and human-verified end-to-end DeepL translation to docs/en/, docs/nl/, docs/tr/, docs/uk/**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-12T22:08:11+0100
- **Completed:** 2026-03-12T22:14:11+0100
- **Tasks:** 2 (1 auto + 1 human-verify)
- **Files modified:** 1

## Accomplishments

- `sawyer-docs translate` command fully functional with all 4 flags: --features, --languages, --dry-run, --force
- End-to-end translation verified by human: German articles in docs/de/ translated to docs/en/, docs/nl/, docs/tr/, docs/uk/ with correct source_hash frontmatter
- Hash gating confirmed working: re-run skips already-translated files; manual edit detection warns and blocks overwrite; --force override works

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement translate command replacing stub** - `d02460b` (feat)
2. **Task 2: Verify end-to-end translation pipeline** - `703b103` (human-verified — test translations commit)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/commands/translate.ts` — Full translate command implementation (158 lines): replaces 4-line stub with complete DeepL translation loop, hash gating, dry-run preview, --features/--languages/--force flags, per-job spinner progress, end-of-run summary

## Decisions Made

- **DeepL client created once before loop:** Avoids per-job connection overhead; single `createDeepLClient(config.deepl_api_key)` call reused across all feature×language jobs
- **German excluded from target languages at source:** `config.languages.filter(lang => lang !== 'de')` applied before --languages intersection — German is never a translation target regardless of config
- **Dry-run requires no API key:** The --dry-run path exits before `createDeepLClient()` is called, so character estimation works even without a DeepL key in .env

## Deviations from Plan

None — plan executed exactly as written. Task 1 implementation followed the spec precisely; Task 2 human verification approved the end-to-end pipeline.

## Issues Encountered

None.

## User Setup Required

None — DeepL API key must be present in .env as `DEEPL_API_KEY`. This was already established as a prerequisite. No new external configuration added in this plan.

## Next Phase Readiness

- Translation pipeline is complete — `sawyer-docs generate` produces German articles, `sawyer-docs translate` delivers them to all configured language directories
- Phase 5 (docs publishing) can now consume the per-language docs/ directories
- No blockers

## Self-Check: PASSED

- src/commands/translate.ts: FOUND
- Task 1 commit d02460b: FOUND in git log
- Task 2 commit 703b103: FOUND in git log (human test translations)
- docs/en/authentication/sign-in.md: FOUND (human verification output)
- docs/nl/authentication/sign-in.md: FOUND
- docs/tr/authentication/sign-in.md: FOUND
- docs/uk/authentication/sign-in.md: FOUND

---
*Phase: 04-translation-pipeline*
*Completed: 2026-03-12*
