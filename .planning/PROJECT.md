# sawyer Support Docs

## What This Is

A CLI-driven documentation generation system that produces multilingual support articles as .md files for the sawyer product ecosystem. It uses Claude Code to scan three application codebases (mobile app, admin dashboard, API), detects changes via git diffs, generates structured German support articles with audience-aware prompts, and translates them to configured languages via DeepL Pro. A Claude Code Skill enables manual article creation with guided prompts and auto-translation. Consuming applications clone this repo and read the .md files directly.

## Core Value

End users, club admins, and company admins can find clear, accurate, up-to-date support documentation in their language for every feature in the sawyer ecosystem.

## Requirements

### Validated

- ✓ CLI tool that scans local application codebases and generates support articles — v1.0
- ✓ Configurable source directories passed via CLI arguments — v1.0
- ✓ Three scan targets: mobile app (frontend), dashboard (frontend), platform API (context-only, no own docs) — v1.0
- ✓ Auto-detection of UI screens/flows and features from frontend codebases — v1.0
- ✓ Change detection via git diffs to identify new/modified features — v1.0
- ✓ German as primary authoring language for all articles — v1.0
- ✓ Automatic translation to configured languages via DeepL Pro API — v1.0
- ✓ Default additional languages: Dutch, English (US), Turkish, Ukrainian — v1.0
- ✓ Configurable language list for future expansion — v1.0
- ✓ Article types: step-by-step guides, FAQ, troubleshooting, feature overviews — v1.0
- ✓ Articles organized by feature area with per-language directories — v1.0
- ✓ Minimal frontmatter metadata (title, language) — v1.0
- ✓ Claude Sonnet 4.5 as default writing model, configurable — v1.0
- ✓ Claude Code Skill for manually adding articles via instructions — v1.0
- ✓ Manual skill asks clarifying questions, generates German proposal, translates on approval — v1.0
- ✓ Generated files land locally — user decides what to commit — v1.0
- ✓ Two audience types: end users (mobile app) and club/company admins (dashboard) — v1.0
- ✓ Support scope is technical only — enrollment handled by local contact persons — v1.0

### Active

- [ ] DeepL glossary integration for consistent UI term translation across languages
- [ ] TR/UK articles automatically flagged with `review_recommended: true` in frontmatter
- [ ] Multi-surface coherence check — detect when mobile and dashboard docs describe same feature differently
- [ ] Expanded frontmatter with tags, audience, feature area, app, last updated
- [ ] Article versioning tied to app releases

### Out of Scope

- Screenshots in articles — may add later, but screenshots go stale faster than text
- CI/CD automation — manual CLI trigger only until quality is proven
- API layer for serving docs — consumers read files directly via git
- OAuth/GitHub API access to repos — local clones only, avoids complexity
- Real-time sync or webhooks — disproportionate complexity for a local dev tool
- Web UI / admin panel — this is a CLI tool for developers
- Interactive TUI — clear stdout formatting is sufficient

## Context

**Product ecosystem:**
sawyer is a platform with three components:
- **sawyer-mobile-app** (conducolabs/sawyer-mobile-app) — Native mobile app for end users
- **sawyer-dashboard** (conducolabs/sawyer-dashboard-49606fd5) — Admin dashboard for super admins and club/company admins
- **projectsawyer-platform** (conducolabs/projectsawyer-platform) — Backend API/platform (context source only)

The platform API is scanned for additional context (data models, endpoints) but does not receive its own support documentation — only the two frontends generate user-facing articles.

**Support philosophy:**
Technical support only. Users needing help with enrollment or onboarding are directed to their local contact person, not sawyer support.

**Translation pipeline:**
DeepL Pro API handles all translations. German is the source language. SHA-256 hash gating protects manually corrected translations from overwrite. Translations land locally for review before commit.

**Consumption model:**
Other applications in the sawyer ecosystem clone or pull this repo and read .md files directly from the file system. No API layer involved.

**Current state (v1.0 shipped):**
- 2,265 LOC TypeScript (29 source files), 1,808 LOC tests (14 files, 157 tests)
- Tech stack: Node.js 22+, TypeScript (pure ESM), Zod v4, Commander.js, Claude Agent SDK, deepl-node
- CLI commands: `scan`, `generate`, `translate`, `run` (full pipeline), `/new-article` skill

## Constraints

- **Translation**: DeepL Pro API — requires API key, rate limits apply
- **AI Model**: Claude Sonnet 4.5 default, must be configurable for cost/quality tradeoffs
- **Source access**: Application repos must be cloned locally, paths passed via CLI
- **Language**: German is always the primary/source language for authoring

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| German as source language, translate outward | Primary user base is German-speaking, ensures highest quality for largest audience | ✓ Good |
| DeepL for translations with hash gating | Reliable machine translation with manual edit protection via SHA-256 content hashing | ✓ Good |
| Local file generation, no auto-commit | Keeps human in the loop for quality control | ✓ Good |
| Platform API as context-only | API users are developers, not end users needing support docs | ✓ Good |
| Minimal frontmatter (title + language) | Keep it simple, consuming apps don't need complex filtering yet | ✓ Good — expandable in v2 |
| Claude Code for codebase scanning | Deep code understanding out of the box — no need to build custom AST parsers per framework | ✓ Good |
| ESM-only, no CJS compatibility | Local dev CLI, no consumer bundling concerns | ✓ Good |
| Temperature 0 for all generation | Determinism is a correctness requirement — same input must produce same output | ✓ Good |
| Sequential generation (not parallel) | Respects Claude API rate limits without retry complexity | ✓ Good |
| Programmatic frontmatter (not Claude-generated) | Eliminates YAML formatting inconsistency from LLM output | ✓ Good |
| Manual articles excluded from feature-map.json | Prevents overwrite on next `run` — skill articles are one-off documents | ✓ Good |

---
*Last updated: 2026-03-12 after v1.0 milestone*
