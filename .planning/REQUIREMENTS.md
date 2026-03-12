# Requirements: sawyer Support Docs

**Defined:** 2026-03-12
**Core Value:** End users, club admins, and company admins can find clear, accurate, up-to-date support documentation in their language for every feature in the sawyer ecosystem.

## v1 Requirements

### CLI & Configuration

- [ ] **CLI-01**: Developer can run a CLI command specifying source directories for mobile app, dashboard, and platform repos
- [x] **CLI-02**: Developer can configure the target language list via config file (default: DE, NL, EN-US, TR, UK)
- [x] **CLI-03**: Developer can configure the AI model via config file (default: Claude Sonnet 4.5)
- [ ] **CLI-04**: Developer can run a dry-run to preview what articles would be generated without calling APIs
- [x] **CLI-05**: CLI displays clear, actionable error messages when DeepL or Claude API calls fail
- [x] **CLI-06**: CLI reads API keys (DeepL, Anthropic) from environment variables or a local .env file
- [x] **CLI-07**: Project ships a .env.template with required variable names (no actual secrets)
- [x] **CLI-08**: .env and any files containing secrets are in .gitignore — never committed to the public repo

### Codebase Scanning

- [x] **SCAN-01**: CLI invokes Claude Code to analyze the mobile app codebase and identify user-facing screens and flows
- [x] **SCAN-02**: CLI invokes Claude Code to analyze the dashboard codebase and identify user-facing screens and flows
- [x] **SCAN-03**: CLI invokes Claude Code to extract context from the platform API codebase (data models, endpoints) without generating articles for it
- [x] **SCAN-04**: Claude Code classifies components as user-facing features vs infrastructure (filters out loading screens, nav wrappers, etc.)
- [x] **SCAN-05**: Scanning produces a structured feature map (JSON) that feeds into article generation
- [x] **SCAN-06**: Feature map uses stable, deterministic identifiers for features (idempotent — rerunning produces same file names)
- [x] **SCAN-07**: Scanner detects changed features via git diff against a stored state file, only regenerating docs for changes

### Article Generation

- [x] **GEN-01**: System generates support articles in German as the primary/source language using Claude AI
- [x] **GEN-02**: System generates step-by-step guide articles (numbered instructions for how to do X)
- [x] **GEN-03**: System generates FAQ-style articles (question and answer pairs)
- [x] **GEN-04**: System generates troubleshooting articles (problem → cause → solution)
- [x] **GEN-05**: System generates feature overview articles (what X is and how it works)
- [x] **GEN-06**: Articles are audience-aware — different content for end users (mobile app) vs club/company admins (dashboard)
- [x] **GEN-07**: Generated articles include minimal frontmatter metadata (title, language)
- [x] **GEN-08**: Articles are written for technical support only — enrollment/onboarding topics direct users to their local contact person

### Translation

- [x] **TRANS-01**: System translates German articles to all configured languages via DeepL Pro API
- [x] **TRANS-02**: Translated articles are placed in per-language directories (e.g., docs/de/, docs/en/, docs/nl/, docs/tr/, docs/uk/)
- [x] **TRANS-03**: Translation uses content hash gating — does not overwrite translated files that were manually corrected
- [x] **TRANS-04**: All generated and translated files land locally — no auto-commit to git

### File Organization

- [x] **FILE-01**: Articles are organized by feature area within each language directory (e.g., docs/de/authentication/, docs/de/payments/)
- [x] **FILE-02**: File paths use URL-safe, umlaut-free English slugs (stable public contract for consuming apps)
- [x] **FILE-03**: Directory structure is consistent across all languages

### Documentation

- [x] **DOC-01**: README.md explains what the project is, how to set it up, and how to use the CLI
- [x] **DOC-02**: README includes setup instructions for API keys (copy .env.template to .env)
- [x] **DOC-03**: README documents available CLI commands and flags

### Manual Article Skill

- [ ] **SKILL-01**: Claude Code Skill allows user to request a new article by describing what it should cover
- [ ] **SKILL-02**: Skill asks clarifying questions if the article scope or topic is unclear
- [ ] **SKILL-03**: Skill generates a German draft as .md file and presents it for approval
- [ ] **SKILL-04**: On approval, skill auto-translates the article to all configured languages via DeepL

## v2 Requirements

### Quality & Polish

- **QOL-01**: DeepL glossary integration for consistent UI term translation across languages
- **QOL-02**: TR/UK articles automatically flagged with `review_recommended: true` in frontmatter
- **QOL-03**: Multi-surface coherence check — detect when mobile and dashboard docs describe same feature differently

### Extended Metadata

- **META-01**: Expanded frontmatter with tags, audience, feature area, app, last updated
- **META-02**: Article versioning tied to app releases

## Out of Scope

| Feature | Reason |
|---------|--------|
| Screenshots / image capture | OS-level complexity, screenshots go stale faster than text |
| CI/CD auto-trigger | Manual CLI only until quality is proven |
| API layer for serving docs | Consuming apps read files directly via git |
| GitHub API / remote repo access | Local clones only, avoids OAuth/secrets complexity |
| Real-time sync / webhooks | Disproportionate complexity for a local dev tool |
| Web UI / admin panel | This is a CLI tool for developers |
| Translation memory / custom TM | DeepL handles this; glossary API in v2 if needed |
| Auto-merge / auto-publish | Human must approve before anything lands in shared repo |
| Interactive TUI | Clear stdout formatting is sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLI-01 | Phase 5 | Pending |
| CLI-02 | Phase 1 | Complete |
| CLI-03 | Phase 1 | Complete |
| CLI-04 | Phase 5 | Pending |
| CLI-05 | Phase 4 | Complete |
| CLI-06 | Phase 1 | Complete |
| CLI-07 | Phase 1 | Complete |
| CLI-08 | Phase 1 | Complete |
| SCAN-01 | Phase 2 | Complete |
| SCAN-02 | Phase 2 | Complete |
| SCAN-03 | Phase 2 | Complete |
| SCAN-04 | Phase 2 | Complete |
| SCAN-05 | Phase 2 | Complete |
| SCAN-06 | Phase 2 | Complete |
| SCAN-07 | Phase 2 | Complete |
| GEN-01 | Phase 3 | Complete |
| GEN-02 | Phase 3 | Complete |
| GEN-03 | Phase 3 | Complete |
| GEN-04 | Phase 3 | Complete |
| GEN-05 | Phase 3 | Complete |
| GEN-06 | Phase 3 | Complete |
| GEN-07 | Phase 3 | Complete |
| GEN-08 | Phase 3 | Complete |
| TRANS-01 | Phase 4 | Complete |
| TRANS-02 | Phase 4 | Complete |
| TRANS-03 | Phase 4 | Complete |
| TRANS-04 | Phase 4 | Complete |
| FILE-01 | Phase 1 | Complete |
| FILE-02 | Phase 1 | Complete |
| FILE-03 | Phase 1 | Complete |
| DOC-01 | Phase 1 | Complete |
| DOC-02 | Phase 1 | Complete |
| DOC-03 | Phase 1 | Complete |
| SKILL-01 | Phase 5 | Pending |
| SKILL-02 | Phase 5 | Pending |
| SKILL-03 | Phase 5 | Pending |
| SKILL-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 after roadmap creation*
