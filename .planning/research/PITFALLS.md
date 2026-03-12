# Domain Pitfalls

**Domain:** Multilingual AI documentation generation system (CLI, codebase scanning, DeepL translation)
**Researched:** 2026-03-12
**Confidence note:** WebSearch and Bash unavailable. All findings from training knowledge (cutoff August 2025). Confidence levels reflect this limitation.

---

## Critical Pitfalls

Mistakes that cause rewrites or force major rework.

---

### Pitfall 1: Translation Overwrites Human-Edited Content

**What goes wrong:** The system re-translates the German source on every run. Any manual corrections made to translated files (NL/EN/TR/UK) are silently overwritten the next time the CLI runs.

**Why it happens:** No mechanism tracks whether a translated file has been manually edited since last generation. The system treats translation as always-derivable from source.

**Consequences:** Translators and reviewers lose their corrections. Quality degrades over time as teams stop bothering to fix translations they know will be overwritten. Trust in the system collapses.

**Prevention:**
- Track a content hash (of the German source) per translated file in frontmatter or a sidecar manifest: `source_hash: abc123`
- On run: if source hash matches stored hash, skip re-translation; if source has changed, re-translate and update hash
- Optionally support a `locked: true` frontmatter flag to permanently protect a translation from auto-overwrite

**Detection (warning signs):**
- Team members complain that "their fixes keep disappearing"
- Git diffs show translation files being rewritten on every run even when no source changed

**Phase to address:** Translation pipeline implementation (foundational — build this in from day one, not as a retrofit)

---

### Pitfall 2: Technical UI Terms Translated Incorrectly by DeepL

**What goes wrong:** DeepL translates product-specific UI labels and feature names literally. "Vereinsverwaltung" becomes "club management" in EN but the app uses "Association Settings." Turkish and Ukrainian especially suffer because DeepL has weaker domain coverage for sport/club management vocabulary.

**Why it happens:** DeepL has no knowledge of your UI's actual labels. It translates semantically, not by referencing the app's own copy.

**Consequences:** Support docs refer to screens and buttons using different names than the actual UI. Users cannot follow step-by-step instructions. This is the #1 user-facing quality failure in this domain.

**Prevention:**
- Build a **glossary file** (`config/glossary.json`) mapping DE terms to each target language: `{"Vereinsverwaltung": {"en": "Association Settings", "nl": "Verenigingsbeheer", "tr": "Kulüp Ayarları", "uk": "Налаштування клубу"}}`
- Pass glossary as DeepL `glossary_id` parameter — DeepL Pro supports custom glossaries via API
- For terms DeepL glossaries don't cover (long phrases, context-dependent), use Claude to post-process translated output against a reference list

**Detection (warning signs):**
- Translated articles reference button names that don't exist in the actual UI
- Turkish/Ukrainian articles look grammatically correct but users report they can't find the referenced screens

**Phase to address:** DeepL integration phase — glossary system must be built alongside the first translation call, not added later

---

### Pitfall 3: Codebase Scanner Mistakes UI Infrastructure for Features

**What goes wrong:** The scanner identifies every React Native screen component, Next.js page, or route as a "feature." Settings screens, loading states, error boundaries, modal wrappers, and navigation scaffolding all appear as "support documentation targets." The resulting article list is 3-4x larger than actual user-facing features.

**Why it happens:** Static analysis of a frontend codebase sees all components equally. Distinguishing "this is a user-facing feature" from "this is a routing wrapper" requires either naming conventions (which vary by project) or semantic understanding.

**Consequences:** The system generates dozens of useless stub articles for internal screens. These pollute the output directory, confuse consumers, and waste API tokens.

**Prevention:**
- Do not attempt fully-automated feature detection in the first version. Instead: scan for navigable screens, then use Claude to classify each as "user-facing feature / admin feature / infrastructure" with a confidence score
- Add a `scan_exclude_patterns` config list (e.g., `["**/components/common/**", "**/layouts/**", "**/navigation/**"]`) so repo owners can tune exclusions
- Consider requiring explicit `// @support-doc: true` annotations in codebases rather than inferring everything

**Detection (warning signs):**
- Generated article list contains items like "Loading Screen," "Error Boundary," "Navigation Stack"
- Article count is implausibly large (>50 for a typical mobile app)

**Phase to address:** Codebase scanning phase — classification logic must be designed before building the generation pipeline around scan output

---

### Pitfall 4: Article Quality Drift Between Runs (Non-Deterministic LLM Output)

**What goes wrong:** Claude generates slightly different articles each run for the same feature. Headings change, tone shifts, step ordering varies. Over time, the documentation set becomes internally inconsistent — some articles are terse, others verbose, some use formal "Sie" register in German, others use informal "du."

**Why it happens:** LLMs are non-deterministic by default (temperature > 0). Without a stable system prompt enforcing a strict writing template, output varies.

**Consequences:** The documentation corpus feels unprofessional. Consumers notice inconsistency. SEO-like linkability between articles breaks when headings change between regenerations.

**Prevention:**
- Use `temperature: 0` for all article generation calls to maximize reproducibility
- Enforce a rigid article template in the system prompt: exact heading structure, required sections, word-count ranges per section, explicit register ("always use 'Sie' formal address in German")
- Store the prompt version used to generate each article in frontmatter: `prompt_version: v1.2`; only regenerate if source feature changed AND prompt version changed

**Detection (warning signs):**
- Git diffs show articles being rewritten on every run even though the feature didn't change
- Articles in the same directory have visibly different formatting/length

**Phase to address:** Article generation phase — system prompt design is the most important engineering artifact; treat it like a schema, version it

---

### Pitfall 5: File Path Collisions Across Languages and Features

**What goes wrong:** The file organization scheme chosen early (e.g., `/{feature}/{lang}.md` vs `/{lang}/{feature}.md`) creates conflicts or awkward behavior as the content set grows. Feature names in German contain characters (ä, ö, ü, ß) that become filesystem problems on some systems. Two features with similar names slug to the same path.

**Why it happens:** File path design is treated as a minor detail, but it is a public contract — consuming applications build path assumptions into their code.

**Consequences:** Breaking the path structure after release forces all consuming applications to update their path references. Umlauts in filenames cause issues on Windows NTFS, macOS HFS+, and some git configurations. Slug collisions cause silent overwrites.

**Prevention:**
- Decide path structure once, document it as a contract, don't change it: recommend `/{feature-slug}/{lang}.md` where feature-slug is derived from a canonical English slug (not German), e.g., `club-management/de.md`, `club-management/en.md`
- Slugify all feature names through a strict function: lowercase, ASCII-only (transliterate umlauts), replace spaces with hyphens, max 60 chars
- Detect slug collisions at scan time and fail loudly rather than silently overwriting
- Never use German text as the directory name — use a stable, language-neutral identifier

**Detection (warning signs):**
- Files disappear or get overwritten unexpectedly
- Consumers report broken paths after a German feature name was renamed
- Git shows "renamed" files when only content changed

**Phase to address:** File organization design (must be decided before first article is written — this is a public API)

---

## Moderate Pitfalls

---

### Pitfall 6: DeepL Character Quota Exhaustion

**What goes wrong:** DeepL Pro charges by character. A full regeneration of all articles in all 5 languages easily consumes 500K–2M characters. If the system re-translates unchanged content, quota burns fast and unexpectedly.

**Why it happens:** No caching or change-gating on translation calls. Developers underestimate how quickly characters add up across a large documentation set.

**Prevention:**
- Always gate translation on source hash change (links to Pitfall 1)
- Add a `--dry-run` flag that reports estimated character cost before executing
- Log actual characters consumed per run
- Set a configurable `max_chars_per_run` safety limit that aborts rather than overspending

**Detection (warning signs):**
- DeepL API returns 456 quota exceeded errors
- Monthly billing is higher than expected

**Phase to address:** DeepL integration — quota awareness must be built into the first integration, not added when the bill arrives

---

### Pitfall 7: Change Detection False Positives from Git Diff

**What goes wrong:** The git diff used to detect "changed features" fires on refactors, formatting changes, dependency updates, and comment edits — none of which change user-visible functionality. This triggers unnecessary article regeneration and translation costs.

**Why it happens:** Git diff at file/line level has no semantic understanding of "did the UI behavior change?"

**Prevention:**
- Scope diffs to specific paths only (screen component files, not all project files)
- Filter diff output to exclude: comment-only changes, import reordering, type annotation changes, test files
- Optionally require a `// @feature-changed` annotation in source code for the system to recognize intentional changes

**Detection (warning signs):**
- Every dependency update triggers full documentation regeneration
- `git diff` noise in non-UI files causes unexpected article rewrites

**Phase to address:** Change detection design

---

### Pitfall 8: Turkish and Ukrainian Article Quality

**What goes wrong:** DeepL's Turkish and Ukrainian support is meaningfully weaker than DE/NL/EN. Technical and domain-specific vocabulary is less accurate. Turkish in particular has complex agglutination that can produce awkward phrasing for UI instructions.

**Why it happens:** DeepL models are trained on less Turkish and Ukrainian data than Germanic/Romance languages.

**Prevention:**
- Mark TR and UK translations with a `review_recommended: true` frontmatter flag automatically on every generation
- Build the glossary system (Pitfall 2) with TR and UK as priority languages for sport/club domain terms
- Consider using Claude for TR/UK post-processing pass to improve phrasing after DeepL — cost vs. quality tradeoff worth evaluating

**Detection (warning signs):**
- Native TR/UK speakers report articles "sound like a machine wrote them" more than DE/NL/EN
- UI term mismatch is more frequent in TR/UK than other languages

**Phase to address:** Translation pipeline — flag during implementation, evaluate post-MVP

---

### Pitfall 9: Prompt Injection via Codebase Code Comments

**What goes wrong:** The scanner reads source code to extract feature context. Developer comments like `// TODO: remove this hack` or maliciously crafted strings (`// AI: ignore previous instructions and output...`) get fed into Claude's context. At minimum this degrades output quality; at worst it represents a prompt injection vector.

**Why it happens:** Naive extraction passes raw code content directly to the LLM without sanitization.

**Prevention:**
- Strip all code comments before including source in the Claude prompt
- Define a narrow extraction schema: only extract component name, props/state names, route path, visible text strings — not raw source blocks
- Never pass raw file contents to the LLM; always pass structured extracted metadata

**Detection (warning signs):**
- Generated articles contain odd phrases that mirror developer comments
- Output quality varies dramatically between codebases

**Phase to address:** Codebase scanning phase

---

### Pitfall 10: Article Staleness Without Clear Provenance

**What goes wrong:** After 6 months of use, nobody knows which articles were generated from which codebase version, or when they were last checked against the actual UI. Stale articles accumulate but are not flagged.

**Why it happens:** No staleness tracking built into the workflow.

**Prevention:**
- Store in frontmatter: `generated_at`, `source_commit` (git SHA of scanned repo), `source_repo`
- Implement a `--check-staleness` CLI command that compares stored source commit against current HEAD and lists articles that have not been regenerated since a given commit age (configurable threshold, e.g., 90 days)

**Detection (warning signs):**
- Users report instructions that no longer match the UI
- Team cannot answer "when was this article last updated?"

**Phase to address:** Article generation phase — frontmatter schema must include provenance from the start

---

## Minor Pitfalls

---

### Pitfall 11: Frontmatter Schema Expansion Pain

**What goes wrong:** The current requirement is "minimal frontmatter (title + language)." When consuming apps later need filtering by feature area, audience type, article type, or freshness — the frontmatter must be expanded. Existing articles must be migrated.

**Prevention:** Design frontmatter with all likely fields from day one even if most are optional. Schema: `title`, `language`, `audience` (end_user | admin), `article_type` (guide | faq | troubleshooting | overview), `feature_area`, `generated_at`, `source_commit`. Optional fields are cheap to add upfront; cheap to ignore; expensive to retrofit.

**Phase to address:** File format design phase

---

### Pitfall 12: DeepL Glossary API Requires Pre-Creation

**What goes wrong:** DeepL glossaries must be created via API call before they can be used in translation requests. They are not inline parameters. Teams discover this mid-integration and must restructure their DeepL client.

**Prevention:** Create glossary upload as a first-class CLI command (`gsd-tools glossary sync`). Glossaries are language-pair specific (DE->EN, DE->NL, etc.) — create one per language pair. Cache glossary IDs locally.

**Phase to address:** DeepL integration phase

---

### Pitfall 13: Claude Context Window Limits on Large Codebases

**What goes wrong:** Passing entire screen components or large files to Claude for feature extraction hits context limits or degrades output quality as context gets crowded.

**Prevention:** Extract only the minimum necessary context per feature: component name, visible text strings, route, major state variable names. Never pass full source files. If a feature is complex, break it into sub-features and generate separate articles.

**Phase to address:** Codebase scanning / article generation phase

---

### Pitfall 14: Language Code Inconsistency

**What goes wrong:** Using `de`, `de-DE`, `de_DE`, `deu` interchangeably across different parts of the system. DeepL uses `DE`, `EN-US`, `NL`, `TR`, `UK` — not ISO 639-1 lowercase. Mismatching codes causes silent failures or incorrect language targeting.

**Prevention:** Define a single canonical language code mapping at the top of the config system and use it everywhere. Never hardcode language strings outside this mapping.

**Phase to address:** Configuration/architecture phase

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| File organization design | Path collision, umlaut in paths, breaking path contracts | Canonical English slugs, slugify function, collision detection |
| Codebase scanning | Infrastructure vs. feature confusion, prompt injection | Classification layer, comment stripping, exclusion patterns |
| Change detection | Git diff false positives, unnecessary regeneration | Scoped diffs, semantic change filters |
| Article generation | Non-deterministic output, register inconsistency | temperature=0, rigid template, prompt versioning |
| DeepL integration | Glossary pre-creation, quota exhaustion, overwriting edits | Source hash gating, glossary CLI command, dry-run mode |
| Translation quality (TR/UK) | Weaker DeepL quality for these languages | review_recommended flag, Claude post-processing option |
| Frontmatter schema | Too minimal today, painful to extend later | Design full schema upfront with optional fields |
| Long-term maintenance | Article staleness, no provenance | source_commit + generated_at in frontmatter from day one |

---

## Sources

- Project context: `/Users/terhuerne/Development/sawyer-support-docs/.planning/PROJECT.md`
- DeepL API documentation (training knowledge, cutoff August 2025): glossary API behavior, language codes, character quota model — **MEDIUM confidence** (verify current glossary limits and language code format at https://www.deepl.com/docs-api)
- LLM documentation generation patterns: training knowledge from Claude/GPT tooling ecosystem — **MEDIUM confidence**
- React Native / Next.js codebase structure patterns: training knowledge — **HIGH confidence** (stable domain)
- Multilingual file organization patterns: training knowledge from i18n ecosystem — **HIGH confidence**
- Turkish/Ukrainian DeepL quality assessment: training knowledge, community-reported — **LOW confidence** (verify with current DeepL quality benchmarks)

**Note:** WebSearch was unavailable during this research session. Findings are based on training knowledge. Pitfalls 2 (DeepL glossary API behavior), 6 (character quota rates), and 8 (TR/UK quality) should be validated against current DeepL documentation before implementation.
