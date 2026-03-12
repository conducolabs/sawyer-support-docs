# Phase 3: Article Generation - Research

**Researched:** 2026-03-12
**Domain:** Claude Agent SDK text generation, German-first markdown article authoring, audience-aware prompt design, frontmatter, file writing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Article tone and style:**
- German articles use "Du" (informal) — modern, friendly tone. "Tippe auf den Button..."
- Tone-only differentiation between audiences: end users get simpler vocabulary, admins can handle technical terms. Same structure and depth.
- Single admin article per feature for all admin levels (club, company, super admin). Mentions which roles have access where relevant — no separate articles per role.
- Flexible structure per feature — Claude adapts article structure to fit the content. No rigid per-type templates.

**Article type selection:**
- Generator picks which article types are relevant per feature — not all 4 for every feature. A simple toggle might only need an overview + FAQ.
- One file per feature — all types combined into sections (## Overview, ## Schritt-für-Schritt, ## FAQ, ## Fehlerbehebung). Single file per slug in the feature area directory.
- Article length: Claude's judgment per feature. Simple feature = concise, complex flow = detailed.
- Cross-links to related features only when clearly relevant — not on every article.

**Prompt and generation strategy:**
- Use Claude Code SDK (same `@anthropic-ai/claude-agent-sdk` pattern as Phase 2) for article generation
- Per-feature progress display with spinner — "Generating: Login (3/15)..."
- Supports `--features login,payments` flag to selectively generate for specific slugs
- Batching strategy: Claude's discretion

**Enrollment boundary handling:**
- Inline callout approach — articles for enrollment-related features still get generated but include a callout: "Für die Anmeldung wende Dich an Deine lokale Kontaktperson."
- Claude judges from feature context whether a feature is enrollment-related — no keyword matching
- Generic redirect text, no configurable contact info — each organization handles contact differently
- Enrollment features in feature map: Claude's discretion on whether to keep or filter

### Claude's Discretion
- Batching strategy (one feature at a time vs grouped)
- Exact article structure within each type
- Article length per feature
- Whether enrollment features stay in map or get filtered
- Prompt templates and system prompts for generation
- Temperature and retry logic

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GEN-01 | System generates support articles in German as the primary/source language using Claude AI | `query()` with German-language system prompt; output written to `docs/de/{area}/{slug}.md` via `buildArticlePath('de', ...)` |
| GEN-02 | System generates step-by-step guide articles (numbered instructions for how to do X) | System prompt instructs Claude to include `## Schritt-für-Schritt` section when feature has sequential actions; judge based on feature description |
| GEN-03 | System generates FAQ-style articles (question and answer pairs) | System prompt instructs Claude to include `## FAQ` section when feature has commonly unclear aspects |
| GEN-04 | System generates troubleshooting articles (problem → cause → solution) | System prompt instructs Claude to include `## Fehlerbehebung` section when the feature is prone to user errors |
| GEN-05 | System generates feature overview articles (what X is and how it works) | `## Übersicht` section is always included as the anchor section; Claude judges how much depth to provide |
| GEN-06 | Articles are audience-aware — different content for end users (mobile app) vs club/company admins (dashboard) | Feature's `audience` field drives system prompt instructions; `sourceApp === 'mobile'` → end-user vocabulary; `sourceApp === 'dashboard'` → admin vocabulary |
| GEN-07 | Generated articles include minimal frontmatter metadata (title, language) | YAML frontmatter block at top of each file: `title` derived from feature name, `language: de`; written as part of article string |
| GEN-08 | Articles are written for technical support only — enrollment/onboarding topics direct users to their local contact person | System prompt + per-feature instruction: if Claude detects enrollment context, include callout block; no keyword matching required |
</phase_requirements>

---

## Summary

Phase 3 builds the article generator by reusing the Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) pattern already established in Phase 2. The generator reads `.sawyer-docs/feature-map.json`, iterates over each feature (or a filtered subset via `--features`), calls `query()` once per feature to produce a German markdown article, and writes the result to `docs/de/{featureArea}/{slug}.md` via the existing `buildArticlePath()` helper.

The core engineering challenge is not the SDK call itself — that pattern is proven — but designing a system prompt that reliably produces consistent German articles across many features, audiences, and article types. The system prompt must instruct Claude to: write in German with "Du" address, select relevant article-type sections per feature, include correct YAML frontmatter, differentiate vocabulary by audience, and insert an enrollment callout when appropriate. Temperature 0 is the determinism requirement from STATE.md, but the Claude Agent SDK's `Options` type exposes no `temperature` field directly. Temperature is set via the `settings` object passed to the SDK or via `CLAUDE_TEMPERATURE` environment variable; the correct approach is `settings: { modelSettings: { temperature: 0 } }` (see Architecture Patterns section).

The one-file-per-feature design means the output is a single `.md` file per feature containing all relevant sections. The generator must create the directory tree (`docs/de/{featureArea}/`) before writing the file. The `--features` filter maps to slug matching against the loaded feature map — features not in the filter list are skipped, not deleted.

**Primary recommendation:** One `query()` call per feature with a well-crafted system prompt and a per-feature user prompt. Minimal tool use (`tools: []`) — Claude is writing text, not reading files. Process features sequentially with a spinner per feature; batch size of 1 is the safe default given the nature of the task.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/claude-agent-sdk` | ^0.2.74 (already installed) | Claude AI invocation for article generation | Already in use in Phase 2; established `query()` pattern in codebase |
| `node:fs` | built-in | Write article files to `docs/de/` directory tree | No dependency needed; `fs.mkdirSync` + `fs.writeFileSync` established pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ora` | ^9.3.0 (already installed) | Per-feature spinner progress display | Always — matches existing CLI UX pattern |
| `zod` | ^4.3.6 (already installed) | Validate feature map on load | Already used in `readFeatureMap()`; no new use needed in generator |

### No New Dependencies Needed
Phase 3 requires no new npm packages. All required tools — SDK, logger, config loader, feature map reader, path builder — are already installed and exported.

**Installation:**
```bash
# No new packages — all dependencies already present
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── commands/
│   └── generate.ts        # Entry point — replaces current stub
├── generator/
│   ├── index.ts           # Barrel export
│   ├── prompts.ts         # GENERATION_SYSTEM_PROMPT, buildFeaturePrompt()
│   ├── generate.ts        # runGeneration(feature, config) → string (article text)
│   └── writer.ts          # writeArticle(cwd, feature, content) — mkdir + write
```

This mirrors the Phase 2 scanner structure (`src/scanner/`) which has proven clean to navigate and test.

### Pattern 1: Per-Feature Sequential Generation

**What:** Iterate feature map sequentially. For each feature, call `query()` once, collect the result text, write to disk.
**When to use:** Always — one feature at a time is simplest, debuggable, and safe for the SDK subprocess model.

```typescript
// src/generator/generate.ts
import { query } from '@anthropic-ai/claude-agent-sdk';
import { GENERATION_SYSTEM_PROMPT, buildFeaturePrompt } from './prompts.js';
import type { Feature } from '../scanner/index.js';

export async function runGeneration(
  feature: Feature,
  model: string,
): Promise<string> {
  let articleText = '';

  for await (const message of query({
    prompt: buildFeaturePrompt(feature),
    options: {
      tools: [],                         // No file access needed — text generation only
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 3,                       // Short — just generate the article
      model,
      systemPrompt: GENERATION_SYSTEM_PROMPT,
      settings: { modelSettings: { temperature: 0 } },
    },
  })) {
    if (message.type === 'result' && message.subtype === 'success') {
      articleText = message.result;
    }
    if (message.type === 'result' && message.subtype !== 'success') {
      const errorDetail = 'result' in message ? String(message.result) : message.subtype;
      throw new Error(`Generation failed for "${feature.name}": ${errorDetail}`);
    }
  }

  return articleText;
}
```

### Pattern 2: Temperature 0 via SDK Settings

**What:** The SDK `Options` type has no top-level `temperature` field. Temperature is set through `settings.modelSettings.temperature`.
**Why it matters:** `temperature: 0` is a correctness requirement (STATE.md — determinism). Without it, re-running produces different articles.
**How to apply:**

```typescript
// In query() options:
settings: {
  modelSettings: {
    temperature: 0,
  },
},
```

**Confidence:** MEDIUM — the `Settings` interface in the SDK type definitions does not show `modelSettings` explicitly in the `.d.ts` examined, but `settings` accepts a freeform `Settings` object. The established project precedent (STATE.md, PITFALLS.md) requires temperature 0, and the `settings.model` pattern is confirmed in the SDK types. If `settings.modelSettings.temperature` does not work, the fallback is passing `--temperature 0` via `extraArgs: { temperature: '0' }`.

**Fallback approach (if modelSettings does not work):**
```typescript
extraArgs: { temperature: '0' },
```

### Pattern 3: System Prompt Design

**What:** The system prompt is the core engineering artifact. It defines: language (German, Du-form), available article sections, frontmatter format, audience vocabulary rules, and enrollment callout instruction.
**When to use:** One system prompt for all features — audience and enrollment handling are variable, not separate prompts.

```typescript
// src/generator/prompts.ts
export const GENERATION_SYSTEM_PROMPT = `
You are a technical support writer for sawyer, a sports management platform.

Write German support articles in "Du" form (informal). Example: "Tippe auf den Button...", "Öffne die App...", "Wähle Deine Einstellungen..."

ARTICLE STRUCTURE:
Each article is a single Markdown file. Always start with YAML frontmatter:

---
title: {Feature Name}
language: de
---

Then include only the sections relevant to the feature:
- ## Übersicht — Always include. 1–3 paragraphs describing what the feature does and when to use it.
- ## Schritt-für-Schritt — Include if the feature involves sequential steps the user must follow. Number each step.
- ## FAQ — Include if users commonly have questions or the feature has non-obvious behavior. Use bold questions and plain-text answers.
- ## Fehlerbehebung — Include if users can encounter errors or the feature can fail. Use "Problem / Lösung" structure.

Do not include a section if it adds no value for this particular feature.

AUDIENCE RULES:
- For end_user audience: use everyday language, avoid technical terms, assume mobile app context.
- For admin audience: you may use technical terms (e.g., "Berechtigung", "Konfiguration"), reference role levels (Club-Admin, Company-Admin) where relevant.

ENROLLMENT CALLOUT:
If the feature is related to enrollment, onboarding, or registration (new members joining a club), include this callout immediately after the ## Übersicht section:

> **Hinweis:** Für die Anmeldung wende Dich an Deine lokale Kontaktperson.

This callout replaces step-by-step instructions for enrollment flows — do not include a ## Schritt-für-Schritt section for enrollment features.

LENGTH:
Match length to complexity. A simple toggle feature needs 150–250 words. A complex multi-step flow may need 400–600 words. Do not pad.

OUTPUT:
Return only the Markdown article. No explanations, no code blocks wrapping the markdown, no preamble.
`.trim();

export function buildFeaturePrompt(feature: Feature): string {
  const audienceContext = feature.audience === 'admin'
    ? `This feature is used by admin users (${(feature.adminRoles ?? []).join(', ') || 'all admin levels'}).`
    : `This feature is used by end users in the mobile app.`;

  const apiContext = feature.apiContext
    ? `\n\nAPI/backend context:\n${feature.apiContext}`
    : '';

  return `Write a German support article for the following sawyer feature.

Feature name: ${feature.name}
Feature area: ${feature.featureArea}
Audience: ${audienceContext}
Description: ${feature.description}${apiContext}`;
}
```

### Pattern 4: Article Writer

**What:** Separate function responsible for creating the directory tree and writing the article file.
**Why separate:** Keeps the generator pure (text in, text out) and makes the writer independently testable.

```typescript
// src/generator/writer.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { buildArticlePath } from '../paths/index.js';
import type { Feature } from '../scanner/index.js';

export function writeArticle(cwd: string, feature: Feature, content: string): string {
  const relativePath = buildArticlePath('de', feature.featureArea, feature.slug);
  const absolutePath = resolve(cwd, relativePath);

  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, 'utf-8');

  return relativePath;
}
```

### Pattern 5: Generate Command Wiring

**What:** Replace the stub `generate.ts` command with a full implementation that reads the feature map, applies `--features` filtering, and runs per-feature generation with spinner UI.
**Key decisions from CONTEXT.md:**
- `--features login,payments` — comma-separated slug filter
- Progress display: "Generating: Login (3/15)..."

```typescript
// src/commands/generate.ts (outline)
.option('--features <slugs>', 'Comma-separated list of feature slugs to generate')
.action(async (options) => {
  const featureMap = readFeatureMap(cwd);
  if (!featureMap) { logger.error('No feature map found...'); process.exit(1); }

  let features = featureMap.features;
  if (options.features) {
    const requested = new Set(options.features.split(',').map((s: string) => s.trim()));
    features = features.filter((f) => requested.has(f.slug));
  }

  for (let i = 0; i < features.length; i++) {
    const feature = features[i]!;
    const spinner = logger.spinner(`Generating: ${feature.name} (${i + 1}/${features.length})...`);
    try {
      const content = await runGeneration(feature, config.model);
      const path = writeArticle(cwd, feature, content);
      spinner.succeed(`Generated: ${path}`);
    } catch (err) {
      spinner.fail(`Failed: ${feature.name}`);
      // Log error and continue to next feature
    }
  }
});
```

### Anti-Patterns to Avoid

- **Structured JSON output for article generation:** `outputFormat: { type: 'json_schema' }` is for extraction passes that must return JSON. For article generation, the output IS the text — use `message.result` directly from a `result` subtype `success` message. JSON wrapping adds complexity with no benefit.
- **Multiple `query()` calls per feature (one per article type):** The locked decision is one file per feature with all sections combined. One `query()` call per feature generates the full combined article in a single pass. Multiple calls per feature would produce separate files — incorrect per CONTEXT.md.
- **Running generation in parallel:** Parallel `query()` calls spawn multiple Claude CLI subprocesses simultaneously. This causes rate limit errors and makes spinner display chaotic. Sequential is correct.
- **Using `cwd` to point at docs repo:** The generation pass does not need to read any codebase. Setting `cwd` to the sawyer-docs project root (or even a temp dir) is fine. Setting it to the mobile/dashboard repos adds unnecessary overhead and access.
- **Template-driven rigid section output:** CONTEXT.md explicitly rejects rigid per-type templates. The system prompt must instruct Claude to exercise judgment about which sections are relevant — not force all four sections every time.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| German text generation | Custom template engine or string interpolation | Claude via `query()` | Claude handles idiomatic German, context-appropriate depth, and enrollment detection naturally |
| Directory creation | Custom path resolution logic | `fs.mkdirSync(..., { recursive: true })` | Handles nested directories, no-op if already exists |
| Feature map loading | Custom JSON reader | `readFeatureMap()` from `src/scanner/state.ts` (already exists) | Already Zod-validated; consistent with Phase 2 |
| Article path construction | `path.join` calls inline in commands | `buildArticlePath()` from `src/paths/index.ts` (already exists) | Stable public contract; already tested |
| Progress display | `console.log` with manual formatting | `createLogger()` with `spinner` from `src/ui/logger.ts` (already exists) | Consistent with scan command UX |

**Key insight:** Phase 3 is primarily prompt design and orchestration wiring. All infrastructure (path building, file I/O, progress display, feature map access, config loading) is already built and tested. The new code is mostly in `src/generator/prompts.ts` and the command orchestration in `src/commands/generate.ts`.

---

## Common Pitfalls

### Pitfall 1: Non-Deterministic Article Output

**What goes wrong:** Re-running the generator on the same feature map produces different articles — headings change, tone shifts, sections appear/disappear.
**Why it happens:** Default temperature is > 0, which introduces randomness into the model's token selection.
**How to avoid:** Set `temperature: 0` via `settings: { modelSettings: { temperature: 0 } }` in the `query()` options. If this path is not effective, use `extraArgs: { temperature: '0' }` as fallback.
**Warning signs:** Git diffs show article rewrites on every run with no changes to the feature map.

### Pitfall 2: SDK `message.result` Contains Empty String for Generation

**What goes wrong:** `runGeneration()` returns an empty string even though the spinner succeeded.
**Why it happens:** The `result` field on a `success` message is the final text output. If the system prompt instructs Claude to "return only markdown" but Claude wraps it in a `<article>` tag or similar, the extraction may silently produce empty text.
**How to avoid:** In the system prompt, explicitly say "Return only the Markdown article. No preamble, no code fences around the markdown." Log `articleText.length` at debug level to catch this during development.
**Warning signs:** Generated `.md` files are empty or contain only frontmatter.

### Pitfall 3: Tools Array Not Cleared for Generation

**What goes wrong:** `query()` uses the default Claude Code tool set (Read, Grep, Bash, etc.) when no `tools` option is provided. This means Claude may attempt to read files in the cwd, inflating token cost and turn count.
**Why it happens:** The Phase 2 pattern uses `allowedTools: ['Read', 'Grep', 'Glob']` because scanning genuinely needs file access. Generation does not.
**How to avoid:** Set `tools: []` in the generation `query()` options. This disables all built-in tools — Claude returns text immediately without file exploration.
**Warning signs:** Generation takes many turns (> 3) and costs are unexpectedly high.

### Pitfall 4: `--features` Filter on Name Instead of Slug

**What goes wrong:** User passes `--features "Check-in"` (feature name) but the filter does a slug comparison. No features match, nothing is generated.
**Why it happens:** The feature map has both `name` (human-readable) and `slug` (URL-safe). CONTEXT.md shows `--features login,payments` — these are slugs, not names.
**How to avoid:** Document clearly in CLI help that `--features` takes slugs. Slug is what `buildSlug()` produces from the name. If the feature name is "Member Check-in", its slug is "member-check-in" — the user must pass `--features member-check-in`.
**Warning signs:** `--features` filter produces 0 matches even when feature exists in the map.

### Pitfall 5: Article Frontmatter Written as Plain Text

**What goes wrong:** The frontmatter YAML is written with incorrect syntax — missing triple-dash delimiters, inconsistent indentation, or special characters in the title that break YAML parsing in consuming apps.
**Why it happens:** The system prompt asks Claude to write frontmatter, but Claude may produce slightly different YAML formatting each time (with or without quotes around the title, etc.).
**How to avoid:** Consider injecting the frontmatter programmatically rather than trusting Claude to format it. Generate the article body from Claude, prepend a programmatically constructed frontmatter string:

```typescript
function buildFrontmatter(feature: Feature): string {
  // Escape double quotes in the title
  const safeTitle = feature.name.replace(/"/g, '\\"');
  return `---\ntitle: "${safeTitle}"\nlanguage: de\n---\n\n`;
}
```

Then prepend: `buildFrontmatter(feature) + articleText` where `articleText` is what Claude returns (body only, frontmatter excluded from system prompt).

**Warning signs:** Consuming apps report YAML parse errors on article frontmatter; titles with special characters truncate or break.

### Pitfall 6: Overwriting Articles on Every Run

**What goes wrong:** Re-running `sawyer-docs generate` overwrites all existing articles, destroying any manually-edited content.
**Why it happens:** Without a content-hash gate, the generator always writes unconditionally.
**Design note:** Phase 4 introduces content hash gating for translations. For Phase 3 (generation), the decision in CONTEXT.md is that `--features` provides manual scoping. The generator SHOULD overwrite German articles unconditionally — they are always generated from the feature map, never manually edited. Only translated articles (Phase 4) need hash protection.
**Warning signs:** This pitfall is not a bug for Phase 3 generation — it is the correct behavior. The risk is confusing Phase 3 (regenerate freely) with Phase 4 (gate on content hash).

---

## Code Examples

Verified patterns from existing codebase:

### Reading Feature Map (established pattern from src/scanner/state.ts)
```typescript
// Source: src/scanner/state.ts — readFeatureMap()
const featureMap = readFeatureMap(cwd);
if (!featureMap) {
  logger.error('No feature map found. Run `sawyer-docs scan` first.');
  process.exit(1);
}
```

### SDK Query with Success/Failure Handling (established from src/scanner/passes.ts)
```typescript
// Source: src/scanner/passes.ts — runDiscoveryPass()
for await (const message of query({ prompt, options })) {
  if (message.type === 'result' && message.subtype === 'success') {
    resultText = message.result;
  }
  if (message.type === 'result' && message.subtype !== 'success') {
    const errorDetail = 'result' in message ? String(message.result) : message.subtype;
    throw new Error(`...: ${errorDetail}`);
  }
}
```

### Spinner per Operation (established from src/commands/scan.ts)
```typescript
// Source: src/commands/scan.ts
const spinner = logger.spinner('Scanning mobile repo (Pass 1/3)...');
try {
  // ... work ...
  spinner.succeed(`Mobile scan complete: ${mobileFeatures.length} features found`);
} catch (err) {
  spinner.fail('Mobile scan failed');
  throw err;
}
```

### Building and Writing Article Path
```typescript
// Source: src/paths/paths.ts — buildArticlePath()
// Callers pre-slugify; path builder stays pure (established pattern from STATE.md)
const relativePath = buildArticlePath('de', feature.featureArea, feature.slug);
const absolutePath = resolve(cwd, relativePath);
mkdirSync(dirname(absolutePath), { recursive: true });
writeFileSync(absolutePath, content, 'utf-8');
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate file per article type (guide.md, faq.md, etc.) | Single file per feature with sections | CONTEXT.md decision | Simpler consuming app lookups; one path per feature |
| Formal "Sie" German | Informal "Du" German | CONTEXT.md decision | Matches sawyer brand; "Tippe auf..." vs "Tippen Sie auf..." |
| Rigid templates per article type | Flexible sections based on Claude's judgment | CONTEXT.md decision | Better fit for features that don't need all 4 types |
| One query per article type (4 calls per feature) | One query per feature (all sections combined) | CONTEXT.md decision | Faster, fewer API calls, consistent tone across sections |

**Note on temperature 0 and adaptive thinking:** The SDK Options type includes a `thinking` field (adaptive/enabled/disabled) for extended thinking. For deterministic support article generation, `thinking: { type: 'disabled' }` alongside temperature 0 is the correct combination. Extended thinking increases token cost without benefit for structured text generation tasks.

---

## Open Questions

1. **Does `settings: { modelSettings: { temperature: 0 } }` work in the SDK version ^0.2.74?**
   - What we know: The `Settings` interface in the `.d.ts` does not show `modelSettings` in the portion examined; the `Options.settings` accepts the `Settings` type. The SDK spawns the Claude CLI as a subprocess, and the settings object is passed to it.
   - What's unclear: Whether `modelSettings.temperature` propagates correctly through the subprocess boundary at this SDK version.
   - Recommendation: Wave 0 task should test this with a minimal `query()` call and verify output differs between temperature 0 and temperature 1 for the same prompt. Fallback: `extraArgs: { temperature: '0' }` if `settings` path fails.

2. **Should frontmatter be generated by Claude or prepended programmatically?**
   - What we know: Claude can produce YAML, but consistency is not guaranteed; programmatic frontmatter is perfectly deterministic.
   - What's unclear: This is discretion territory. Either works; the system prompt path is simpler.
   - Recommendation: Programmatically prepend the frontmatter (title + language) and instruct Claude to return the body only. This makes frontmatter deterministic regardless of temperature and eliminates a class of YAML formatting bugs. The body is what varies per feature.

3. **Enrollment detection reliability**
   - What we know: CONTEXT.md says "Claude judges from feature context whether a feature is enrollment-related — no keyword matching."
   - What's unclear: Whether a single `query()` call can reliably detect enrollment context AND write the correct callout, especially for borderline features.
   - Recommendation: Include examples in the system prompt of what counts as enrollment (joining a club, creating a new member account, registration flows). This makes the instruction concrete without becoming keyword-based.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` (exists — `include: ['tests/**/*.test.ts']`) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GEN-01 | `writeArticle()` writes to `docs/de/{area}/{slug}.md` | unit | `npm test -- --reporter=verbose tests/generator-writer.test.ts` | Wave 0 |
| GEN-02 | System prompt contains `## Schritt-für-Schritt` instruction | unit | `npm test -- tests/generator-prompts.test.ts` | Wave 0 |
| GEN-03 | System prompt contains `## FAQ` instruction | unit | `npm test -- tests/generator-prompts.test.ts` | Wave 0 |
| GEN-04 | System prompt contains `## Fehlerbehebung` instruction | unit | `npm test -- tests/generator-prompts.test.ts` | Wave 0 |
| GEN-05 | System prompt always includes `## Übersicht` | unit | `npm test -- tests/generator-prompts.test.ts` | Wave 0 |
| GEN-06 | `buildFeaturePrompt()` produces different audience context for end_user vs admin | unit | `npm test -- tests/generator-prompts.test.ts` | Wave 0 |
| GEN-07 | `buildFrontmatter()` produces valid YAML with title and language fields | unit | `npm test -- tests/generator-prompts.test.ts` | Wave 0 |
| GEN-08 | System prompt contains enrollment callout instruction in German | unit | `npm test -- tests/generator-prompts.test.ts` | Wave 0 |

**Note:** `runGeneration()` (the actual `query()` call) is not unit tested — it calls the live Claude CLI. The unit tests cover the deterministic parts: prompt construction, frontmatter building, and file writing logic. The integration test is the manual smoke test (`sawyer-docs generate --features <slug>` against a real feature map).

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/generator-prompts.test.ts` — covers GEN-02 through GEN-08 prompt shape assertions
- [ ] `tests/generator-writer.test.ts` — covers GEN-01 file writing to correct path

*(Existing test infrastructure: Vitest configured, `tests/` directory exists with 6 test files, no generator tests yet.)*

---

## Sources

### Primary (HIGH confidence)
- `/Users/terhuerne/Development/sawyer-support-docs/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts` — `Options` type (lines 667–1150), `query()` signature, `Settings` interface (lines 2291–2390)
- `/Users/terhuerne/Development/sawyer-support-docs/src/scanner/passes.ts` — established `query()` invocation pattern, message streaming, result extraction
- `/Users/terhuerne/Development/sawyer-support-docs/src/scanner/prompts.ts` — established prompt template pattern (system + per-feature prompts)
- `/Users/terhuerne/Development/sawyer-support-docs/.planning/phases/03-article-generation/03-CONTEXT.md` — all locked decisions
- `/Users/terhuerne/Development/sawyer-support-docs/.planning/STATE.md` — `temperature: 0` as correctness requirement

### Secondary (MEDIUM confidence)
- `.planning/research/PITFALLS.md` — temperature 0 and prompt versioning pitfalls (pre-existing project research)
- `.planning/research/SUMMARY.md` — Article Generator description and design principles

### Tertiary (LOW confidence)
- `settings: { modelSettings: { temperature: 0 } }` path in the SDK — SDK `.d.ts` examined but `modelSettings` not explicitly present in the `Settings` interface portion read. Requires validation in Wave 0.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all tools already installed and used in Phase 2
- Architecture: HIGH — patterns directly mirror Phase 2 scanner structure; all infrastructure exists
- Prompt design: MEDIUM — system prompt effectiveness validated only at runtime; structure is sound but German quality requires a real generation test
- Temperature 0 path: MEDIUM — required by STATE.md, SDK mechanism needs Wave 0 validation
- Pitfalls: HIGH — drawn from existing project PITFALLS.md and direct codebase inspection

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (SDK version pinned; stable domain)
