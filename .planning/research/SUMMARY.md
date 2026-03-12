# Project Research Summary

**Project:** sawyer Support Docs — Multilingual Documentation Generation CLI
**Domain:** AI-powered multilingual support documentation generation from codebases
**Researched:** 2026-03-12
**Confidence:** MEDIUM

## Executive Summary

This is a pipeline CLI tool that scans local frontend/API codebases, generates German-first support documentation using Claude AI, and translates it into multiple languages via DeepL Pro. The correct architecture is a staged pipeline with typed handoffs: Scanner → Change Detector → Article Generator → Translation Engine → File Writer. Each stage is independently testable and resumable on failure. The technology stack is Node.js 22 LTS with TypeScript, commander for CLI structure, the official `@anthropic-ai/sdk` and `deepl-node` clients, `@babel/parser` for AST-based code scanning, and `gray-matter` for frontmatter. All libraries support pure ESM, which is the recommended module format.

The recommended approach is to build the foundational Config + Types layer first, then Scanner, then the Generator/Translation/Writer stages (which can be developed in parallel with stub inputs), and wire everything together into the CLI last. The Claude Code Skill for manual article creation is independent of the scanner and can be layered on once the core generation/translation/writer pipeline is stable. Idempotent file naming, a well-designed frontmatter schema, and a content-hash-based translation gate are not optional quality features — they are foundational correctness requirements that must be built from the first integration, not retrofitted.

The dominant risks are: (1) non-deterministic LLM output creating inconsistent documentation across runs, (2) re-translation overwriting human-edited translated files, (3) the codebase scanner detecting infrastructure components as user-facing features, and (4) DeepL translating product-specific UI labels incorrectly without a glossary. All four risks have concrete mitigations (temperature=0 + rigid templates, content hash gating, AI-assisted feature classification, DeepL glossary API) that must be designed in from the start. A late retrofit of any of these creates significant rework.

---

## Key Findings

### Recommended Stack

The stack is a clean ESM-native Node.js 22 LTS + TypeScript project. The CLI layer uses `commander` (stable, zero deps, idiomatic) with `ora`, `chalk`, and `inquirer` for UX. AI generation uses the official `@anthropic-ai/sdk`; translation uses `deepl-node`. Codebase scanning uses `@babel/parser` for AST extraction (preferred over the TypeScript compiler API which requires `tsconfig.json` in each scanned repo) and `simple-git` for change detection. Configuration is validated at startup with `zod` to prevent cryptic downstream failures. Testing uses `vitest` (ESM-native, avoids Jest's transform overhead) with `msw` for HTTP mocking of AI/DeepL API calls.

**Core technologies:**
- `Node.js 22 LTS` + `TypeScript ~5.x`: runtime and type safety — unified toolchain with target codebases
- `commander ~12.x`: CLI argument parsing — de-facto standard, stable API, zero deps
- `@anthropic-ai/sdk`: Claude API client — official SDK with streaming, retries, and TypeScript types
- `deepl-node`: DeepL Pro translation client — official SDK, handles auth and rate limits
- `@babel/parser ~7.x`: AST extraction from React/RN source — works without tsconfig overhead
- `simple-git ~3.x`: git diff for change detection — cross-platform, no shell-out required
- `gray-matter ~4.x`: frontmatter parsing and writing — embedded in every major static site tool, no churn
- `zod ~3.x`: config schema validation — fails fast with human-readable errors on malformed config
- `vitest ~2.x` + `msw ~2.x`: testing with HTTP mocking — ESM-native, no transform config needed

**Critical version note:** `@anthropic-ai/sdk` and `deepl-node` version numbers from research have LOW confidence (Anthropic releases frequently). Verify both at npmjs.com before installing.

### Expected Features

**Must have (table stakes):**
- CLI entrypoint with `--source`, `--lang`, `--output` flags — foundation for all workflows
- Codebase scanning (React Native + Next.js screen/flow detection) — core value proposition
- German-first article generation for all article types (guide, FAQ, troubleshooting, overview) — primary language of the user base
- DeepL translation pipeline targeting DE, NL, EN-US, TR, UK — required for multilingual output
- Per-language directory structure (`docs/{feature}/{lang}/`) — consumed directly by other apps
- Minimal frontmatter with `title` and `language` — required for consuming apps to render correctly
- Idempotent file naming via stable, deterministic slugs — running twice must not corrupt output
- Audience-aware content for mobile-app vs. dashboard users — different expertise and task contexts
- Dry-run / preview mode — developers need cost/impact visibility before real API calls
- Clear error handling for API failures (DeepL quota, Claude timeout) — actionable, not silent

**Should have (differentiators):**
- Change detection via git diff — avoids regenerating docs for unchanged features, saves API cost
- Claude Code Skill for manual article creation — interactive German draft → approve → translate workflow
- API platform as context provider (not doc target) — enriches docs with real data model/endpoint context
- Feature-identity fingerprinting — stable article filenames derived from feature identity, not timestamps
- Content hash gating on translation — prevents overwriting human-edited translated files

**Defer (v2+):**
- Multi-repo coherence check — high complexity, uncertain ROI at current scale
- DeepL glossary management UI — can use glossary API directly; full management is scope creep
- CI/CD auto-trigger — requires proven quality before removing human review gate
- Staleness CLI command (`--check-staleness`) — valuable after content volume grows

### Architecture Approach

The system is a pipeline CLI with five sequential stages, each emitting a well-typed artifact consumed by the next stage. This structure enables per-stage testing, resumption on failure, and clean `--dry-run` support. The Codebase Scanner uses a Strategy pattern (separate strategies for React Native, Next.js, and API-context-only scanning), keeping scanning logic extensible without restructuring. The Manual Skill Handler is a parallel execution path that bypasses the Scanner and Change Detector, feeding directly into the Article Generator after an interactive clarifying-question loop.

**Major components:**
1. **Config Layer + Types** — startup validation, canonical language codes, shared artifact interfaces; must exist before all other components
2. **Codebase Scanner** (with strategy pattern) — emits `FeatureMap`; uses `@babel/parser` + `simple-git`
3. **Change Detector** + **Snapshot Store** — compares current `FeatureMap` to `snapshot.json`; emits `ChangeSet`
4. **Article Generator** — calls Claude API with per-type prompt templates at `temperature: 0`; emits `ArticleSet` (German)
5. **Translation Engine** — calls DeepL Pro per article per target language with glossary; emits `TranslatedArticleSet`
6. **File Writer** — writes `.md` files to `docs/{feature-slug}/{lang}/article-type.md` with full frontmatter
7. **CLI Entry Point** — orchestrates all stages; supports `--dry-run`, `--skill`, and partial execution modes
8. **Manual Skill Handler** — interactive prompt → clarify → generate → approve loop feeding into stages 5-7

**Snapshot storage:** `.sawyer-docs-cache/snapshot.json` — committed for change tracking but not consumer-visible inside `/docs/`.

### Critical Pitfalls

1. **Translation overwrites human edits** — Store a `source_hash` of the German source in frontmatter (or a sidecar manifest); skip re-translation if hash matches. Support a `locked: true` flag for permanent protection. Build this into the first translation call, never retrofit.

2. **Technical UI terms translated incorrectly** — Build a `config/glossary.json` mapping DE terms to each target language and pass as DeepL `glossary_id`. DeepL glossaries must be pre-created via API (a separate CLI command); they are language-pair specific. This is a day-one requirement, not a polish step.

3. **Scanner detects infrastructure as features** — Do not rely on fully automated feature detection in v1. Use Claude to classify each scanned component as "user-facing / admin / infrastructure" with a confidence score. Provide `scan_exclude_patterns` in config. Consider `// @support-doc: true` annotations.

4. **Non-deterministic LLM output causes inconsistency** — Use `temperature: 0` for all generation calls. Enforce a rigid system prompt template with exact heading structure, required sections, word-count ranges, and explicit register (formal "Sie" in German). Store `prompt_version` in frontmatter; only regenerate when source changed AND prompt version changed.

5. **File path collisions from feature naming** — Use canonical English slugs (never German text) as directory names. Run all slugs through a strict ASCII slugify function. Detect collisions at scan time and fail loudly. This is a public contract — changing path structure forces all consuming apps to update.

---

## Implications for Roadmap

Based on research, the dependency graph and pitfall timing requirements suggest a 5-phase structure.

### Phase 1: Foundation — Config, Types, and File Contract
**Rationale:** Everything else depends on the shared type system and the file path contract. Both must be decided before any other component is built — the path structure is a public API consumed by other applications.
**Delivers:** `Config Layer`, shared `FeatureMap`/`ChangeSet`/`ArticleSet`/`Article` TypeScript types, canonical language code mapping, file path slugify function, collision detection, full frontmatter schema design
**Addresses:** Table stakes: configurable language list, per-language directory structure, minimal frontmatter
**Avoids:** File path collision pitfall (Pitfall 5), frontmatter schema expansion pain (Pitfall 11), language code inconsistency (Pitfall 14)
**Research flag:** Standard patterns — no deep research needed; well-established TypeScript project setup

### Phase 2: Codebase Scanner
**Rationale:** The scanner produces the `FeatureMap` that drives the entire automated pipeline. It also has the most project-specific complexity (React Native + Next.js + API context strategy pattern) and must solve the infrastructure-vs-feature classification problem before any generation work begins.
**Delivers:** Working `Codebase Scanner` with `ReactNativeScanStrategy`, `NextJsDashboardScanStrategy`, `ApiContextStrategy`; feature classification via Claude; `scan_exclude_patterns` config; comment stripping for prompt safety
**Addresses:** Differentiator: multi-repo scanning; table stake: codebase scanning — screen/flow detection
**Avoids:** Infrastructure-as-feature pitfall (Pitfall 3), prompt injection via code comments (Pitfall 9), Claude context window overload (Pitfall 13)
**Research flag:** Needs research-phase — React Native navigation patterns, Next.js App Router vs Pages Router screen enumeration, and the AST extraction approach for each need concrete validation

### Phase 3: Article Generation Pipeline
**Rationale:** With a working `FeatureMap`, article generation can be built against stub or real scan output. Prompt engineering is the most important artifact here and must be treated as a versioned schema.
**Delivers:** `Article Generator` with per-type prompt templates (guide, FAQ, troubleshooting, overview), audience-aware generation (mobile vs. admin), `temperature: 0` configuration, `prompt_version` frontmatter tracking, German-first output
**Addresses:** Table stakes: German-first authoring, article types, configurable AI model, audience-aware content
**Avoids:** Non-deterministic output pitfall (Pitfall 4), register inconsistency, article staleness (Pitfall 10) via `generated_at` + `source_commit` frontmatter
**Research flag:** Needs research-phase — prompt template structure for German support documentation, formal register conventions, per-article-type template design

### Phase 4: Translation Pipeline and DeepL Integration
**Rationale:** Translation depends on a stable `ArticleSet` from Phase 3. This phase also introduces the glossary system and content hash gating — both of which are foundational correctness requirements, not enhancements.
**Delivers:** `Translation Engine` with `deepl-node`, content hash gating (source_hash in frontmatter), `locked: true` override, DeepL glossary pre-creation CLI command, `max_chars_per_run` safety limit, `--dry-run` character cost estimation, `review_recommended: true` flag for TR/UK articles
**Addresses:** Table stakes: translation to configured languages, error handling for API failures; differentiator: translation review gate
**Avoids:** Translation overwriting human edits (Pitfall 1), DeepL term mistranslation (Pitfall 2), character quota exhaustion (Pitfall 6), TR/UK quality issues (Pitfall 8), DeepL glossary pre-creation surprise (Pitfall 12)
**Research flag:** Needs research-phase — current DeepL glossary API limits, language code format verification (EN-US vs EN, etc.), current quota pricing

### Phase 5: Change Detection and Full Pipeline Assembly
**Rationale:** With Scanner + Generator + Translation + Writer all independently working, change detection and the CLI orchestration layer can be added last. This phase also wires everything into a single `generate` command and adds the Manual Skill path.
**Delivers:** `Change Detector` + `Snapshot Store` (`.sawyer-docs-cache/snapshot.json`), scoped git diff with semantic filtering, `--dry-run` pipeline dry run, full CLI `generate` command orchestrating all stages, `Manual Skill Handler` for interactive article creation
**Addresses:** Differentiators: change detection via git diff, Claude Code Skill for manual creation; table stakes: dry-run mode, idempotent output
**Avoids:** Git diff false positives (Pitfall 7), unnecessary regeneration/translation cost
**Research flag:** Standard patterns — git diff scoping and snapshot comparison are well-documented; Manual Skill Handler follows established Claude Code interaction patterns

### Phase Ordering Rationale

- **Types before everything:** The shared artifact type system is the contract between all pipeline stages. Building any stage without finalized types creates throwaway work.
- **Scanner before Change Detector:** Change detection depends on having a stable `FeatureMap` format to compare against.
- **Generator and Translator can be built in parallel** once types are defined, using stub inputs — this is explicitly called out in the architecture research.
- **Glossary system must ship with translation, not after:** Once translation runs without a glossary, teams start seeing incorrect UI term translations and lose trust. There is no safe "add it later" window.
- **Content hash gating must ship with translation:** Same reasoning — manually corrected translations will be silently overwritten on the first re-run without this.
- **Manual Skill Handler last:** It reuses Article Generator + Translation Engine + File Writer, and these stages must be stable before the Skill can be built on top of them.

### Research Flags

Phases needing deeper research during planning:
- **Phase 2 (Scanner):** React Native screen enumeration, Next.js App Router vs Pages Router route detection, and the AST extraction patterns for each framework need concrete validation. The strategy pattern interfaces should be defined based on actual component tree patterns.
- **Phase 3 (Article Generation):** German-language support documentation prompt engineering, formal register conventions, and the per-article-type template structure are domain-specific and benefit from targeted research.
- **Phase 4 (Translation):** Current DeepL glossary API specifics (creation limits, language pair restrictions, caching behavior) and current language code format requirements should be verified against live documentation before implementation.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** TypeScript project setup, zod config validation, and file slugification are well-documented with stable patterns.
- **Phase 5 (Pipeline Assembly):** CLI orchestration with commander and git diff scoping via simple-git are well-understood. Snapshot diffing is straightforward JSON comparison.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Library choices are well-reasoned; exact versions for `@anthropic-ai/sdk` and `deepl-node` are LOW confidence and must be verified at npmjs.com before installation |
| Features | MEDIUM | Table stakes derived from comparable tools (Mintlify, GitBook, ReadMe.io) from training data; no live competitor verification conducted |
| Architecture | MEDIUM | Pipeline + Strategy patterns are well-established and appropriate; component boundaries derived from project requirements with HIGH confidence; specific API behaviors (rate limits, context windows) are MEDIUM |
| Pitfalls | MEDIUM | Most pitfalls are logically derived from system design and well-understood in the domain; TR/UK DeepL quality assessment is LOW confidence and needs native speaker validation; glossary API behavior needs verification |

**Overall confidence:** MEDIUM

### Gaps to Address

- **`@anthropic-ai/sdk` and `deepl-node` current versions**: Verify at npmjs.com before any `npm install`. Anthropic releases frequently. Resolution: pin exact versions after verification at project start.
- **DeepL glossary API current limits**: Research cites training knowledge. Current limits (max glossary entries, supported language pairs, caching rules) must be verified at https://www.deepl.com/docs-api before Phase 4 implementation.
- **DeepL language code format**: `EN-US` vs `EN`, `DE` vs `de` — the exact format required by the current SDK version must be confirmed. Use `deepl-node`'s exported `TargetLanguageCode` enum to avoid hardcoding.
- **Turkish and Ukrainian translation quality**: Assessment is LOW confidence. Recommend sourcing 5-10 sample translations from DeepL for sport/club management vocabulary before committing to TR/UK in the initial launch language set.
- **React Native navigation library detection**: The scanner strategy for mobile app screen detection depends on which navigation library is in use (React Navigation, Expo Router). This must be confirmed against the actual mobile-app repo before Scanner implementation begins.
- **`vitest` current major version**: Research notes v2 was current as of mid-2025; verify whether v3 has released before installing.

---

## Sources

### Primary (HIGH confidence)
- `.planning/PROJECT.md` — project requirements, scope decisions, out-of-scope constraints

### Secondary (MEDIUM confidence)
- Training knowledge (cutoff August 2025): commander, gray-matter, simple-git, @babel/parser, zod, chalk, ora — library choices and API patterns
- Training knowledge: React Native + Next.js codebase structure patterns
- Training knowledge: Multilingual i18n file organization patterns
- Training knowledge: Pipeline/stage architecture for CLI tools
- Training knowledge: Mintlify, GitBook, Docusaurus, ReadMe.io — feature landscape comparison

### Tertiary (LOW confidence — verify before implementation)
- Training knowledge: `@anthropic-ai/sdk` version number — verify at https://www.npmjs.com/package/@anthropic-ai/sdk
- Training knowledge: `deepl-node` version number — verify at https://www.npmjs.com/package/deepl-node
- Training knowledge: DeepL glossary API limits and language pair restrictions — verify at https://www.deepl.com/docs-api
- Training knowledge: Turkish/Ukrainian DeepL quality for sport/club management domain — verify with current DeepL quality benchmarks and native speaker review

---
*Research completed: 2026-03-12*
*Ready for roadmap: yes*
