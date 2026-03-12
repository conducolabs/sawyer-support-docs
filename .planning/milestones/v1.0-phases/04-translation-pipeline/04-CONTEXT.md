# Phase 4: Translation Pipeline - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

German articles produced in Phase 3 are translated into all configured target languages via DeepL Pro API. Content hash gating protects manually corrected translations from being overwritten. Clear, actionable error messages surface when DeepL calls fail. All files land locally — no auto-commit. No glossary integration (v2).

</domain>

<decisions>
## Implementation Decisions

### Content hash gating
- Hash computed from German source `.md` file content only — if German changes, translations regenerate; if unchanged, translations are protected
- Hash stored as `source_hash` field in each translated file's frontmatter — self-contained, no external state file needed
- When a translated file was manually edited and the German source changes: default behavior is skip + warn ("docs/en/auth/login.md was manually edited — skipping")
- `--force` flag overrides protection — overwrites all translations regardless of manual edits
- Translation state (frontmatter hashes) committed to git — team shares baseline, same pattern as scan state

### DeepL API interaction
- Formality set to informal ("less") for all languages that support it — matches the German Du-form tone
- Language code mapping lives in config (not internal lookup) — config specifies DeepL-format codes (EN-US, NL, TR, UK) so the mapping is explicit and extensible
- German source directory (`de`) is always skipped — never "translated"
- Batching strategy: Claude's discretion (one call per article per language, or batched — whatever fits the DeepL SDK best)

### Error handling and reporting
- Continue-and-report on failure — skip the failed article, continue translating the rest, report all failures at the end (matches generate command pattern: `failed++` then continue)
- Retry with exponential backoff for transient errors (timeouts, 5xx) — 2-3 attempts. Permanent errors (401, 403, 456 quota) fail immediately
- Error messages include file + reason + actionable suggestion: "Failed: docs/en/auth/login.md — DeepL quota exceeded. Check your plan at deepl.com/account."
- Always show end-of-run summary: "Translation complete: 42 translated, 3 skipped (hash unchanged), 1 failed." — consistent with generate command

### Translation command UX
- `--features <slugs>` flag filters which articles to translate — same pattern as generate command, comma-separated slugs
- `--languages <langs>` flag overrides config to translate to specific languages only (e.g., `--languages en,nl`)
- Per-file spinner progress: "Translating: login (en) (3/42)..." — matches generate command spinner pattern
- `--dry-run` reads German files, shows which would be translated, and displays estimated DeepL character count for cost awareness
- `--force` overrides hash gating — re-translates everything regardless of manual edits

### Claude's Discretion
- DeepL API call batching strategy (per-article or grouped)
- Retry count and backoff timing
- Exact DeepL SDK integration approach (deepl-node or raw HTTP)
- How to detect manual edits (hash comparison logic details)
- Temp file handling during translation writes

</decisions>

<specifics>
## Specific Ideas

- Frontmatter `source_hash` keeps each translated file self-contained — consuming apps don't need to know about external state files
- `--force` flag is the escape hatch when you know you want to overwrite manual corrections (e.g., after a major German rewrite)
- Character count in `--dry-run` helps developers estimate DeepL costs before committing to a run — especially useful for large feature maps
- Config-level language mapping means adding a new language is just a config change, no code modifications

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/config/schema.ts` — `SUPPORTED_LANGS` array and `ConfigSchema` with `deepl_api_key` already validated
- `src/paths/paths.ts` — `buildArticlePath(lang, featureArea, slug)` produces `docs/{lang}/{area}/{slug}.md` for any language
- `src/ui/logger.ts` — `createLogger()` with spinner, info, warn, error, success (used by generate command)
- `src/commands/translate.ts` — stub command registered in CLI, ready to implement
- `src/generator/writer.ts` — `writeArticle()` pattern for file writing with recursive mkdirSync
- `src/scanner/schema.ts` — `Feature` type with slug, featureArea for filtering

### Established Patterns
- Commander.js subcommand with `--features`, `--dry-run` flags (generate command)
- Per-item spinner with succeed/fail (generate command loop)
- Continue-on-failure with failed counter and process.exit(1) at end (generate command)
- ESM-only TypeScript with `.js` import extensions
- Zod for schema validation

### Integration Points
- `src/commands/translate.ts` is the entry point — needs to read German articles from `docs/de/`
- Config provides `deepl_api_key` and `languages` array
- `buildArticlePath()` already handles per-language directory paths
- Feature map from `.sawyer-docs/feature-map.json` provides slug/featureArea for `--features` filtering
- Generated German articles in `docs/de/{area}/{slug}.md` are the input

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-translation-pipeline*
*Context gathered: 2026-03-12*
