---
phase: 05-pipeline-assembly-and-manual-skill
plan: "02"
subsystem: cli
tags: [skill, deepl, claude-code, article-generation, translation]

requires:
  - phase: 04-translation-pipeline
    provides: translateArticle, writeTranslatedArticle, parseFrontmatter, computeHash, buildTranslatedFrontmatter, createDeepLClient
  - phase: 03-article-generation
    provides: runGeneration, writeArticle, buildFrontmatter
  - phase: 01-foundation
    provides: buildSlug, buildArticlePath, loadConfig

provides:
  - Interactive /new-article Claude Code Skill for manual article creation
  - src/skill/new-article.ts with check-slug, generate, and write-and-translate subcommands
  - .claude/skills/new-article/SKILL.md with guided prompts and approval flow
  - 15 unit tests covering slug collision, feature construction, and translation orchestration

affects:
  - Any developer onboarding documentation referencing /new-article skill usage

tech-stack:
  added: []
  patterns:
    - "Claude Code Skill: SKILL.md at .claude/skills/new-article/ with disable-model-invocation and allowed-tools frontmatter"
    - "Standalone CLI helper: src/skill/new-article.ts exports testable functions and guards CLI entrypoint with import.meta.url check"
    - "Skill-article pattern: no scanner descriptions, empty description field, same docs tree as automated articles"

key-files:
  created:
    - src/skill/new-article.ts
    - .claude/skills/new-article/SKILL.md
    - tests/skill-new-article.test.ts
  modified: []

key-decisions:
  - "SKILL.md uses disable-model-invocation: true — explicit user invocation only, never auto-triggered"
  - "Manual articles are NOT added to feature-map.json — skill articles are one-off documents, not scanner output"
  - "buildFeatureFromArgs sets description to empty string — skill articles have no scanner descriptions"
  - "writeAndTranslate builds a minimal Feature struct with featureArea/slug from args — avoids coupling to scanner schema changes"

patterns-established:
  - "Skill helper scripts export testable functions alongside CLI entry guard pattern"
  - "Non-de language filter: config.languages.filter(lang => lang !== 'de') as standard skip pattern for German source"

requirements-completed: [SKILL-01, SKILL-02, SKILL-03, SKILL-04]

duration: 4min
completed: 2026-03-12
---

# Phase 05 Plan 02: New-Article Skill Summary

**Interactive /new-article Claude Code Skill with guided prompts, slug collision detection, German draft approval loop, and auto-translation to all configured languages via DeepL**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-12T22:04:47Z
- **Completed:** 2026-03-12T22:08:47Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Standalone `src/skill/new-article.ts` script with `check-slug`, `generate`, and `write-and-translate` subcommands — all three functions exported for testability
- `.claude/skills/new-article/SKILL.md` with step-by-step guided prompts covering all 4 SKILL requirements: structured questions (SKILL-01), clarifying questions for ambiguous topics (SKILL-02), German draft approval flow (SKILL-03), auto-translation on approval (SKILL-04)
- 15 unit tests covering slug collision detection, feature object construction, and full translation orchestration with mocked dependencies

## Task Commits

Each task was committed atomically:

1. **Task 1: Skill helper script with tests** - `908aa17` (feat)
2. **Task 2: Create SKILL.md for /new-article Claude Code Skill** - `1218532` (feat)

## Files Created/Modified

- `src/skill/new-article.ts` - Standalone helper script with checkSlugCollision, buildFeatureFromArgs, writeAndTranslate exports and three CLI subcommands
- `.claude/skills/new-article/SKILL.md` - Claude Code Skill definition with guided prompts, clarifying question flow, and approve/edit/cancel loop
- `tests/skill-new-article.test.ts` - 15 unit tests covering all three helper functions with mocked dependencies

## Decisions Made

- `disable-model-invocation: true` in SKILL.md frontmatter — this is a side-effect workflow (writes files, calls DeepL API), so must be user-explicitly triggered, never auto-loaded by Claude
- Manual articles are NOT added to `feature-map.json` — the feature map is scanner output; mixing manual articles would cause them to be regenerated/overwritten on the next `run` execution
- `buildFeatureFromArgs` sets `description` to empty string — skill-created articles have no scanner description; the generation prompt uses the feature name and type instead
- SKILL.md body uses step-by-step numbered flow rather than prose — more reliable for Claude to follow exactly during interactive conversation
- Adjusted test for `buildFeatureFromArgs` to not check `screens` field — the real `Feature` type (from scanner/schema.ts) does not include a `screens` field; the plan's interface description was from a different version of the spec

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test result assertion corrected for writeAndTranslate return type**
- **Found during:** Task 1 (skill helper script tests - RED → GREEN)
- **Issue:** Test `returns a summary of written files` called `expect(result).toContain(...)` on an object, but `writeAndTranslate` returns `WriteAndTranslateResult` (not a string). The plan said "Prints summary of files written" (console.log), but exporting a structured return value is more testable.
- **Fix:** Updated test to assert `result.germanPath` and `result.translatedPaths.length` — matches the actual return type
- **Files modified:** tests/skill-new-article.test.ts
- **Verification:** All 15 tests pass
- **Committed in:** 908aa17 (Task 1 commit)

**2. [Rule 1 - Bug] Removed screens field from buildFeatureFromArgs test**
- **Found during:** Task 1 (schema verification)
- **Issue:** Plan interface listed `screens: string[]` as a Feature field, but the actual `Feature` type from `src/scanner/schema.ts` does not have a `screens` field — schema uses `adminRoles?: AdminRole[]` instead
- **Fix:** Removed `expect(feature.screens).toEqual([])` test assertion; kept all other assertions
- **Files modified:** tests/skill-new-article.test.ts
- **Verification:** TypeScript compiles cleanly (`npx tsc --noEmit`), 15 tests pass
- **Committed in:** 908aa17 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - bug)
**Impact on plan:** Both fixes necessary for correctness. No scope creep. Actual behavior matches plan intent.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## User Setup Required

None - no external service configuration required beyond existing DEEPL_API_KEY and ANTHROPIC_API_KEY in `.env`.

## Next Phase Readiness

Phase 5 (Pipeline Assembly and Manual Skill) is now complete:
- Phase 5 Plan 01: `run` command orchestrating full pipeline (scan → generate → translate)
- Phase 5 Plan 02: `/new-article` Claude Code Skill for interactive manual article creation

All 5 phases are complete. The sawyer-support-docs CLI is ready for production use.

---
*Phase: 05-pipeline-assembly-and-manual-skill*
*Completed: 2026-03-12*
