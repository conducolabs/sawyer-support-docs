---
phase: 03-article-generation
verified: 2026-03-12T21:25:00Z
status: human_needed
score: 4/4 must-haves verified
human_verification:
  - test: "Run sawyer-docs generate on a real feature map and inspect article output"
    expected: "German Du-form articles with correct frontmatter, audience-appropriate vocabulary, relevant sections, and no English text"
    why_human: "Cannot verify Claude output quality, tone, or section relevance programmatically"
  - test: "Run generate twice on same feature map at temperature 0 and diff output"
    expected: "Identical output both times (deterministic)"
    why_human: "Requires live Claude API call to verify temperature 0 determinism"
  - test: "Generate an article for an enrollment-related feature"
    expected: "Article contains the callout directing users to local contact person instead of step-by-step instructions"
    why_human: "Requires live Claude API call with enrollment feature input"
---

# Phase 3: Article Generation Verification Report

**Phase Goal:** Developer can feed a feature map into the generator and receive German-first support articles in all configured article types, written at the correct register and scoped to the right audience
**Verified:** 2026-03-12T21:25:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Generator produces a German step-by-step guide, FAQ, troubleshooting article, and feature overview for a given feature -- each with correct frontmatter (title, language) and consistent formal register | VERIFIED (structure) | System prompt contains all 4 section types (Uebersicht, Schritt-fuer-Schritt, FAQ, Fehlerbehebung). buildFrontmatter() produces `title` and `language: de`. 18 prompt tests + 5 writer tests pass. Actual Claude output quality needs human verification. |
| 2 | Articles generated for mobile app features address end users; articles for dashboard features address club or company admins -- content and vocabulary differ appropriately | VERIFIED (prompts) | buildFeaturePrompt() produces different audience context: "end users in the mobile app" vs "admin users (club_admin, company_admin)". System prompt has separate AUDIENCE RULES for each. Tests confirm differentiation. Actual output vocabulary needs human check. |
| 3 | Running the generator twice on the same feature map produces identical article output (deterministic at temperature 0) | VERIFIED (config) | runGeneration() passes `temperature: 0` in settings.modelSettings. Determinism depends on Claude API honoring temperature 0 -- needs human verification with live run. |
| 4 | Articles for enrollment or onboarding topics direct users to their local contact person rather than providing instructions | VERIFIED (prompt) | System prompt contains exact German callout: "Fuer die Anmeldung wende Dich an Deine lokale Kontaktperson" and instructs "do not include a Schritt-fuer-Schritt section for enrollment features". Test confirms callout text is present. Actual Claude adherence needs human check. |

**Score:** 4/4 truths verified at the code/prompt level

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/generator/prompts.ts` | GENERATION_SYSTEM_PROMPT, buildFeaturePrompt(), buildFrontmatter() | VERIFIED | 58 lines. All 3 exports present. Du-form, 4 sections, enrollment callout, audience branching, quote escaping. |
| `src/generator/writer.ts` | writeArticle() using buildArticlePath('de', ...) | VERIFIED | 14 lines. Calls buildArticlePath('de', ...), mkdirSync recursive, writeFileSync. Returns relative path. |
| `src/generator/generate.ts` | runGeneration() with query(), tools:[], temperature 0 | VERIFIED | 34 lines. Calls query() with tools:[], temperature:0, bypassPermissions. Prepends buildFrontmatter(). Error handling for empty output and failed results. |
| `src/generator/index.ts` | Barrel export | VERIFIED | 3 lines. Re-exports all 5 symbols from prompts, writer, generate. |
| `src/commands/generate.ts` | Generate command with --features and --dry-run | VERIFIED | 73 lines (exceeds min_lines:40). --features filter by slug, --dry-run preview, sequential loop with spinner, per-feature error isolation. |
| `tests/generator-prompts.test.ts` | 18 tests for prompts | VERIFIED | 149 lines. 18 tests covering Du-form, section types, enrollment callout, audience differentiation, frontmatter YAML, quote escaping. All pass. |
| `tests/generator-writer.test.ts` | 5 tests for writer | VERIFIED | 79 lines. 5 tests covering path construction, directory creation, return value, content integrity, nested paths. All pass. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/generator/prompts.ts` | `src/scanner/schema.ts` | Feature type import | WIRED | `import type { Feature } from '../scanner/index.js'` |
| `src/generator/writer.ts` | `src/paths/index.ts` | buildArticlePath import | WIRED | `import { buildArticlePath } from '../paths/index.js'` |
| `src/generator/generate.ts` | `@anthropic-ai/claude-agent-sdk` | query() import | WIRED | `import { query } from '@anthropic-ai/claude-agent-sdk'` -- called in for-await loop |
| `src/commands/generate.ts` | `src/generator/index.ts` | runGeneration, writeArticle | WIRED | `import { runGeneration, writeArticle } from '../generator/index.js'` -- both called in feature loop |
| `src/commands/generate.ts` | `src/scanner/index.ts` | readFeatureMap | WIRED | `import { readFeatureMap } from '../scanner/index.js'` -- called to load feature map |
| `src/commands/generate.ts` | `src/config/index.ts` | loadConfig | WIRED | `import { loadConfig } from '../config/index.js'` -- called at command start |
| `src/bin/cli.ts` | `src/commands/generate.ts` | generateCommand added to program | WIRED | `import { generateCommand }` and `program.addCommand(generateCommand)` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| GEN-01 | 03-01, 03-02 | German as primary language using Claude AI | SATISFIED | System prompt is entirely German-focused. writeArticle writes to `docs/de/`. runGeneration calls Claude via SDK. |
| GEN-02 | 03-01 | Step-by-step guide articles | SATISFIED | System prompt contains "## Schritt-fuer-Schritt" section with instructions for numbered steps. |
| GEN-03 | 03-01 | FAQ-style articles | SATISFIED | System prompt contains "## FAQ" section with bold questions / plain-text answers instruction. |
| GEN-04 | 03-01 | Troubleshooting articles | SATISFIED | System prompt contains "## Fehlerbehebung" section with "Problem / Loesung" structure. |
| GEN-05 | 03-01 | Feature overview articles | SATISFIED | System prompt contains "## Uebersicht" as always-include section. |
| GEN-06 | 03-01, 03-02 | Audience-aware content | SATISFIED | buildFeaturePrompt() branches on audience field. System prompt has separate AUDIENCE RULES for end_user vs admin. |
| GEN-07 | 03-01 | Minimal frontmatter (title, language) | SATISFIED | buildFrontmatter() produces `---\ntitle: "..."\nlanguage: de\n---\n\n`. Tests verify format and escaping. |
| GEN-08 | 03-01 | Enrollment topics direct to contact person | SATISFIED | System prompt contains enrollment callout with exact German text. Instructs no Schritt-fuer-Schritt for enrollment. |

No orphaned requirements found -- all 8 GEN requirements are mapped to Phase 3 plans and all are claimed.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No TODOs, FIXMEs, placeholders, empty returns, or stub implementations found in any Phase 3 file. |

### Human Verification Required

### 1. Article Output Quality

**Test:** Run `npx tsx src/bin/cli.ts generate --features {slug}` on a real feature map with at least one end_user and one admin feature.
**Expected:** German Du-form articles with correct YAML frontmatter, audience-appropriate vocabulary (everyday language for end_user, technical terms for admin), relevant sections present, and no English text in article body.
**Why human:** Claude output quality, tone, and section selection cannot be verified by static code analysis.

### 2. Deterministic Output at Temperature 0

**Test:** Run `npx tsx src/bin/cli.ts generate --features {slug}` twice on the same feature and diff the output files.
**Expected:** Identical output both runs.
**Why human:** Requires live Claude API calls. Temperature 0 is configured correctly in code but actual determinism depends on API behavior.

### 3. Enrollment Callout Adherence

**Test:** Generate an article for a feature related to enrollment/onboarding and inspect the output.
**Expected:** Article contains the callout "Fuer die Anmeldung wende Dich an Deine lokale Kontaktperson" and does NOT contain a Schritt-fuer-Schritt section.
**Why human:** Requires Claude to interpret and follow the enrollment instruction. Cannot verify adherence via static analysis.

### Gaps Summary

No code-level gaps found. All 7 artifacts exist, are substantive (no stubs or placeholders), and are fully wired. All 7 key links are connected. All 8 GEN requirements have supporting implementation evidence. All 97 tests pass including 23 generator-specific tests.

The remaining verification items are runtime behaviors that depend on Claude API responses: article quality, determinism, and enrollment callout adherence. These were marked as a human-verify checkpoint in Plan 03-02 Task 2, and the summary claims this checkpoint was approved.

---

_Verified: 2026-03-12T21:25:00Z_
_Verifier: Claude (gsd-verifier)_
