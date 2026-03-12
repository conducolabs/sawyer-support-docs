# Roadmap: sawyer Support Docs

## Overview

A five-phase pipeline builds the multilingual documentation generation CLI from the ground up. Phase 1 establishes the shared type system and file path contract — the public API that consuming applications depend on. Phase 2 uses Claude Code as the scanning engine to analyze codebases and produce structured feature maps — leveraging its deep understanding of code rather than building a custom AST parser. Phase 3 constructs the article generator with German-first output and audience-aware prompt templates. Phase 4 adds the DeepL translation engine with correctness safeguards that must ship on day one. Phase 5 wires every stage into a complete CLI pipeline, adds change detection, and layers on the Claude Code Skill for manual article creation.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Config layer, shared types, file path contract, and project scaffolding
- [x] **Phase 2: Codebase Scanner** - Claude Code-powered feature detection from all three codebases
- [x] **Phase 3: Article Generation** - German-first support article authoring via Claude AI (completed 2026-03-12)
- [ ] **Phase 4: Translation Pipeline** - DeepL translation with hash gating and glossary integration
- [ ] **Phase 5: Pipeline Assembly and Manual Skill** - Full CLI orchestration, change detection, and manual article skill

## Phase Details

### Phase 1: Foundation
**Goal**: Developer can initialize and configure the project with validated settings, and the file path contract is established as a stable public API for consuming applications
**Depends on**: Nothing (first phase)
**Requirements**: CLI-02, CLI-03, CLI-06, CLI-07, CLI-08, FILE-01, FILE-02, FILE-03, DOC-01, DOC-02, DOC-03
**Success Criteria** (what must be TRUE):
  1. Developer can copy `.env.template` to `.env`, add API keys, and have the config layer validate them at startup with a clear error if a key is missing
  2. Developer can set target languages and AI model in a config file and have those settings consumed by all downstream stages
  3. A feature slug produces the same URL-safe English directory path on every run (umlaut-free, collision-detected, idempotent)
  4. All generated article files land in `docs/{lang}/{feature-area}/` directories consistent across every configured language
  5. README explains setup, CLI usage, and API key configuration so a new developer can get started without asking questions
**Plans:** 2/2 plans executed

Plans:
- [x] 01-01-PLAN.md — Project scaffold, config layer with Zod validation, CLI entry point with subcommand stubs
- [x] 01-02-PLAN.md — File path contract (slug + path builder) and comprehensive README

### Phase 2: Codebase Scanner
**Goal**: CLI invokes Claude Code to analyze local repo clones and produce a structured feature map of user-facing screens and flows — leveraging Claude Code's deep code understanding instead of custom AST parsing
**Depends on**: Phase 1
**Requirements**: SCAN-01, SCAN-02, SCAN-03, SCAN-04, SCAN-05, SCAN-06, SCAN-07
**Success Criteria** (what must be TRUE):
  1. Claude Code analyzes the mobile app codebase and identifies user-facing screens/flows, excluding infrastructure components
  2. Claude Code analyzes the dashboard codebase and identifies user-facing screens/flows with admin-context classification
  3. Claude Code extracts data model and endpoint context from the platform API codebase without generating articles for it
  4. Scanning produces a structured JSON feature map with stable, deterministic identifiers — running twice on unchanged code produces identical output
  5. Scanner compares against a stored snapshot and reports only changed or new features when the codebase has been modified
**Plans:** 2/3 plans executed

Plans:
- [x] 02-01-PLAN.md — Scanner schemas, scan state persistence, and git change detection (TDD)
- [ ] 02-02-PLAN.md — Claude Agent SDK passes, prompt templates, and scan command wiring
- [ ] 02-03-PLAN.md — End-to-end integration test with real codebases (checkpoint)

### Phase 3: Article Generation
**Goal**: Developer can feed a feature map into the generator and receive German-first support articles in all configured article types, written at the correct register and scoped to the right audience
**Depends on**: Phase 2
**Requirements**: GEN-01, GEN-02, GEN-03, GEN-04, GEN-05, GEN-06, GEN-07, GEN-08
**Success Criteria** (what must be TRUE):
  1. Generator produces a German step-by-step guide, FAQ, troubleshooting article, and feature overview for a given feature — each with correct frontmatter (title, language) and consistent formal register
  2. Articles generated for mobile app features address end users; articles for dashboard features address club or company admins — content and vocabulary differ appropriately
  3. Running the generator twice on the same feature map produces identical article output (deterministic at temperature 0)
  4. Articles for enrollment or onboarding topics direct users to their local contact person rather than providing instructions
**Plans:** 2/2 plans complete

Plans:
- [x] 03-01-PLAN.md — Generator module: prompt templates, frontmatter builder, article writer, SDK wrapper, and unit tests
- [x] 03-02-PLAN.md — Generate command wiring and article quality verification checkpoint

### Phase 4: Translation Pipeline
**Goal**: German articles are automatically translated into all configured languages via DeepL, with safeguards that prevent overwriting manually corrected translations and mistranslating product-specific UI terms
**Depends on**: Phase 3
**Requirements**: TRANS-01, TRANS-02, TRANS-03, TRANS-04, CLI-05
**Success Criteria** (what must be TRUE):
  1. A German article is translated into all configured languages (NL, EN-US, TR, UK) and each translation lands in the correct per-language directory
  2. A translated file that has been manually edited is not overwritten when the generator re-runs, because its source hash has not changed
  3. When a DeepL API call fails (quota exceeded, timeout, invalid key), the CLI prints a clear, actionable error message identifying which article failed and why
  4. All generated and translated files land on the local filesystem — nothing is auto-committed to git
**Plans:** 2 plans

Plans:
- [ ] 04-01-PLAN.md — Translator module: DeepL client, hash gating, frontmatter round-trip, file writer (TDD)
- [ ] 04-02-PLAN.md — Translate command wiring and end-to-end verification checkpoint

### Phase 5: Pipeline Assembly and Manual Skill
**Goal**: Developer can run a single CLI command to scan configured codebases, detect changes, generate German articles, and translate them — and separately request a new article interactively via the Claude Code Skill
**Depends on**: Phase 4
**Requirements**: CLI-01, CLI-04, SKILL-01, SKILL-02, SKILL-03, SKILL-04
**Success Criteria** (what must be TRUE):
  1. Developer runs `sawyer-docs generate --mobile ./path --dashboard ./path --platform ./path` and the full pipeline executes: scan, change detect, generate, translate, write
  2. Developer runs with `--dry-run` and sees a preview of which articles would be generated and the estimated DeepL character cost — no API calls are made
  3. Developer invokes the Claude Code Skill, describes an article topic, receives clarifying questions if needed, approves a German draft, and finds the translated article files on disk
  4. On a codebase with no changes since the last run, the pipeline reports no new articles to generate and exits without calling Claude or DeepL
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete | 2026-03-12 |
| 2. Codebase Scanner | 2/3 | Complete | 2026-03-12 |
| 3. Article Generation | 2/2 | Complete   | 2026-03-12 |
| 4. Translation Pipeline | 0/2 | Planning complete | - |
| 5. Pipeline Assembly and Manual Skill | 0/TBD | Not started | - |
