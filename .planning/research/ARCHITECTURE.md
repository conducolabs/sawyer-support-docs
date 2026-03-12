# Architecture Patterns

**Domain:** Multilingual documentation generation system (CLI + AI + Translation pipeline)
**Researched:** 2026-03-12
**Confidence:** MEDIUM — Based on well-established CLI tool and AI pipeline patterns. No external sources available during research session; reflects standard industry architecture for this class of system.

---

## Recommended Architecture

The system is a **pipeline CLI** composed of five distinct stages that execute in sequence. Each stage has a single responsibility and passes a structured artifact to the next stage. The pipeline can run fully automated (scan → generate → translate → write) or partially (manual skill: prompt → generate → approve → translate → write).

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLI Entry Point                            │
│                   (argument parsing, config loading)                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Codebase Scanner                             │
│   Reads local repos (mobile-app, dashboard, platform-api)           │
│   Emits: FeatureMap (normalized list of features + context)         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  FeatureMap
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Change Detector                               │
│   Runs git diff against previous scan state                         │
│   Emits: ChangeSet (new / modified / removed features)              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  ChangeSet
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Article Generator                              │
│   Calls Claude API with feature context + prompt templates          │
│   Produces German-language Markdown articles                        │
│   Emits: ArticleSet (German .md files in-memory)                    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  ArticleSet (German)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Translation Engine                              │
│   Calls DeepL Pro API per target language                           │
│   Emits: TranslatedArticleSet (German + N language variants)        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  TranslatedArticleSet
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        File Writer                                  │
│   Writes .md files to output directory                              │
│   Enforces directory structure: /docs/{feature}/{lang}/article.md  │
└─────────────────────────────────────────────────────────────────────┘


Manual Skill Path (Claude Code Skill):

  Operator prompt → Skill Handler → (clarifying Q&A loop)
                                         │
                                         ▼
                               Article Generator (German proposal)
                                         │
                                         ▼
                               Operator approval gate
                                         │
                                         ▼
                               Translation Engine → File Writer
```

---

## Component Boundaries

| Component | Responsibility | Inputs | Outputs | Communicates With |
|-----------|---------------|--------|---------|-------------------|
| **CLI Entry Point** | Parse args, load config, orchestrate pipeline | CLI args, `.env` / config file | Config object, run mode | All components (orchestrator) |
| **Codebase Scanner** | Walk source repos, extract UI features, API context | Local repo paths | FeatureMap | Change Detector |
| **Change Detector** | Compare current FeatureMap to previous scan snapshot | FeatureMap, snapshot store | ChangeSet | Article Generator |
| **Article Generator** | Build prompts, call Claude API, produce German Markdown | ChangeSet (or manual spec), prompt templates | ArticleSet (German) | Translation Engine |
| **Translation Engine** | Call DeepL Pro API for each target language | ArticleSet, language config | TranslatedArticleSet | File Writer |
| **File Writer** | Write .md files to correct directory layout | TranslatedArticleSet, output path config | .md files on disk | (terminal — no downstream component) |
| **Manual Skill Handler** | Drive interactive article creation via Claude Code | Operator natural-language prompt | Feeds Article Generator after approval | Article Generator, Translation Engine |
| **Snapshot Store** | Persist scan state between runs for change detection | FeatureMap | Previous FeatureMap | Change Detector |
| **Config Layer** | Centralize all runtime configuration | CLI args, env vars, config file | Config object | CLI Entry Point |

---

## Data Flow

### Automated Pipeline Flow

```
Local repo paths (CLI args)
        │
        ▼
[Codebase Scanner]
        │
        │  FeatureMap: { features: [{ id, name, source, audience, screens, apiContext }] }
        ▼
[Change Detector]
        │
        │  ChangeSet: { new: [...], modified: [...], removed: [...] }
        ▼
[Article Generator]
        │  (calls Claude API with feature context + article type template)
        │
        │  ArticleSet: { articles: [{ featureId, type, lang: "de", content: string, frontmatter }] }
        ▼
[Translation Engine]
        │  (calls DeepL Pro API once per article × per target language)
        │
        │  TranslatedArticleSet: { articles: [{ featureId, type, lang, content, frontmatter }] }
        ▼
[File Writer]
        │
        ▼
docs/{feature-area}/{lang}/{article-slug}.md  (on disk)
```

### Manual Skill Flow

```
Operator writes Claude Code prompt describing article need
        │
        ▼
[Manual Skill Handler]
        │  Asks clarifying questions (audience, article type, feature scope)
        │
        ▼
[Article Generator] — produces German draft
        │
        ▼
Operator reviews draft (in Claude Code conversation)
        │
   approved? ──No──► revise loop back to Article Generator
        │ Yes
        ▼
[Translation Engine] → [File Writer]
        │
        ▼
Files land locally, operator commits if satisfied
```

### Snapshot Store Flow

```
[Codebase Scanner] ──writes──► snapshot.json (current FeatureMap)
[Change Detector]  ──reads───► snapshot.json (previous FeatureMap)

snapshot.json location: repo root or configurable .planning/ path
Format: JSON — featureId → { hash, lastSeen, source }
```

---

## Patterns to Follow

### Pattern 1: Pipeline with Typed Stage Artifacts

Each pipeline stage emits a well-typed data structure. The next stage depends only on that type, not on the internals of the previous stage.

**When:** Always — this is the core structural pattern.

**Why:** Stages can be tested in isolation. The pipeline can be resumed at any stage (e.g., re-translate without re-scanning). Errors are localized.

```typescript
// Example artifact types
interface FeatureMap {
  scannedAt: string;
  features: Feature[];
}

interface ChangeSet {
  new: Feature[];
  modified: Array<{ previous: Feature; current: Feature }>;
  removed: Feature[];
}

interface ArticleSet {
  articles: Article[];
}

interface Article {
  featureId: string;
  type: 'guide' | 'faq' | 'troubleshooting' | 'overview';
  audience: 'end-user' | 'admin';
  lang: string; // BCP-47, e.g. "de"
  slug: string;
  frontmatter: { title: string; language: string };
  content: string; // Markdown body
}
```

### Pattern 2: Strategy Pattern for Scanner Targets

Each codebase type (React Native mobile app, Next.js dashboard, Node.js API) requires different scanning logic. A strategy per target type keeps scanner logic clean.

**When:** Codebase Scanner implementation.

```typescript
interface ScanStrategy {
  scan(repoPath: string): Promise<Feature[]>;
}

class ReactNativeScanStrategy implements ScanStrategy { /* mobile */ }
class NextJsDashboardScanStrategy implements ScanStrategy { /* dashboard */ }
class ApiContextStrategy implements ScanStrategy { /* API context only */ }
```

### Pattern 3: Prompt Template per Article Type

Article types (guide, FAQ, troubleshooting, overview) require different Claude prompts and different output structures. Externalize templates, do not embed in code.

**When:** Article Generator implementation.

Store templates in `/src/templates/prompts/{article-type}.md` or similar. Inject feature context at generation time.

### Pattern 4: Rate-Limit-Aware External API Clients

Both Claude and DeepL have rate limits. Wrap each external API call in a client that handles retries with exponential backoff, respects rate limits, and surfaces errors clearly.

**When:** Article Generator (Claude) and Translation Engine (DeepL).

```typescript
class DeepLClient {
  async translate(text: string, sourceLang: string, targetLang: string): Promise<string>;
  // Internally: retry on 429, respect Retry-After header, batch where possible
}
```

### Pattern 5: Dry-Run Mode

The CLI must support a `--dry-run` flag that executes all pipeline stages but does not write files and does not make paid API calls. Use for validation of scan/change detection without cost.

**When:** CLI Entry Point design.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Monolithic Pipeline Function

**What:** A single `run()` function that scans, generates, translates, and writes in one block.

**Why bad:** Impossible to test individual stages, impossible to resume on failure, impossible to add `--dry-run` or partial execution modes cleanly.

**Instead:** Compose named stage functions with typed handoffs between them.

### Anti-Pattern 2: Hardcoding Language List

**What:** `const LANGUAGES = ['nl', 'en', 'tr', 'uk']` embedded in translation code.

**Why bad:** Adding a language requires a code change. Requirements explicitly call for configurability.

**Instead:** Language list lives in config (CLI arg or config file), Translation Engine receives it as input.

### Anti-Pattern 3: Mixing Scan Logic with Generation Logic

**What:** Scanner directly calls Claude to generate articles while iterating over files.

**Why bad:** Scan and generation have different failure modes and costs. Mixing them means a Claude API failure aborts the scan, or re-scanning triggers unnecessary AI calls.

**Instead:** Scan produces a FeatureMap. Generation is a separate stage that consumes it.

### Anti-Pattern 4: Writing German and Translated Files as One Step

**What:** Translate inline during generation, write all languages at once per feature.

**Why bad:** A DeepL failure for one language corrupts the generation step. German source is lost if file writing fails mid-loop.

**Instead:** Write German first (or hold in memory), then run translation as a distinct stage, then write all at once in File Writer.

### Anti-Pattern 5: Storing Snapshot Inside the Docs Output

**What:** Persisting `snapshot.json` inside the `/docs/` output directory.

**Why bad:** Consumers who clone the repo read everything in `/docs/`. Internal tooling state does not belong there.

**Instead:** Store snapshot in `.planning/` or a hidden tooling directory (e.g., `.sawyer-docs-cache/`), excluded from consumer-visible structure but committed for change tracking.

---

## Output Directory Structure

```
docs/
  {feature-slug}/
    de/
      guide.md
      faq.md
    en/
      guide.md
      faq.md
    nl/
      guide.md
    tr/
      guide.md
    uk/
      guide.md

.sawyer-docs-cache/       # tooling state, not consumer-visible
  snapshot.json           # last FeatureMap for change detection

src/
  cli/                    # entry point, arg parsing
  scanner/                # Codebase Scanner + strategies
  detector/               # Change Detector + snapshot store
  generator/              # Article Generator + prompt templates
  translation/            # Translation Engine + DeepL client
  writer/                 # File Writer
  skill/                  # Manual Skill Handler (Claude Code skill)
  config/                 # Config layer
  types/                  # Shared artifact types (FeatureMap, ArticleSet, etc.)
```

---

## Build Order (Dependencies Between Components)

The following order reflects which components can be built independently vs. which depend on others being complete.

| Order | Component | Depends On | Can Start When |
|-------|-----------|------------|----------------|
| 1 | **Config Layer + Types** | Nothing | Day 1 |
| 2 | **Codebase Scanner** | Config Layer, Types | Config Layer done |
| 3 | **Snapshot Store** | Types | Day 1 (parallel with Scanner) |
| 4 | **Change Detector** | Scanner, Snapshot Store, Types | Both Scanner + Store done |
| 5 | **Article Generator** | Types, Config (model name) | Types done; can stub ChangeSet |
| 6 | **Translation Engine** | Types, Config (language list) | Types done; can stub ArticleSet |
| 7 | **File Writer** | Types, output dir config | Types done; can stub input |
| 8 | **CLI Entry Point** | All above components | All stages done |
| 9 | **Manual Skill Handler** | Article Generator, Translation Engine, File Writer | Stages 5-7 done |

**Critical path:** Config → Types → Scanner → Change Detector → Generator → Translation → Writer → CLI

**Parallelizable early work:**
- Snapshot Store (step 3) can be built in parallel with Scanner (step 2)
- Article Generator (step 5), Translation Engine (step 6), and File Writer (step 7) can all be built in parallel once Types are defined, using stub inputs
- Manual Skill Handler (step 9) is independent of Scanner/Change Detector — it can be developed against the same Generator/Translation/Writer components once those exist

---

## Scalability Considerations

| Concern | Current scale (3 repos, 5 languages) | Future scale (more repos/languages) |
|---------|--------------------------------------|--------------------------------------|
| Claude API calls | One call per changed feature × article type | Batching or parallel calls with concurrency limit |
| DeepL API calls | One call per article × language | DeepL supports document translation API for larger batches |
| File I/O | Trivial at current scale | No concern for .md file counts expected |
| Snapshot size | Negligible | Still negligible even with 10x features |
| Scan time | Fast (3 local repos) | Strategy pattern allows adding repos without restructuring |

---

## Sources

- Project requirements: `.planning/PROJECT.md` (HIGH confidence — primary source)
- CLI pipeline patterns: Training knowledge on pipeline/stage architecture (MEDIUM confidence)
- DeepL Pro API rate limits and batching: Known from training data (MEDIUM confidence — verify current limits at https://www.deepl.com/en/pro-api before implementation)
- Claude API usage patterns: Training knowledge (MEDIUM confidence — verify current model IDs and rate limits at https://docs.anthropic.com)
- Strategy pattern for scanners: Standard GoF pattern, well-established (HIGH confidence)
