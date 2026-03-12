# Feature Landscape

**Domain:** AI-powered multilingual support documentation generation from codebases
**Researched:** 2026-03-12
**Confidence note:** WebSearch and Context7 were unavailable during this research session.
Findings are drawn from training-data knowledge of comparable systems (Mintlify, GitBook,
Docusaurus, ReadMe.io, Notion AI, DeepL integrations, and open-source doc generators).
Confidence is MEDIUM overall — cross-check against competitor analysis before finalizing roadmap.

---

## Table Stakes

Features users (developers running the CLI) expect. Missing = tool feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| CLI entrypoint with clear flags | Standard for developer tools; without this there's no workflow | Low | `--source`, `--lang`, `--output` style flags expected |
| Codebase scanning — detect screens/flows | Core value prop. Without this it's just a writer, not a generator | High | Must parse React Native, Next.js component trees and routing |
| Output as plain .md files | Consuming apps read files directly; any other format breaks consumers | Low | Already decided in PROJECT.md |
| German-first authoring | Primary user base; quality degrades if you translate TO German | Low | Baked into system prompt + article generation |
| Translation to configured languages | Useless as a multilingual system without this | Medium | DeepL Pro API; must handle rate limits gracefully |
| Per-language directory structure | Required for consuming apps to locate correct locale | Low | e.g. `docs/de/`, `docs/en/`, `docs/nl/` |
| Minimal frontmatter (title, language) | Consuming apps need at minimum these two fields to render correctly | Low | YAML frontmatter block at article top |
| Article types: guides, FAQs, troubleshooting | Support docs have well-understood genres; users expect these categories | Medium | System prompts per type; type flag or auto-detection |
| Idempotent output — same input, stable output | Running twice must not produce duplicate or conflicting files | Medium | Deterministic file naming from feature identity |
| Configurable AI model | Cost/quality tradeoff; teams must be able to switch without code change | Low | Env var or config file; default Claude Sonnet 4.5 |
| Configurable language list | No product is static; adding a language later must not require code changes | Low | Config file or CLI flag |
| Human-in-the-loop — no auto-commit | Mandatory for quality; auto-commit would erode trust in the output | Low | Files land locally, user commits manually |
| Dry-run / preview mode | Developers need to see what will be generated before doing it | Medium | Print article list + estimated translation count |
| Error handling with clear messages | API failures (DeepL, Claude) must surface actionably, not silently | Low | Especially DeepL quota exceeded, Claude timeout |
| Audience-aware content | Mobile users vs admin users have different expertise and task contexts | Medium | Two audience personas in system prompt; separate output dirs |

---

## Differentiators

Features that set this tool apart. Not universally expected, but create real value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Change detection via git diff | Only regenerates docs for changed features — saves API cost and time | High | `git diff` against last-generated commit SHA stored in state file |
| Multi-repo scanning in one run | Correlates features across mobile + dashboard + API context — produces coherent cross-surface docs | High | Requires repo path registry; API platform as context-only source |
| Claude Code Skill (manual article creation) | Enables human to request articles via natural language, get German draft, approve, then translate | Medium | Interactive workflow: prompt → draft → approve → translate |
| Clarifying-question flow before draft | AI asks what the article covers before writing — reduces hallucinated features | Medium | Multi-turn prompt pattern within the Skill |
| API platform as context provider (not doc target) | Richer docs because AI can reference real data models and endpoints from platform API | High | Parse OpenAPI spec or route definitions from platform codebase |
| Feature-identity fingerprinting | Stable article filenames derived from feature identity (not arbitrary timestamps) | Medium | Hash or slug from component path + screen name |
| Translation review gate | Translated articles land locally before commit — users can spot-check before publishing | Low | Already in scope; worth highlighting as deliberate design choice |
| Structured article metadata for future search | Even with minimal frontmatter now, schema designed for extensibility (tags, audience, version) | Low | Reserve fields in frontmatter even if unpopulated |
| Multi-surface coherence check | Detects when mobile app and dashboard describe the same underlying feature differently | High | Cross-article comparison pass; LOW confidence this is worth the complexity at MVP |

---

## Anti-Features

Features to explicitly NOT build in initial phases.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Screenshots / image capture | Adds OS-level complexity, screenshots go stale faster than text, massively increases scope | Accept text-only docs; add screenshot placeholders if needed |
| CI/CD auto-trigger | Automated doc generation without human review introduces hallucination risk at scale | Manual CLI trigger only; CI/CD can be layered on later once quality is proven |
| API layer for serving docs | Consuming apps read files directly; an API layer adds infrastructure cost and a new failure point | File-based consumption via git clone/pull |
| GitHub API / remote repo access | Forces OAuth, secrets management, rate limits — enormous auth surface | Require local clones; developer passes paths as CLI args |
| Real-time sync / webhooks | Complexity wildly disproportionate to value for a local developer tool | Manual CLI trigger; no daemon |
| Web UI / admin panel | This is a CLI tool for developers; a web UI is a different product | Invest in CLI UX instead |
| Translation memory / glossary management | DeepL Pro handles this adequately; building a custom TM is months of work | Use DeepL glossary API if consistent terminology is needed (simple extension) |
| Multi-tenant / SaaS offering | This is an internal tool; productizing it introduces auth, billing, compliance scope | Keep it a local CLI tool |
| Auto-merge / auto-publish | Human must approve before anything lands in the shared repo | Always generate locally, human commits |
| Interactive TUI (terminal UI with rich widgets) | Adds dependency (Ink, Charm, etc.) for marginal UX gain over structured stdout | Clear stdout + stderr with good formatting is sufficient |
| Semantic versioning of docs per app release | Useful eventually but enormous complexity; docs don't need version branches at MVP | Single current state; version tracking can be added later |

---

## Feature Dependencies

```
git diff scanning → Change detection (requires knowing prior state)
Change detection → State file tracking (what was last generated and when)
State file tracking → Idempotent file naming (filenames must be stable across runs)

Multi-repo scanning → API-as-context (must be able to scan platform without generating docs for it)
API-as-context → Coherent cross-surface docs (optional enrichment layer)

German authoring → DeepL translation (German must be complete before translation runs)
DeepL translation → Configurable language list (translation target list drives API calls)
Configurable language list → Per-language directory structure

Manual Skill (Claude Code) → Clarifying-question flow → German draft → Translation gate → Translated output
Manual Skill depends on: German authoring system prompt + DeepL translation pipeline

Article types → Audience-aware content (type selection is partly driven by audience persona)
Audience-aware content → Two output areas: mobile-app/ and dashboard/ within language dirs
```

---

## MVP Recommendation

Prioritize these for the first working version:

1. CLI with configurable source dirs and language list (foundation for everything)
2. Codebase scanning — screen/flow detection from frontend repos (core value)
3. German-first article generation — all article types (step-by-step, FAQ, troubleshooting, overview)
4. DeepL translation pipeline — default 5 languages (DE, NL, EN-US, TR, UK)
5. Per-language directory output with minimal frontmatter
6. Idempotent file naming (stable, deterministic slugs)
7. Basic error handling for API failures with clear messages

Defer to Phase 2:

- **Change detection via git diff**: Valuable but requires state management; not needed for initial generation
- **Multi-repo / API-as-context enrichment**: Adds quality but MVP can work without platform API context
- **Claude Code Skill (manual article creation)**: Useful but separate workflow; doesn't block the main scanner
- **Dry-run mode**: Nice to have; can be added once core pipeline is stable

Defer to Phase 3 or later:

- **Multi-surface coherence check**: High complexity, uncertain ROI at current scale
- **DeepL glossary integration**: Only matters once terminology inconsistency is observed in practice

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Table stakes definition | MEDIUM | Based on analysis of comparable tools (Mintlify, GitBook, ReadMe.io) from training data; no live verification |
| Differentiators | MEDIUM | Derived from project requirements and domain knowledge; change detection and multi-repo scanning are uncommon in off-the-shelf tools |
| Anti-features | HIGH | Well-supported by explicit Out of Scope decisions in PROJECT.md and general domain reasoning |
| Feature dependencies | HIGH | Dependencies are logical/causal; derived from system design, not from external sources |
| MVP ordering | MEDIUM | Reasonable sequencing based on dependency graph; should be validated against team velocity estimates |

---

## Sources

- PROJECT.md requirements (primary) — HIGH confidence
- Training-data knowledge of: Mintlify, GitBook, Docusaurus, ReadMe.io, DeepL API, Claude API — MEDIUM confidence
- No live web research conducted (WebSearch unavailable during this session) — flag for validation
