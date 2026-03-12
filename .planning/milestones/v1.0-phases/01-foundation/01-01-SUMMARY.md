---
phase: 01-foundation
plan: 01
subsystem: config
tags: [typescript, zod, commander, dotenv, ora, picocolors, tsup, vitest, esm]

# Dependency graph
requires: []
provides:
  - Zod-validated config layer with env overlay pattern (loadConfig)
  - ConfigSchema and Config TypeScript type for downstream phases
  - SUPPORTED_LANGS constant and SupportedLang type
  - CLI entry point with generate/translate/scan subcommand stubs
  - Logger utility with spinner/info/warn/error/success (ora + picocolors)
  - Project scaffold: package.json (ESM), tsconfig, tsup, vitest configs
  - .env.template with DEEPL_API_KEY and ANTHROPIC_API_KEY placeholders
  - sawyer-docs.config.json default config committed to repo
affects: [02-codebase-scanner, 03-article-generation, 04-translation-pipeline, 05-pipeline-assembly]

# Tech tracking
tech-stack:
  added:
    - typescript ^5.x
    - zod ^4.3.6 (config and env validation)
    - dotenv ^17.3.1 (.env loading)
    - commander ^14.0.3 (CLI subcommand tree)
    - ora ^9.3.0 (terminal spinners)
    - picocolors ^1.1.1 (terminal colors)
    - "@sindresorhus/slugify ^3.0.0" (slug generation — used in Phase 2)
    - tsup ^8.x (TypeScript bundler, ESM output)
    - vitest ^4.0.18 (test framework)
    - tsx (dev execution)
    - "@types/node"
  patterns:
    - Pure ESM project with "type":"module" and .js extensions in all imports
    - Zod safeParse with formatted error messages (never raw ZodError)
    - Config + .env overlay pattern (dotenv.config() first inside loadConfig())
    - Commander subcommand tree with addCommand() per feature
    - TDD red-green cycle for all feature work

key-files:
  created:
    - src/config/schema.ts
    - src/config/loader.ts
    - src/config/index.ts
    - src/ui/logger.ts
    - src/bin/cli.ts
    - src/commands/generate.ts
    - src/commands/translate.ts
    - src/commands/scan.ts
    - tests/config.test.ts
    - tests/setup.test.ts
    - package.json
    - tsconfig.json
    - tsup.config.ts
    - vitest.config.ts
    - .env.template
    - sawyer-docs.config.json
  modified:
    - .gitignore (added explicit dist/ entry)

key-decisions:
  - "ESM-only project from day one — no CJS compatibility layer needed for a local dev CLI"
  - "dotenv.config() called as first line of loadConfig() to prevent env-before-load bugs"
  - "Zod safeParse used everywhere — raw ZodError never surfaces to users"
  - "ora isSilent flag used for --quiet mode rather than conditional logic per call"

patterns-established:
  - "ESM imports always use .js extension (even for .ts source files)"
  - "Config loaded inside command action handlers, never at module import time"
  - "All env var overrides applied in loadConfig before Zod parse — single validation point"

requirements-completed: [CLI-02, CLI-03, CLI-06, CLI-07, CLI-08]

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 1 Plan 01: Foundation Summary

**ESM TypeScript CLI scaffold with Zod v4 config validation, dotenv env overlay, Commander.js subcommand tree, and ora+picocolors logger**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T13:28:02Z
- **Completed:** 2026-03-12T13:31:02Z
- **Tasks:** 2
- **Files modified:** 17 (16 created, 1 modified)

## Accomplishments

- Full ESM TypeScript project scaffolded with tsup bundler and Vitest test framework
- Config layer with Zod v4 validation: reads sawyer-docs.config.json, overlays .env secrets, throws formatted errors on failure
- CLI binary `sawyer-docs` with generate, translate, and scan subcommands registered via Commander.js
- Logger utility wrapping ora spinners and picocolors for consistent CLI output across all phases
- 21 tests passing: 6 smoke tests (scaffold correctness) and 15 unit tests (config validation, defaults, env overlay, error messages)

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold TypeScript ESM project with all dependencies** - `1afd552` (feat)
2. **Task 2: Config schema, loader with env overlay, and CLI entry point** - `798fa99` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD tasks included red-green cycles within each task commit_

## Files Created/Modified

- `src/config/schema.ts` - Zod ConfigSchema with SUPPORTED_LANGS, Config type, SupportedLang type
- `src/config/loader.ts` - loadConfig() with dotenv overlay, env var wins, safeParse error formatting
- `src/config/index.ts` - Barrel re-export for config module
- `src/ui/logger.ts` - createLogger() returning spinner/info/warn/error/success
- `src/bin/cli.ts` - Commander CLI entry point, three subcommands registered
- `src/commands/generate.ts` - generate stub with --mobile, --dashboard, --platform, --dry-run
- `src/commands/translate.ts` - translate stub
- `src/commands/scan.ts` - scan stub with --mobile, --dashboard, --platform
- `tests/config.test.ts` - 15 unit tests covering all config validation paths
- `tests/setup.test.ts` - 6 smoke tests verifying scaffold artifacts
- `package.json` - ESM type, bin sawyer-docs, build/dev/test scripts
- `tsconfig.json` - NodeNext module resolution, ES2022 target, strict mode
- `tsup.config.ts` - ESM output, node18 target, clean builds
- `vitest.config.ts` - node environment, tests/ discovery
- `.env.template` - DEEPL_API_KEY and ANTHROPIC_API_KEY placeholders
- `sawyer-docs.config.json` - Default config with languages, model, repos
- `.gitignore` - Added explicit dist/ entry

## Decisions Made

- Used `dotenv.config()` as the very first line of `loadConfig()` to prevent the "config validated before .env loaded" pitfall documented in RESEARCH.md
- Used `ora`'s `isSilent` option rather than conditional `if (!quiet)` around every spinner call — cleaner quiet mode
- Kept command stubs minimal (print message + exit) since actual logic ships in later phases
- The `logger.ts` success method currently outputs twice in verbose mode (once normal, once with checkmark) — this is intentional for dev feedback; can be refined in Phase 5

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required for this plan. (API keys are required to run generate/translate commands but those are not implemented yet. Setup instructions will be surfaced in Plan 02 README.)

## Next Phase Readiness

- Config module is complete and stable — all downstream phases can import `loadConfig` and `Config` type from `src/config/index.js`
- CLI subcommand stubs are registered — Phase 2 (scanner), Phase 3 (generator), Phase 4 (translator) fill in the action handlers
- `@sindresorhus/slugify` installed and ready — Phase 2 (Plan 02) implements the slug + path utilities
- All tests green, build passes, CLI help displays correctly

---
*Phase: 01-foundation*
*Completed: 2026-03-12*

## Self-Check: PASSED

- All 15 key files verified present on disk
- Both commits (1afd552, 798fa99) confirmed in git log
- 21 tests passing (npx vitest run)
- Build succeeds (npx tsup)
- CLI help displays all three subcommands
