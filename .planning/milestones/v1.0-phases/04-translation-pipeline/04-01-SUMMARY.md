---
phase: 04-translation-pipeline
plan: "01"
subsystem: translation
tags: [deepl-node, sha256, frontmatter, tdd, vitest, esm]

# Dependency graph
requires:
  - phase: 03-article-generation
    provides: German .md articles in docs/de/ with title/language frontmatter; buildArticlePath() and SupportedLang type from paths module
provides:
  - SHA-256 content hashing with computeHash() and 5-scenario hash gating with checkGating()
  - YAML frontmatter round-trip: parseFrontmatter() extracts title/language/sourceHash/body; buildTranslatedFrontmatter() produces source_hash frontmatter
  - DeepL API wrapper: createDeepLClient(), translateArticle() with lang mapping (en->en-US, nl, tr, uk), formatDeepLError() with actionable messages
  - File I/O: readGermanArticle() returns null for missing files; writeTranslatedArticle() writes to docs/{lang}/{area}/{slug}.md
  - Barrel export via src/translator/index.ts
affects: [04-02-translate-command, any future phase consuming translation state]

# Tech tracking
tech-stack:
  added:
    - deepl-node ^1.24.0 — official DeepL SDK; DeepLClient class, translateText(), typed error classes
  patterns:
    - Hash gating: computeHash(germanContent) stored as source_hash in translated frontmatter; checkGating() reads back on re-run
    - Frontmatter round-trip via regex split on --- delimiters (no external YAML library)
    - DeepL lang map: project short codes (en/nl/tr/uk) -> SDK TargetLanguageCode (en-US/nl/tr/uk)
    - formatDeepLError(): instanceof checks for AuthorizationError, QuotaExceededError, TooManyRequestsError
    - prefer_less formality (soft fallback) — never prefer_more or hard less/more
    - ESM .js import extensions throughout src/translator/

key-files:
  created:
    - src/translator/hash.ts — computeHash(), checkGating(), GatingResult type
    - src/translator/frontmatter.ts — parseFrontmatter(), buildTranslatedFrontmatter(), ParsedArticle interface
    - src/translator/client.ts — createDeepLClient(), translateArticle(), formatDeepLError(), DEEPL_LANG_MAP
    - src/translator/writer.ts — readGermanArticle(), writeTranslatedArticle()
    - src/translator/index.ts — barrel export
    - tests/translator-hash.test.ts — 8 tests: computeHash and all 5 checkGating scenarios
    - tests/translator-frontmatter.test.ts — 6 tests: parse/build round-trip and edge cases
    - tests/translator-client.test.ts — 10 tests: lang mapping, translateText call shape, error mapping
    - tests/translator-writer.test.ts — 6 tests: read German article, write per-language file
  modified:
    - package.json — added deepl-node dependency
    - package-lock.json — updated lock file

key-decisions:
  - "TargetLanguageCode uses lowercase hyphenated format (en-US not EN-US) — confirmed from node_modules/deepl-node/dist/types.d.ts"
  - "DeepLClient mock uses class syntax in vi.mock() factory — arrow function is not a constructor and cannot be called with new"
  - "checkGating() catches frontmatter parse errors and returns translate action — defensive against malformed files"

patterns-established:
  - "Hash gating pattern: computeHash(content) -> checkGating(absPath, hash, force) -> GatingResult action"
  - "Frontmatter round-trip: buildTranslatedFrontmatter(title, lang, hash) + body -> parseFrontmatter() recovers all fields"
  - "DeepL error formatting: instanceof chain over typed SDK error classes -> user-facing message with file path"

requirements-completed: [TRANS-01, TRANS-02, TRANS-03, TRANS-04, CLI-05]

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 4 Plan 01: Translator Module Summary

**deepl-node SDK wrapper with SHA-256 hash gating, frontmatter round-trip, and 30 TDD unit tests covering all 5 gating scenarios, language mappings, and error formatting**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T21:00:58Z
- **Completed:** 2026-03-12T21:04:33Z
- **Tasks:** 1
- **Files modified:** 11

## Accomplishments

- Translator module with 5 files (hash.ts, frontmatter.ts, client.ts, writer.ts, index.ts) covering all core translation building blocks
- 30 new unit tests across 4 test files — all green; full suite passes (127/127 tests)
- deepl-node installed with correct TargetLanguageCode casing verified from TypeScript types

## Task Commits

Each task was committed atomically:

1. **Task 1: Install deepl-node and create translator module with TDD** - `9407927` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/translator/hash.ts` — computeHash() SHA-256 via node:crypto, checkGating() 5-scenario gating logic
- `src/translator/frontmatter.ts` — parseFrontmatter() regex-based YAML split, buildTranslatedFrontmatter() with quote escaping
- `src/translator/client.ts` — createDeepLClient(), translateArticle() with DEEPL_LANG_MAP, formatDeepLError() with typed error classes
- `src/translator/writer.ts` — readGermanArticle() null-safe, writeTranslatedArticle() mkdirSync recursive
- `src/translator/index.ts` — barrel export for all four modules
- `tests/translator-hash.test.ts` — computeHash determinism and 5 checkGating scenarios
- `tests/translator-frontmatter.test.ts` — parse/build round-trip, quote escaping, throw on invalid
- `tests/translator-client.test.ts` — lang mapping, translateText call shape, 3 error class scenarios
- `tests/translator-writer.test.ts` — read existing/missing German file, write creates dirs, returns relative path
- `package.json` / `package-lock.json` — deepl-node dependency added

## Decisions Made

- **TargetLanguageCode casing:** Research doc referenced `EN-US` but the actual SDK TypeScript types use `en-US` (lowercase with hyphen). Verified from `node_modules/deepl-node/dist/types.d.ts` before writing any code.
- **DeepLClient mock:** `vi.fn().mockImplementation(() => ({...}))` produces a non-constructor arrow function that cannot be called with `new`. Fixed by declaring a full `class DeepLClient` inside the `vi.mock()` factory.
- **checkGating() defensive parsing:** Wrapped `parseFrontmatter()` call in try/catch — malformed translated files (corrupted, missing delimiters) return `translate` action rather than throwing, matching the "treat as untracked" design intent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] DeepLClient mock arrow function not callable as constructor**
- **Found during:** Task 1 (GREEN phase, translator-client tests)
- **Issue:** `vi.fn().mockImplementation(() => ({translateText: mockFn}))` creates an arrow function; calling it with `new deepl.DeepLClient()` throws "is not a constructor"
- **Fix:** Replaced `vi.fn().mockImplementation(...)` with a `class DeepLClient` declaration inside the `vi.mock()` factory
- **Files modified:** tests/translator-client.test.ts
- **Verification:** All 10 client tests pass
- **Committed in:** 9407927 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Mock pattern fix was necessary for test correctness. No scope creep.

## Issues Encountered

- Research doc stated DeepL language codes as `EN-US`, `NL`, `TR`, `UK` (uppercase). Actual SDK `TargetLanguageCode` type uses `en-US`, `nl`, `tr`, `uk` (lowercase). Caught before writing source code by inspecting `node_modules/deepl-node/dist/types.d.ts`.

## User Setup Required

None — no external service configuration required in this plan. DeepL API key validation is handled in plan 02 (translate command) when `loadConfig()` is called.

## Next Phase Readiness

- Translator module is fully tested and ready for plan 02 (translate command wiring)
- Plan 02 will import from `src/translator/index.js` and wire these building blocks into the Commander.js `translate` command
- No blockers

## Self-Check: PASSED

- src/translator/hash.ts: FOUND
- src/translator/frontmatter.ts: FOUND
- src/translator/client.ts: FOUND
- src/translator/writer.ts: FOUND
- src/translator/index.ts: FOUND
- tests/translator-hash.test.ts: FOUND
- tests/translator-frontmatter.test.ts: FOUND
- tests/translator-client.test.ts: FOUND
- tests/translator-writer.test.ts: FOUND
- .planning/phases/04-translation-pipeline/04-01-SUMMARY.md: FOUND
- Task commit 9407927: FOUND in git log

---
*Phase: 04-translation-pipeline*
*Completed: 2026-03-12*
