# Phase 5: Pipeline Assembly and Manual Skill - Research

**Researched:** 2026-03-12
**Domain:** CLI orchestration (Commander.js), Claude Code Skills (SKILL.md format), internal module composition
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Pipeline command design**
- New `run` command (not reusing `generate`) — `sawyer-docs run --mobile ./path --dashboard ./path --platform ./path`
- `run` always executes full pipeline: scan → generate → translate. No `--skip-scan` or `--skip-translate` flags — use standalone commands for partial runs
- `--languages <langs>` passes through to the translate stage to limit translation targets
- `--features <slugs>` passes through to generate and translate stages
- `--dry-run` runs scan normally (needs Claude API), then does dry-run preview for generate and translate stages (no generation or translation API calls)
- `--force` passes through to translate stage for hash gating override

**Change detection behavior**
- When no changes detected in any repo (all SHAs match): Claude's discretion on whether to exit immediately or check for missing articles
- When only some repos changed: generate articles only for features from the changed repos, not all features
- After scan, show a change summary before proceeding: "3 new features, 2 updated, 15 unchanged — generating 5 articles..."
- Translate stage runs only for newly generated/regenerated articles, not all articles

**Manual article skill flow**
- Guided prompts interaction: skill asks structured questions (what feature? which app? what audience? which feature area?)
- Feature area asked explicitly from developer (not inferred from topic)
- Slug auto-generated from article title using `buildSlug()` — consistent with scan-generated slugs
- Skill checks for slug collisions with existing articles — warns and asks to overwrite or pick different name
- German draft shown in terminal with approve/edit/cancel flow — developer can request edits inline
- On approval: skill writes German .md file, then immediately auto-translates to all configured languages via DeepL
- Clarifying questions asked if scope or topic is unclear (SKILL-02 requirement)

### Claude's Discretion
- Whether to exit immediately or check for missing articles when no changes detected
- Directory placement strategy for manual articles (same tree or separate)
- Feature map integration for manual articles (add or keep separate)
- Exact guided prompt questions and ordering in the skill
- How to detect which features belong to changed repos for selective generation
- Internal orchestration approach for the run command (import functions directly vs shell-out)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLI-01 | Developer can run a CLI command specifying source directories for mobile app, dashboard, and platform repos | `run` command adds `--mobile`, `--dashboard`, `--platform` flags matching the existing `scan` command pattern |
| CLI-04 | Developer can run a dry-run to preview what articles would be generated without calling APIs | `--dry-run` on `run` command: scan runs normally (Claude API used), generate and translate stages skip API calls and print preview output |
| SKILL-01 | Claude Code Skill allows user to request a new article by describing what it should cover | SKILL.md at `.claude/skills/new-article/SKILL.md` with guided prompts using Claude's conversation tools |
| SKILL-02 | Skill asks clarifying questions if the article scope or topic is unclear | Prompt flow design in SKILL.md includes explicit branching for ambiguous inputs |
| SKILL-03 | Skill generates a German draft as .md file and presents it for approval | Skill calls `runGeneration()` → shows draft in terminal → approve/edit/cancel loop |
| SKILL-04 | On approval, skill auto-translates the article to all configured languages via DeepL | Skill calls translate functions after approval, using existing `translateArticle()` + `writeTranslatedArticle()` |
</phase_requirements>

---

## Summary

Phase 5 has two distinct deliverables: (1) a `run` command that wires the existing `scan`, `generate`, and `translate` commands into a single orchestrated pipeline with selective change detection, and (2) a Claude Code Skill (`/new-article`) that enables interactive manual article authoring with an approve/edit/cancel flow and auto-translation.

The `run` command is primarily an orchestration concern — all the underlying logic already exists. The key design challenges are: tracking which features belong to changed repos (so only those features are generated), passing scan results forward to drive the generate and translate stages, and producing a change summary before the expensive generate step. Internal function imports (not shell-out) are the right approach — it avoids subprocess overhead and allows direct data passing between stages.

The Claude Code Skill is a `SKILL.md` file placed at `.claude/skills/new-article/SKILL.md`. The skill invokes Claude's own conversation ability to collect input via guided questions, then uses the project's existing `runGeneration()` and translation functions programmatically. The Skill format (as of 2026) is the Agent Skills open standard: YAML frontmatter for configuration, markdown body for instructions. Skills work best as guided instruction sets — the markdown body tells Claude exactly what questions to ask and what steps to follow.

**Primary recommendation:** Implement `run` command by importing and calling scan/generate/translate functions directly (not shell-out). Implement the Skill as a pure instruction document in SKILL.md that directs Claude to use Bash tool calls to invoke a standalone `src/skill/new-article.ts` script, keeping logic testable and the skill document readable.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | ^14.0.3 | CLI subcommand: `run` command definition | Already in use — established pattern |
| @anthropic-ai/claude-agent-sdk | ^0.2.74 | Generation via `query()` in skill script | Already in use for `runGeneration()` |
| deepl-node | ^1.24.0 | Translation in skill after approval | Already in use in translate command |
| ora | ^9.3.0 | Spinners for per-step progress in run command | Already in use via `createLogger()` |
| picocolors | ^1.1.1 | Colored terminal output | Already in use via `createLogger()` |

### No New Dependencies Required

All libraries needed for Phase 5 are already installed. The `run` command reuses existing modules. The skill script (if using a helper TypeScript file) uses the same imports. The SKILL.md itself needs no Node.js dependencies — it is a markdown instruction document.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── commands/
│   ├── generate.ts        # existing
│   ├── scan.ts            # existing
│   ├── translate.ts       # existing
│   └── run.ts             # NEW: pipeline orchestration command
├── skill/
│   └── new-article.ts     # NEW: standalone script invoked by SKILL.md
├── bin/
│   └── cli.ts             # updated: addCommand(runCommand)
.claude/
└── skills/
    └── new-article/
        └── SKILL.md       # NEW: Claude Code Skill definition
```

### Pattern 1: `run` Command — Direct Function Import Orchestration

**What:** The `run` command imports and calls the internal logic functions from `scan.ts`, `generate.ts`, and `translate.ts` — not the Commander action handlers, but the underlying utility functions. This allows direct data passing between stages without re-reading files from disk.

**When to use:** When orchestrating multiple pipeline stages that share intermediate data (feature maps, scan state), and when subprocess invocation would require serializing/deserializing that data.

**Why not shell-out:** Shelling out to `sawyer-docs scan && sawyer-docs generate && sawyer-docs translate` loses the in-memory feature map, requires re-reading files from disk between stages, prevents passing `changedSlugs` from scan to generate, and adds process startup overhead for each stage.

**Key data flow:**
```typescript
// Source: internal composition — all these functions already exist
const { featureMap, newState, changedRepos } = await runScanStage(options, config, cwd, logger);
const changedSlugs = deriveSlugsFromChangedRepos(featureMap, changedRepos);
const generatedSlugs = await runGenerateStage(featureMap, changedSlugs, options, config, cwd, logger);
await runTranslateStage(featureMap, generatedSlugs, options, config, cwd, logger);
```

**Change detection for selective generation:** The scan stage already tracks which repos changed (via SHA comparison). Extract which repo each feature originates from (`feature.sourceApp`) to derive the set of feature slugs that need regeneration. Features from unchanged repos are preserved but not regenerated.

```typescript
// Deriving which slugs to regenerate based on changed repos
function deriveSlugsFromChangedRepos(
  featureMap: FeatureMap,
  changedRepos: Set<'mobile' | 'dashboard' | 'platform'>,
): Set<string> {
  if (changedRepos.size === 0) return new Set();
  return new Set(
    featureMap.features
      .filter((f) => {
        if (f.sourceApp === 'both') return changedRepos.has('mobile') || changedRepos.has('dashboard');
        return changedRepos.has(f.sourceApp as 'mobile' | 'dashboard');
      })
      .map((f) => f.slug),
  );
}
```

**Change summary display (locked decision):**
```typescript
logger.info(
  `Scan complete: ${newCount} new, ${updatedCount} updated, ${unchangedCount} unchanged — generating ${changedSlugs.size} article(s)...`,
);
```

**No-changes exit logic (Claude's discretion recommendation):** When `changedSlugs.size === 0`, check for features that have no corresponding German article on disk. If any are missing, generate those. If all articles exist, exit early with a success message. This avoids unnecessary Claude API calls while ensuring first-run completeness.

### Pattern 2: Claude Code Skill (`/new-article`) — Instruction Document

**What:** A SKILL.md file that gives Claude step-by-step instructions for an interactive guided article creation flow. Claude uses its own conversation ability to ask the structured questions, then uses the Bash tool to invoke a project script for generation and translation.

**SKILL.md frontmatter fields (verified from official docs):**
- `name`: `new-article` — becomes the `/new-article` slash command
- `description`: tells Claude when to auto-load (or set `disable-model-invocation: true`)
- `disable-model-invocation: true`: RECOMMENDED — this is a side-effect workflow (writes files, calls APIs), user should invoke explicitly
- `allowed-tools: Bash(npx tsx src/skill/new-article.ts *)` — restrict to only what the skill needs
- No `context: fork` needed — interactive conversation requires same context

**SKILL.md structure:**
```yaml
---
name: new-article
description: Interactively create a new support article — guided prompts, German draft, approval, auto-translation
disable-model-invocation: true
argument-hint: "[optional: brief description of what to document]"
allowed-tools: Bash(npx tsx *), Read, Glob
---

## New Article Creation Skill

You are helping a developer create a new support documentation article.
Follow these steps exactly.

### Step 1: Gather Information
Ask these questions one at a time (wait for answer before next):
1. What feature or topic should this article cover?
2. Which app is this for? (mobile / dashboard / both)
3. Who is the audience? (end_user / admin)
4. Which feature area does this belong to? (e.g. authentication, payments, profile)
5. What type of article? (guide / faq / troubleshooting / overview)

If the answer to question 1 is unclear, ask clarifying questions before proceeding.

### Step 2: Check for Slug Collision
Run:
```bash
npx tsx src/skill/new-article.ts check-slug "<derived-slug>"
```

If a collision is detected, warn the developer and ask whether to overwrite or pick a different name.

### Step 3: Generate German Draft
Run:
```bash
npx tsx src/skill/new-article.ts generate --feature "<name>" --app "<app>" \
  --audience "<audience>" --area "<area>" --type "<type>"
```

Display the generated draft in the terminal. Ask the developer to:
- **approve** — proceed to translation
- **edit** — describe what to change, then regenerate
- **cancel** — abort without writing any files

### Step 4: On Approval — Write and Translate
Run:
```bash
npx tsx src/skill/new-article.ts write-and-translate --slug "<slug>" \
  --area "<area>" --content "<draft>"
```

Confirm the files written and report translation results.
```

**Skill helper script (`src/skill/new-article.ts`):** A standalone TypeScript script invoked by the skill with subcommands: `check-slug`, `generate`, `write-and-translate`. This keeps the testable logic out of the SKILL.md and makes it runnable via `npx tsx`. The script reuses `buildSlug()`, `runGeneration()`, `writeArticle()`, and the translator functions.

### Pattern 3: Slug Collision Detection

**What:** Before writing a skill-generated article, check if a file already exists at the target path.

```typescript
// Source: buildArticlePath already exists in src/paths/paths.ts
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildArticlePath } from '../paths/index.js';

function checkSlugCollision(cwd: string, featureArea: string, slug: string): boolean {
  const relPath = buildArticlePath('de', featureArea, slug);
  return existsSync(resolve(cwd, relPath));
}
```

### Pattern 4: Skill Article Placement (Claude's Discretion Recommendation)

**Recommendation: Same `docs/{lang}/{area}/` tree.** This is the cleanest strategy because:
- Consuming apps read from a single location per language
- File paths are stable slugs regardless of how the article was created (automated vs manual)
- No special-casing needed in the consuming app
- `buildArticlePath()` already produces the correct path

**Feature map integration recommendation:** Do NOT add manually-authored articles to `feature-map.json`. The feature map represents scanner output from codebase analysis. Manual articles are one-off documents that don't correspond to scanned features. Keep them separate — skill articles land in the same docs directory tree but are not indexed in the feature map.

### Anti-Patterns to Avoid

- **Shell-out orchestration in `run` command:** Spawning child processes for each stage loses in-memory data, makes error propagation complex, and prevents passing `changedSlugs` from scan to generate.
- **`context: fork` in the skill SKILL.md:** The interactive conversation flow (ask → answer → ask → answer) requires continuous context. Forking creates an isolated subagent that cannot maintain the back-and-forth conversation.
- **Inline generation logic in SKILL.md:** Markdown instruction documents cannot import TypeScript modules. Generation logic belongs in a helper script invoked via Bash.
- **Adding manual articles to feature-map.json:** The feature map is scanner output. Mixing manual articles into it would cause those articles to be regenerated (overwritten) the next time `run` is executed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slug generation | Custom slugifier | `buildSlug()` from `src/paths/slugify.ts` | Already exists, handles German umlauts, stable contract |
| Article file path | Custom path builder | `buildArticlePath()` from `src/paths/index.js` | Already exists, consistent with all other stages |
| Translation | Custom DeepL integration | `translateArticle()` + `writeTranslatedArticle()` from `src/translator/index.js` | Already exists with hash gating, error handling, lang mapping |
| German article writing | Custom file writer | `writeArticle()` from `src/generator/index.js` | Already exists with mkdirSync, consistent path resolution |
| Article generation | New Claude API call | `runGeneration()` from `src/generator/index.js` | Already exists with system prompt, temperature 0, result extraction |
| Frontmatter parsing | Custom YAML parser | `parseFrontmatter()` from `src/translator/index.js` | Already exists with title/language/source_hash extraction |
| Translated frontmatter | Custom YAML builder | `buildTranslatedFrontmatter()` from `src/translator/index.js` | Already exists with source_hash embedding |
| Config loading | New dotenv setup | `loadConfig()` from `src/config/index.js` | Already exists with Zod validation, env loading |
| Logger/spinners | Custom UI | `createLogger()` from `src/ui/logger.js` | Already exists with ora spinners and picocolors |

**Key insight:** This phase is almost entirely composition — the implementation risk is low because all the building blocks already exist and work correctly (verified in phases 1-4). The primary engineering work is wiring, data passing, and the SKILL.md document.

---

## Common Pitfalls

### Pitfall 1: Changed Repo → Changed Feature Mapping Edge Case

**What goes wrong:** The `sourceApp` field has three values: `'mobile'`, `'dashboard'`, `'both'`. A naive check `changedRepos.has(feature.sourceApp)` fails for `'both'` — it would never be in `changedRepos` because repos are tracked as `'mobile'` and `'dashboard'`.

**Why it happens:** `sourceApp === 'both'` means the feature was merged from both mobile and dashboard scans (`mergeFeatureMaps` sets this). If either mobile or dashboard changed, the merged feature should be regenerated.

**How to avoid:** Use the explicit check shown in Pattern 1: `if (f.sourceApp === 'both') return changedRepos.has('mobile') || changedRepos.has('dashboard')`.

**Warning signs:** Features with `sourceApp: 'both'` never appearing in the regeneration set when repos change.

### Pitfall 2: Translating All Features Instead of Only Generated Ones

**What goes wrong:** The locked decision says "translate stage runs only for newly generated/regenerated articles." If the translate stage receives the full feature list instead of just the generated slugs, it re-checks hash gating for all articles — expensive and slow.

**Why it happens:** Forgetting to pass the `generatedSlugs` set from the generate stage to the translate stage, and instead passing the full `featureMap.features`.

**How to avoid:** The generate stage must return or accumulate the list of slugs it successfully wrote. Pass that list to the translate stage as the `--features` equivalent filter.

**Warning signs:** Translate stage shows "skipped — hash unchanged" for dozens of articles on a run where only 2-3 features changed.

### Pitfall 3: `--dry-run` Scope Mismatch

**What goes wrong:** `--dry-run` on `run` must still execute the scan stage (which uses the Claude API via the Claude CLI). Developer expects zero API calls, but scan requires Claude.

**Why it happens:** The locked decision is specific: dry-run "runs scan normally (needs Claude API), then does dry-run preview for generate and translate stages." This is a deliberate tradeoff.

**How to avoid:** The dry-run output message must explicitly say "Scan complete (used Claude API). Dry-run: no articles generated or translated." so developers are not surprised by the Claude API call.

**Warning signs:** Developer confusion when `--dry-run` still charges Claude API tokens (expected behavior, but needs clear communication).

### Pitfall 4: Skill `context: fork` Breaks Interactive Flow

**What goes wrong:** Using `context: fork` in the SKILL.md frontmatter runs the skill in an isolated subagent. The subagent cannot maintain the back-and-forth conversation required by the guided prompts (ask → wait for answer → ask next question).

**Why it happens:** `context: fork` is designed for one-shot tasks (research, analysis), not interactive conversations.

**How to avoid:** Do not use `context: fork`. The skill runs in the main session context, which is exactly what interactive multi-turn conversations require.

### Pitfall 5: Skill Script Not Executable via `npx tsx`

**What goes wrong:** `npx tsx src/skill/new-article.ts` fails because `tsx` is a devDependency and may not resolve in the project root when invoked by the skill.

**Why it happens:** `npx tsx` resolves from `node_modules/.bin/tsx` in the project directory. This works when Claude's working directory is the project root. If the skill is stored at the project level (`.claude/skills/`), cwd should be the project root during skill execution.

**How to avoid:** Use the `dev` script pattern from `package.json`: `node --import tsx/esm src/skill/new-article.ts` as fallback, or ensure `tsx` is in dependencies (or at least devDependencies). Since this is a developer-only CLI tool, devDependencies are always installed.

**Alternative:** Use `node dist/skill/new-article.js` if the project is always built before skill use. Simpler for production, but `npx tsx` works fine for a developer-only CLI.

### Pitfall 6: Feature Area for Skill Articles Has No Validation

**What goes wrong:** Developer types a free-form feature area (e.g., "Payments" with capital P, or "payment-processing" vs "payments"). This creates a new directory that doesn't match existing articles.

**Why it happens:** The skill collects feature area as a text input without validation against existing directories.

**How to avoid:** In the skill helper script's `check-slug` step, list existing feature area directories and show them as options. If the developer's input doesn't match an existing area exactly, warn and confirm before creating a new one.

---

## Code Examples

Verified patterns from existing codebase:

### Detecting Which Repos Changed (from `scan.ts` existing logic)
```typescript
// Source: src/commands/scan.ts lines 215-217 — already computes changedRepos
const rescannedSources = new Set<string>();
if (newState.mobile?.sha !== existingState.mobile?.sha) rescannedSources.add('mobile');
if (newState.dashboard?.sha !== existingState.dashboard?.sha) rescannedSources.add('dashboard');
if (newState.platform?.sha !== existingState.platform?.sha) rescannedSources.add('platform');
```

The `run` command can use identical logic. Return `rescannedSources` from the scan stage and pass it to derive `changedSlugs`.

### Adding `runCommand` to CLI Entry Point
```typescript
// Source: src/bin/cli.ts — existing pattern
import { runCommand } from '../commands/run.js';
program.addCommand(runCommand);
```

### Skill Helper Script Skeleton
```typescript
// Source: new file src/skill/new-article.ts
#!/usr/bin/env node
import { loadConfig } from '../config/index.js';
import { buildSlug } from '../paths/slugify.js';
import { buildArticlePath } from '../paths/index.js';
import { runGeneration, writeArticle } from '../generator/index.js';
import { createDeepLClient, translateArticle, writeTranslatedArticle, buildTranslatedFrontmatter, computeHash } from '../translator/index.js';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const [,, subcommand, ...args] = process.argv;

// parse subcommand: check-slug | generate | write-and-translate
```

### SKILL.md Frontmatter — Correct Format
```yaml
---
name: new-article
description: Interactively create a new support documentation article with guided prompts, German draft approval, and auto-translation
disable-model-invocation: true
argument-hint: "[optional: brief description of the feature to document]"
allowed-tools: Bash(npx tsx *), Bash(node *), Read, Glob
---
```

Note: `allowed-tools` controls which tools Claude can use WITHOUT asking permission while the skill is active. `disable-model-invocation: true` ensures `/new-article` is only triggered when the developer explicitly types it — never by Claude automatically.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.claude/commands/deploy.md` custom commands | `.claude/skills/<name>/SKILL.md` with frontmatter | Dec 2025 (Agent Skills open standard) | Skills are now the canonical format; commands still work but skills are preferred |
| `context: fork` for all skills | Only for one-shot tasks; interactive skills stay in main context | Ongoing | Interactive prompts require main context |
| Hard-coded model in skill | `model` frontmatter field (optional) | Agent Skills spec | Can override per-skill, but not needed here |

**Current (2026-03-12):** The Agent Skills specification is now an open standard adopted by Claude Code, Codex CLI, and ChatGPT. Skills live in `.claude/skills/<name>/SKILL.md`. Project-level skills (in the repo's `.claude/skills/`) are the right choice here — they travel with the project and are available to all developers on the team.

---

## Open Questions

1. **No-changes behavior: exit immediately vs. check for missing articles**
   - What we know: User left this to Claude's discretion
   - What's unclear: Is it worth the disk I/O to scan for missing articles every run?
   - Recommendation: Check for missing articles. The disk I/O cost is negligible (just `existsSync` calls), and the benefit (ensuring all features have docs even after a partial first run) is high. Log: "No repo changes detected. Checking for missing articles..."

2. **Skill article feature map integration**
   - What we know: User left this to Claude's discretion; feature-map.json is scanner output
   - What's unclear: Should manual articles appear in `sawyer-docs translate --features <slug>` output?
   - Recommendation: Do NOT add to feature-map.json. Manual articles are translated immediately at creation time. If a developer needs to re-translate them later, they can use `sawyer-docs translate --features <slug>` with the correct slug — the translate command reads German articles from disk, not from the feature map.

3. **Skill script invocation path**
   - What we know: `tsx` is a devDependency; project uses ESM
   - What's unclear: Will `npx tsx src/skill/new-article.ts` resolve correctly from Claude's cwd during skill execution?
   - Recommendation: Use `npx tsx src/skill/new-article.ts` as primary. Document in SKILL.md that the project must be cloned and `npm install` run. Add a guard in the script to exit with a helpful error if modules can't be resolved.

---

## Validation Architecture

`nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | none (vitest auto-detects) |
| Quick run command | `npm test -- --reporter=verbose` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLI-01 | `run` command accepts `--mobile`, `--dashboard`, `--platform` flags | unit | `npm test -- --reporter=verbose tests/run-command.test.ts` | ❌ Wave 0 |
| CLI-04 | `--dry-run` skips generate/translate API calls, prints preview | unit | `npm test -- --reporter=verbose tests/run-command.test.ts` | ❌ Wave 0 |
| SKILL-01 | Skill helper `generate` subcommand calls `runGeneration()` with correct args | unit | `npm test -- --reporter=verbose tests/skill-new-article.test.ts` | ❌ Wave 0 |
| SKILL-02 | Skill instruction document contains clarifying question guidance | manual-only | Read SKILL.md, verify section exists | — |
| SKILL-03 | Skill helper `generate` subcommand writes German .md file on approval | unit | `npm test -- --reporter=verbose tests/skill-new-article.test.ts` | ❌ Wave 0 |
| SKILL-04 | Skill helper `write-and-translate` subcommand calls `translateArticle()` for each configured lang | unit | `npm test -- --reporter=verbose tests/skill-new-article.test.ts` | ❌ Wave 0 |

**SKILL-02 rationale for manual-only:** The skill's clarifying question behavior lives in the SKILL.md instruction document which is read by Claude at runtime. There is no TypeScript logic to unit test — the verification is reading the instruction document and confirming the guidance is present.

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/run-command.test.ts` — covers CLI-01, CLI-04 (unit tests for run command option handling, dry-run behavior, changed-slug derivation)
- [ ] `tests/skill-new-article.test.ts` — covers SKILL-01, SKILL-03, SKILL-04 (unit tests for skill helper script subcommands, slug collision detection, translation calls)

Note: The `run` command action handler will be difficult to unit test end-to-end (it invokes Claude CLI and DeepL). Focus tests on the helper functions: `deriveSlugsFromChangedRepos()`, `checkSlugCollision()`, dry-run path logic, and the skill helper subcommands with mocked `runGeneration()` and `translateArticle()`.

---

## Sources

### Primary (HIGH confidence)
- Official Claude Code Skills documentation — https://code.claude.com/docs/en/skills — SKILL.md format, frontmatter fields, `disable-model-invocation`, `context: fork`, `allowed-tools`, `$ARGUMENTS` substitution, invocation control table
- Existing codebase: `src/commands/scan.ts`, `src/commands/generate.ts`, `src/commands/translate.ts`, `src/generator/generate.ts`, `src/translator/frontmatter.ts`, `src/translator/writer.ts`, `src/scanner/state.ts`, `src/paths/slugify.ts` — all read directly, verified in project

### Secondary (MEDIUM confidence)
- WebSearch: Claude Code Skills open standard adoption (Dec 2025, Agent Skills spec) — corroborated by official docs content
- WebSearch: `.claude/skills/` as project-level skill location — confirmed by official docs table

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, no new dependencies
- Architecture (run command): HIGH — composition of verified existing functions, pattern confirmed by reading actual source files
- Architecture (SKILL.md format): HIGH — read from official Claude Code docs directly
- Pitfalls: HIGH — derived from reading actual code + official docs edge cases
- Validation: HIGH — existing test files read, framework confirmed from package.json

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable domain — Commander.js, Vitest, and Agent Skills spec are stable; Claude Code Skill format could evolve but slowly)
