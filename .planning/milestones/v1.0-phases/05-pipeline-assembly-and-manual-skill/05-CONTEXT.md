# Phase 5: Pipeline Assembly and Manual Skill - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire all existing stages (scan, generate, translate) into a unified `run` command that orchestrates the full pipeline with change detection. Separately, create a Claude Code Skill for manually authoring articles interactively with guided prompts, approval flow, and auto-translation.

</domain>

<decisions>
## Implementation Decisions

### Pipeline command design
- New `run` command (not reusing `generate`) — `sawyer-docs run --mobile ./path --dashboard ./path --platform ./path`
- `run` always executes full pipeline: scan → generate → translate. No `--skip-scan` or `--skip-translate` flags — use standalone commands for partial runs
- `--languages <langs>` passes through to the translate stage to limit translation targets
- `--features <slugs>` passes through to generate and translate stages
- `--dry-run` runs scan normally (needs Claude API), then does dry-run preview for generate and translate stages (no generation or translation API calls)
- `--force` passes through to translate stage for hash gating override

### Change detection behavior
- When no changes detected in any repo (all SHAs match): Claude's discretion on whether to exit immediately or check for missing articles
- When only some repos changed: generate articles only for features from the changed repos, not all features
- After scan, show a change summary before proceeding: "3 new features, 2 updated, 15 unchanged — generating 5 articles..."
- Translate stage runs only for newly generated/regenerated articles, not all articles

### Manual article skill flow
- Guided prompts interaction: skill asks structured questions (what feature? which app? what audience? which feature area?)
- Feature area asked explicitly from developer (not inferred from topic)
- Slug auto-generated from article title using `buildSlug()` — consistent with scan-generated slugs
- Skill checks for slug collisions with existing articles — warns and asks to overwrite or pick different name
- German draft shown in terminal with approve/edit/cancel flow — developer can request edits inline
- On approval: skill writes German .md file, then immediately auto-translates to all configured languages via DeepL
- Clarifying questions asked if scope or topic is unclear (SKILL-02 requirement)

### Skill article placement
- Directory structure: Claude's discretion (same `docs/{lang}/{area}/` tree or separate — pick what's cleanest for consuming apps)
- Feature map integration: Claude's discretion (add to feature-map.json or keep separate)

### Claude's Discretion
- Whether to exit immediately or check for missing articles when no changes detected
- Directory placement strategy for manual articles (same tree or separate)
- Feature map integration for manual articles (add or keep separate)
- Exact guided prompt questions and ordering in the skill
- How to detect which features belong to changed repos for selective generation
- Internal orchestration approach for the run command (import functions directly vs shell-out)

</decisions>

<specifics>
## Specific Ideas

- `run` command is the "do everything" developer experience — one command to update all docs after code changes
- Standalone commands (scan, generate, translate) remain for granular control — no skip flags needed on `run`
- Skill should feel like a conversation: guided prompts, show draft, iterate, approve, done
- Change summary before generate gives developer awareness of scope and cost before committing to API calls
- Translating only newly generated articles avoids unnecessary DeepL calls when most docs haven't changed

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/commands/scan.ts` — Full scan command with `--mobile`, `--dashboard`, `--platform` overrides, change detection via `needsScan()`, per-repo sequential scanning
- `src/commands/generate.ts` — Generate command with `--features`, `--dry-run`, per-feature spinner, continue-on-failure pattern
- `src/commands/translate.ts` — Translate command with `--features`, `--languages`, `--dry-run`, `--force`, hash gating, per-job spinner
- `src/scanner/state.ts` — `readScanState()`, `writeScanState()`, `needsScan()` for change detection
- `src/scanner/index.ts` — `readFeatureMap()`, `writeFeatureMap()` for feature map I/O
- `src/paths/slugify.ts` — `buildSlug()` for deterministic slug generation from titles
- `src/paths/paths.ts` — `buildArticlePath()` for per-language file paths
- `src/translator/index.ts` — All translator exports (hash, frontmatter, client, writer)
- `src/generator/index.ts` — `runGeneration()`, `writeArticle()` for article generation
- `src/ui/logger.ts` — Logger with spinner, info, warn, error, success

### Established Patterns
- Commander.js subcommand pattern with `--features`, `--dry-run` flags
- Per-item spinner with succeed/fail
- Continue-on-failure with `failed++` and `process.exit(1)` at end
- ESM-only TypeScript with `.js` import extensions
- Config loaded once at command start via `loadConfig()`
- Feature map as central data structure for all stages

### Integration Points
- `src/bin/cli.ts` — CLI entry point, needs `runCommand` added
- `.claude/skills/` — Skill file location for Claude Code Skill (SKILL.md format)
- Scan state in `.sawyer-docs/scan-state.json` tracks per-repo SHAs
- Feature map in `.sawyer-docs/feature-map.json` feeds generate and translate

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-pipeline-assembly-and-manual-skill*
*Context gathered: 2026-03-12*
