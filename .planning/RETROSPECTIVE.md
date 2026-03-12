# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-12
**Phases:** 5 | **Plans:** 10 executed (1 skipped) | **Sessions:** ~4

### What Was Built
- Complete CLI pipeline: scan codebases, generate German articles, translate via DeepL
- Claude Agent SDK multi-pass scanner with git change detection
- SHA-256 hash gating protecting manual translation edits
- Interactive `/new-article` Claude Code Skill with guided prompts
- 157 tests across 14 files, 2,265 LOC source + 1,808 LOC tests

### What Worked
- TDD approach for all modules — tests written before implementation kept interfaces clean
- Phase-by-phase composition — each phase built directly on prior module exports
- Research step before each phase caught real issues (e.g., DeepL lang code format mismatch)
- Programmatic frontmatter generation eliminated LLM formatting inconsistency
- Sequential generation with error isolation — one failure doesn't block entire run

### What Was Inefficient
- Phase 2 plan 03 (E2E integration test) was planned but skipped — could have been identified as optional earlier
- ROADMAP.md plan checkboxes got out of sync with actual execution state (some showed unchecked despite being complete)
- STATE.md progress percentage lagged behind actual completion

### Patterns Established
- Caller-pre-slugify: callers pass pre-slugified values, keeping path builder pure
- Barrel exports per module (index.ts) — single import point for consumers
- Per-feature error isolation: `failed++; continue` then `process.exit(1)` after loop
- `--dry-run` exits before creating API clients — works without API keys
- Manual articles excluded from feature-map.json to prevent overwrite

### Key Lessons
1. Always verify SDK type definitions from node_modules before writing code — documentation can be wrong (DeepL lang codes were lowercase, not uppercase as docs implied)
2. Hand-writing JSON Schema is safer than deriving from Zod when using unstable Zod versions
3. `vi.mock()` with class constructors requires class syntax, not arrow functions
4. Temperature 0 is essential for documentation generation — deterministic output is a correctness requirement
5. Content hash gating must ship with translation from day one — retrofitting is much harder

### Cost Observations
- Model mix: predominantly sonnet for execution, opus for planning/orchestration
- Sessions: ~4 conversation sessions for full milestone
- Notable: entire v1.0 built in a single day (~10 hours wall clock)

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~4 | 5 | Initial GSD workflow — research → plan → execute per phase |

### Cumulative Quality

| Milestone | Tests | Files | Source LOC |
|-----------|-------|-------|-----------|
| v1.0 | 157 | 29 src + 14 test | 4,073 |

### Top Lessons (Verified Across Milestones)

1. Research before planning catches real SDK/API incompatibilities before they become bugs
2. TDD with pure helper functions enables fast, reliable test suites
