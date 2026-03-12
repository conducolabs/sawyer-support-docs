# sawyer Support Docs

## What This Is

A documentation generation system that produces multilingual support articles as .md files for the sawyer product ecosystem. It auto-scans three application codebases (mobile app, admin dashboard, API) to map existing features and detect changes, then generates structured support documentation in German (primary) with automatic translation to configured languages via DeepL. Consuming applications clone this repo and read the .md files directly.

## Core Value

End users admins, club admins and company admins can find clear, accurate, up-to-date support documentation in their language for every feature in the sawyer ecosystem.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] CLI tool that scans local application codebases and generates support articles
- [ ] Configurable source directories passed via CLI arguments
- [ ] Three scan targets: mobile app (frontend), dashboard (frontend), platform API (context-only, no own docs)
- [ ] Auto-detection of UI screens/flows and features from frontend codebases
- [ ] Change detection via git diffs to identify new/modified features
- [ ] German as primary authoring language for all articles
- [ ] Automatic translation to configured languages via DeepL Pro API
- [ ] Default additional languages: Dutch, English (US), Turkish, Ukrainian
- [ ] Configurable language list for future expansion
- [ ] Article types: step-by-step guides, FAQ, troubleshooting, feature overviews
- [ ] Articles organized by feature area with per-language directories
- [ ] Minimal frontmatter metadata (title, language)
- [ ] Claude Sonnet 4.5 as default writing model, configurable
- [ ] Claude Code Skill for manually adding articles via instructions
- [ ] Manual skill asks clarifying questions, generates German proposal, translates on approval
- [ ] Generated files land locally — user decides what to commit
- [ ] Two audience types: end users (mobile app) and club/company admins (dashboard)
- [ ] Support scope is technical only — enrollment handled by local contact persons

### Out of Scope

- Screenshots in articles — may add later
- CI/CD automation — manual CLI trigger only for now
- API layer for serving docs — consumers read files directly
- Mobile app (native) for viewing docs
- OAuth/GitHub API access to repos — local clones only
- Real-time sync or webhooks

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
DeepL Pro API handles all translations. German is the source language. Translations are generated automatically but land locally for review before commit.

**Consumption model:**
Other applications in the sawyer ecosystem clone or pull this repo and read .md files directly from the file system. No API layer involved.

## Constraints

- **Translation**: DeepL Pro API — requires API key, rate limits apply
- **AI Model**: Claude Sonnet 4.5 default, must be configurable for cost/quality tradeoffs
- **Source access**: Application repos must be cloned locally, paths passed via CLI
- **Language**: German is always the primary/source language for authoring

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| German as source language, translate outward | Primary user base is German-speaking, ensures highest quality for largest audience | — Pending |
| DeepL for translations | Reliable machine translation with good German support | — Pending |
| Local file generation, no auto-commit | Keeps human in the loop for quality control | — Pending |
| Platform API as context-only | API users are developers, not end users needing support docs | — Pending |
| Minimal frontmatter (title + language) | Keep it simple, consuming apps don't need complex filtering yet | — Pending |
| Claude Code for codebase scanning | Deep code understanding out of the box — no need to build custom AST parsers per framework | — Pending |

---
*Last updated: 2026-03-12 after initialization*
