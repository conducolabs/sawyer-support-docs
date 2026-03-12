# Phase 3: Article Generation - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Claude AI generates German-first support articles from the structured feature map produced in Phase 2. Articles cover all relevant types (guide, FAQ, troubleshooting, overview) per feature, written for the correct audience. No translation — just German source articles. No scanning — feature map is the input.

</domain>

<decisions>
## Implementation Decisions

### Article tone and style
- German articles use "Du" (informal) — modern, friendly tone. "Tippe auf den Button..."
- Tone-only differentiation between audiences: end users get simpler vocabulary, admins can handle technical terms. Same structure and depth.
- Single admin article per feature for all admin levels (club, company, super admin). Mentions which roles have access where relevant — no separate articles per role.
- Flexible structure per feature — Claude adapts article structure to fit the content. No rigid per-type templates.

### Article type selection
- Generator picks which article types are relevant per feature — not all 4 for every feature. A simple toggle might only need an overview + FAQ.
- One file per feature — all types combined into sections (## Overview, ## Schritt-für-Schritt, ## FAQ, ## Fehlerbehebung). Single file per slug in the feature area directory.
- Article length: Claude's judgment per feature. Simple feature = concise, complex flow = detailed.
- Cross-links to related features only when clearly relevant — not on every article.

### Prompt and generation strategy
- Use Claude Code SDK (same `@anthropic-ai/claude-agent-sdk` pattern as Phase 2) for article generation
- Per-feature progress display with spinner — "Generating: Login (3/15)..."
- Supports `--features login,payments` flag to selectively generate for specific slugs
- Batching strategy: Claude's discretion

### Enrollment boundary handling
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

</decisions>

<specifics>
## Specific Ideas

- One file per feature keeps things simple for consuming apps — they look up `docs/de/{area}/{slug}.md` and get everything about that feature
- "Du" tone matches the sawyer product's modern, friendly brand
- Generator should read the feature map from `.sawyer-docs/feature-map.json` and write to `docs/de/{area}/{slug}.md` using `buildArticlePath` from Phase 1
- Enrollment callout should feel natural in the article, not block the entire article from being generated

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/scanner/schema.ts` — `Feature` type with name, slug, featureArea, sourceApp, audience, adminRoles, description, apiContext
- `src/scanner/state.ts` — `readFeatureMap()` reads `.sawyer-docs/feature-map.json`
- `src/paths/index.ts` — `buildArticlePath()` produces `docs/{lang}/{area}/{slug}.md`
- `src/paths/slugify.ts` — `buildSlug()` for deterministic slug generation
- `src/config/loader.ts` — `loadConfig()` with model setting from config
- `src/ui/logger.ts` — `createLogger()` with spinner, info, warn, error, success
- `src/commands/generate.ts` — stub command, ready to be implemented

### Established Patterns
- Claude Agent SDK `query()` with `cwd`, `permissionMode: 'bypassPermissions'`, streaming (Phase 2)
- Zod for schema validation
- ESM-only TypeScript with `.js` import extensions
- Commander.js subcommand pattern
- Per-operation spinner with succeed/fail

### Integration Points
- `src/commands/generate.ts` is the entry point — receives `--features` filter flag
- Feature map from `.sawyer-docs/feature-map.json` is the input
- Output goes to `docs/de/{area}/{slug}.md` (German only — translation is Phase 4)
- Config `model` field determines which Claude model to use

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-article-generation*
*Context gathered: 2026-03-12*
