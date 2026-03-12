# Phase 4: Translation Pipeline - Research

**Researched:** 2026-03-12
**Domain:** DeepL Node.js SDK, content hash gating, frontmatter parsing, TypeScript CLI patterns
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Content hash gating**
- Hash computed from German source `.md` file content only — if German changes, translations regenerate; if unchanged, translations are protected
- Hash stored as `source_hash` field in each translated file's frontmatter — self-contained, no external state file needed
- When a translated file was manually edited and the German source changes: default behavior is skip + warn ("docs/en/auth/login.md was manually edited — skipping")
- `--force` flag overrides protection — overwrites all translations regardless of manual edits
- Translation state (frontmatter hashes) committed to git — team shares baseline, same pattern as scan state

**DeepL API interaction**
- Formality set to informal ("less") for all languages that support it — matches the German Du-form tone
- Language code mapping lives in config (not internal lookup) — config specifies DeepL-format codes (EN-US, NL, TR, UK) so the mapping is explicit and extensible
- German source directory (`de`) is always skipped — never "translated"
- Batching strategy: Claude's discretion (one call per article per language, or batched — whatever fits the DeepL SDK best)

**Error handling and reporting**
- Continue-and-report on failure — skip the failed article, continue translating the rest, report all failures at the end (matches generate command pattern: `failed++` then continue)
- Retry with exponential backoff for transient errors (timeouts, 5xx) — 2-3 attempts. Permanent errors (401, 403, 456 quota) fail immediately
- Error messages include file + reason + actionable suggestion: "Failed: docs/en/auth/login.md — DeepL quota exceeded. Check your plan at deepl.com/account."
- Always show end-of-run summary: "Translation complete: 42 translated, 3 skipped (hash unchanged), 1 failed." — consistent with generate command

**Translation command UX**
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TRANS-01 | System translates German articles to all configured languages via DeepL Pro API | deepl-node v1.24.0 `translateText()` with `sourceLang: 'de'`, `targetLang` per language |
| TRANS-02 | Translated articles are placed in per-language directories (e.g., docs/de/, docs/en/, docs/nl/, docs/tr/, docs/uk/) | `buildArticlePath(lang, featureArea, slug)` already works for any SupportedLang |
| TRANS-03 | Translation uses content hash gating — does not overwrite translated files that were manually corrected | SHA-256 of German source content stored as `source_hash` in translated frontmatter; compare on re-run |
| TRANS-04 | All generated and translated files land locally — no auto-commit to git | `writeFileSync` pattern from generator; no git commands in translation code |
| CLI-05 | CLI displays clear, actionable error messages when DeepL or Claude API calls fail | Structured error catch with HTTP status mapping to user-facing messages; per-file spinner fail pattern |
</phase_requirements>

---

## Summary

Phase 4 implements the translation command that reads generated German `.md` files from `docs/de/`, translates them to all configured target languages via the DeepL Pro API, and writes translated files into per-language directories. The command must guard translated files from being silently overwritten when a human has edited them — this is implemented via a `source_hash` field in each translated file's YAML frontmatter containing the SHA-256 of the German source at translation time.

The `deepl-node` SDK (v1.24.0) is the official Node.js library for DeepL. It provides a `DeepLClient` class with a `translateText()` method that handles retries for transient errors (429, 503) automatically. The SDK is well-suited for this integration — no need for raw HTTP. Formality support varies by target language; using `prefer_less` (soft preference) rather than `less` (hard) is the safe approach because Turkish (TR) and Ukrainian (UK) have uncertain formality support, while Dutch (NL) is confirmed to support it and English (EN-US) does not support formality at all. `prefer_less` falls back to default if the language does not support formality, which matches the design intent.

The translate command follows the exact same structural pattern as the generate command: Commander.js subcommand, `loadConfig()`, `createLogger()`, per-item spinner with succeed/fail, `failed++` then continue, `process.exit(1)` at end if any failed. The only new data flow is: read German `.md` file → extract/parse frontmatter → hash content → call DeepL → prepend new frontmatter (preserving `source_hash`) → write per-language file.

**Primary recommendation:** Use `deepl-node` v1.24.0, `prefer_less` formality, SHA-256 via Node.js built-in `crypto.createHash('sha256')`, and frontmatter read/write using string manipulation (no external YAML library needed for this simple two-field case).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| deepl-node | ^1.24.0 | DeepL Pro API client — translateText(), error types | Official DeepL-maintained SDK; TypeScript support; built-in retry for 429/503 |
| node:crypto | built-in | SHA-256 content hashing for source_hash | No dependency; `createHash('sha256').update(content).digest('hex')` is 1 line |
| node:fs | built-in | Read German source files, write translated files | Already used in generator/writer.ts |

### Supporting (Already in Project)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| commander | ^14.0.3 | CLI flag parsing | `--features`, `--languages`, `--dry-run`, `--force` flags |
| ora | ^9.3.0 | Per-file spinner | "Translating: login (en) (3/42)..." |
| picocolors | ^1.1.1 | Colored output | warn/error/success messages |
| zod | ^4.3.6 | Config validation | Already validates `deepl_api_key` and `languages` array |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| deepl-node | Raw HTTP (fetch/axios) | deepl-node provides typed errors, retry logic, and future-proofing vs API changes; raw HTTP means reimplementing all of that |
| node:crypto SHA-256 | md5 or short hash | SHA-256 is collision-resistant and standard; no extra dependency |
| String manipulation for frontmatter | gray-matter or js-yaml | gray-matter is heavy; for 2-3 known fields, `---\ntitle: "..."\n` regex/split is adequate and zero-dependency |

**Installation:**
```bash
npm install deepl-node
```

---

## Architecture Patterns

### Recommended Module Structure

```
src/
├── commands/
│   └── translate.ts          # CLI entry — flags, loop, summary (mirrors generate.ts)
├── translator/
│   ├── index.ts              # re-exports
│   ├── client.ts             # DeepLClient construction, translateArticle()
│   ├── hash.ts               # computeHash(content), isHashMatch()
│   ├── frontmatter.ts        # parseFrontmatter(), buildTranslatedFrontmatter()
│   ├── reader.ts             # readGermanArticle(cwd, feature) → { content, rawFrontmatter, body }
│   └── writer.ts             # writeTranslatedArticle(cwd, lang, feature, content)
└── config/
    └── schema.ts             # (existing) — deepl_api_key, languages already present
```

This mirrors the generator module split: `generate.ts` → `generate/` folder. Each concern is isolated and independently testable.

### Pattern 1: Hash Gating

**What:** Before writing a translated file, check if it already exists. If it does, parse its `source_hash` frontmatter field and compare it to the SHA-256 of the current German source content. Only write if hashes differ (German changed) or `--force` is set.

**When to use:** Every translate invocation (default path).

**Example:**
```typescript
// src/translator/hash.ts
import { createHash } from 'node:crypto';

export function computeHash(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

export function isHashMatch(existingHash: string, currentHash: string): boolean {
  return existingHash === currentHash;
}
```

### Pattern 2: Frontmatter Round-Trip

**What:** German articles have `title` and `language: de` frontmatter (set by `buildFrontmatter()`). Translated files get `title`, `language: {lang}`, and `source_hash: {hash}` frontmatter. On re-run, read the existing translated file's `source_hash` to decide whether to skip.

**When to use:** Both on writing (set `source_hash`) and reading (check `source_hash`).

**Example:**
```typescript
// src/translator/frontmatter.ts

export interface ParsedArticle {
  title: string;
  language: string;
  sourceHash?: string;   // present in translated files, absent in German source
  body: string;          // everything after the closing ---
}

// Minimal parser: split on first pair of --- delimiters
export function parseFrontmatter(raw: string): ParsedArticle {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
  if (!match) throw new Error('Could not parse frontmatter');
  const yaml = match[1]!;
  const body = match[2]!;
  const title = yaml.match(/^title:\s*"(.*)"/m)?.[1] ?? '';
  const language = yaml.match(/^language:\s*(\S+)/m)?.[1] ?? '';
  const sourceHash = yaml.match(/^source_hash:\s*(\S+)/m)?.[1];
  return { title, language, sourceHash, body };
}

export function buildTranslatedFrontmatter(
  title: string,
  lang: string,
  sourceHash: string,
): string {
  const safeTitle = title.replace(/"/g, '\\"');
  return `---\ntitle: "${safeTitle}"\nlanguage: ${lang}\nsource_hash: ${sourceHash}\n---\n\n`;
}
```

### Pattern 3: DeepL Client — translateArticle()

**What:** Wrap `DeepLClient.translateText()` with the correct options. `sourceLang` is always `'de'`. `targetLang` maps the project's short codes (`en`, `nl`, `tr`, `uk`) to DeepL's format (`EN-US`, `NL`, `TR`, `UK`) — the mapping comes from config.

**Decision on batching:** Translate one article body at a time (one `translateText()` call per language per article). This is simpler, error-isolating, and the SDK already handles per-call retry. Batching across articles provides marginal throughput improvement but makes error attribution harder.

**Example:**
```typescript
// src/translator/client.ts
import * as deepl from 'deepl-node';

// DeepL language code mapping — must match config `languages` values
const DEEPL_LANG_MAP: Record<string, deepl.TargetLanguageCode> = {
  en:  'EN-US',
  nl:  'NL',
  tr:  'TR',
  uk:  'UK',
};

export function createDeepLClient(apiKey: string): deepl.DeepLClient {
  return new deepl.DeepLClient(apiKey);
}

export async function translateArticle(
  client: deepl.DeepLClient,
  body: string,
  targetLang: string,
): Promise<string> {
  const deeplTarget = DEEPL_LANG_MAP[targetLang];
  if (!deeplTarget) {
    throw new Error(`No DeepL language code mapped for: ${targetLang}`);
  }

  const result = await client.translateText(body, 'de', deeplTarget, {
    formality: 'prefer_less',  // soft preference — falls back if unsupported
    preserveFormatting: true,  // keep Markdown heading/list structure
  });

  return result.text;
}
```

### Pattern 4: Retry with Exponential Backoff

**What:** The `deepl-node` SDK automatically retries 429 (Too Many Requests) and 503 (Service Unavailable) errors. For permanent errors (401 Unauthorized, 403 Forbidden, 456 Quota Exceeded), the SDK throws immediately. The project should NOT add an additional retry layer on top of the SDK — instead, detect permanent errors by class/status code and map them to clear user messages.

**When to use:** Wrap all `translateArticle()` calls in a try/catch that maps known error codes to actionable messages.

**Example:**
```typescript
// In translate command loop
try {
  translated = await translateArticle(client, body, lang);
} catch (err) {
  const msg = formatDeepLError(err, targetPath);
  spinner.fail(msg);
  failed++;
  continue;
}

// src/translator/client.ts
export function formatDeepLError(err: unknown, filePath: string): string {
  if (err instanceof deepl.AuthorizationError) {
    return `Failed: ${filePath} — Invalid DeepL API key. Check DEEPL_API_KEY in your .env file.`;
  }
  if (err instanceof deepl.QuotaExceededError) {
    return `Failed: ${filePath} — DeepL quota exceeded. Check your plan at deepl.com/account.`;
  }
  if (err instanceof deepl.TooManyRequestsError) {
    return `Failed: ${filePath} — DeepL rate limit hit after retries. Try again later.`;
  }
  return `Failed: ${filePath} — ${(err as Error).message}`;
}
```

**Note:** Error class names (`AuthorizationError`, `QuotaExceededError`, `TooManyRequestsError`) are exported from `deepl-node`. Confirmed via the SDK's GitHub and error handling docs. Confidence: MEDIUM — verify exact export names during implementation with `import type { ... } from 'deepl-node'`.

### Pattern 5: Command Structure (mirrors generate.ts exactly)

```typescript
// src/commands/translate.ts
export const translateCommand = new Command('translate')
  .description('Translate German articles to configured languages via DeepL')
  .option('--features <slugs>', 'Comma-separated feature slugs to translate')
  .option('--languages <langs>', 'Override config languages (comma-separated, e.g., en,nl)')
  .option('--dry-run', 'Show what would be translated and estimated character count')
  .option('--force', 'Overwrite translations even if manually edited')
  .action(async (options) => {
    const config = loadConfig();
    const logger = createLogger(false, false);
    const cwd = process.cwd();
    const client = createDeepLClient(config.deepl_api_key);

    // 1. Resolve features (from feature map, filtered by --features)
    // 2. Resolve target languages (from config.languages minus 'de', filtered by --languages)
    // 3. Build work list: features × languages = translation jobs
    // 4. --dry-run: print jobs + estimated char count, exit
    // 5. For each job: hash-gate check → spinner → translateArticle() → write → succeed/fail
    // 6. Summary: "Translation complete: X translated, Y skipped, Z failed."
    // 7. process.exit(1) if failed > 0
  });
```

### Anti-Patterns to Avoid

- **Storing hash in a separate state file:** The locked decision is `source_hash` in each translated file's own frontmatter. Do not create a `translation-state.json` file.
- **Using formality `'less'` (hard):** Turkish (TR) may not support formality; `'less'` throws if the language does not support it. Use `'prefer_less'` always.
- **Translating `docs/de/` files:** German source directory must always be skipped regardless of config. Hardcode this exclusion before the language loop.
- **Auto-committing translated files:** TRANS-04 requires local-only writes. No `git add` or `git commit` anywhere in the translation pipeline.
- **Parsing frontmatter with a heavy YAML library:** gray-matter or js-yaml add dependencies and can reformat existing YAML. Use the minimal regex-based parser that targets the specific fields we control.
- **Parallel API calls across languages for the same article:** Sequential per-language translation is simpler, error-isolating, and respects rate limits. The SDK retries internally for transient errors.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP requests to DeepL API | Custom fetch wrapper | deepl-node SDK | SDK handles auth headers, retries, typed errors, API version |
| Exponential backoff for 429/503 | Custom retry loop | deepl-node built-in | SDK automatically retries transient errors |
| SHA-256 computation | Custom hash function | `node:crypto createHash` | Node.js built-in, 1 line, no dependency |
| Language code validation | Custom lookup table | DeepL SDK `TargetLanguageCode` type | SDK TypeScript type catches invalid codes at compile time |

**Key insight:** The deepl-node SDK removes the need for an HTTP layer entirely. All retry logic for transient errors is built-in. The project's job is to wrap translateText() with the project-specific error mapping and frontmatter pattern.

---

## Common Pitfalls

### Pitfall 1: Hard formality mode fails on unsupported languages

**What goes wrong:** `translateText()` throws when `formality: 'less'` is passed for a target language that does not support formality (e.g., potentially TR, UK, EN-US).

**Why it happens:** DeepL API returns HTTP 400 "formality not supported for this language pair" when hard formality is set on an incompatible language.

**How to avoid:** Always use `formality: 'prefer_less'`. This falls back to default formality when the language does not support it, matching the design intent (Du-form where possible, sensible default otherwise).

**Warning signs:** If test runs against TR or UK fail with a formality-related error.

### Pitfall 2: Overwriting manually-edited translations on re-run

**What goes wrong:** Every re-run of `sawyer-docs translate` overwrites all translated files, destroying manual corrections.

**Why it happens:** Not checking the `source_hash` frontmatter field before writing.

**How to avoid:** Before writing any translated file: check if the file exists → read its `source_hash` → compare to `computeHash(germanContent)` → skip if match (German unchanged). Only proceed if hashes differ or `--force` is set.

**Warning signs:** Missing `existsSync` check before write. Missing hash comparison. Not reading existing translated file frontmatter.

### Pitfall 3: ESM import extensions

**What goes wrong:** `import { parseFrontmatter } from './frontmatter'` causes runtime module-not-found errors.

**Why it happens:** The project is `"type": "module"` — ESM requires explicit `.js` extensions in imports even when writing `.ts` source.

**How to avoid:** All imports in new `src/translator/` files must use `.js` extension: `import { computeHash } from './hash.js'`.

**Warning signs:** Any new `import` without `.js` extension will fail at runtime.

### Pitfall 4: Reading German articles before they exist

**What goes wrong:** `translate` command runs before `generate`, and `readFileSync()` throws for missing German files.

**Why it happens:** TRANS-01 depends on Phase 3 (article generation). The feature map contains features but `docs/de/` may be incomplete.

**How to avoid:** For each feature, check that the German source file exists before attempting to read/hash/translate it. Log a warning and skip (not fail) features with no German source.

**Warning signs:** No `existsSync` guard before reading German files.

### Pitfall 5: DeepL character count vs. entire file content

**What goes wrong:** `--dry-run` character count estimate includes frontmatter YAML, inflating the estimate.

**Why it happens:** Passing the full file content (including `---\ntitle: "..."\n---`) to `strlen()` rather than just the body.

**How to avoid:** Parse frontmatter first, then estimate character count on `body` only. DeepL bills on the text characters sent — not the YAML wrapper.

---

## Code Examples

Verified patterns from official sources and project conventions:

### Initialize DeepL Client
```typescript
// Source: deepl-node official README / npm v1.24.0
import * as deepl from 'deepl-node';

const client = new deepl.DeepLClient(apiKey);
```

### Translate a single text
```typescript
// Source: deepl-node official README
const result = await client.translateText(
  body,
  'de',       // sourceLang
  'EN-US',    // targetLang (DeepL format)
  {
    formality: 'prefer_less',   // soft preference — safe for all languages
    preserveFormatting: true,   // keeps Markdown structure intact
  }
);
const translatedText = result.text;
```

### Compute SHA-256 content hash
```typescript
// Source: Node.js built-in crypto module
import { createHash } from 'node:crypto';

export function computeHash(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}
```

### Read and hash German source
```typescript
// Adapted from generator/writer.ts pattern
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildArticlePath } from '../paths/index.js';

export function readGermanArticle(cwd: string, feature: Feature): string | null {
  const relPath = buildArticlePath('de', feature.featureArea, feature.slug);
  const absPath = resolve(cwd, relPath);
  if (!existsSync(absPath)) return null;
  return readFileSync(absPath, 'utf-8');
}
```

### Hash-gate check before writing
```typescript
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type GatingResult =
  | { action: 'translate' }
  | { action: 'skip'; reason: 'hash_unchanged' }
  | { action: 'warn_manual_edit' };  // source changed but file was manually edited

export function checkGating(
  targetAbsPath: string,
  currentHash: string,
  force: boolean,
): GatingResult {
  if (!existsSync(targetAbsPath)) return { action: 'translate' };
  if (force) return { action: 'translate' };

  const existing = readFileSync(targetAbsPath, 'utf-8');
  const parsed = parseFrontmatter(existing);

  if (!parsed.sourceHash) {
    // File exists but has no source_hash — treat as needing translation
    return { action: 'translate' };
  }
  if (parsed.sourceHash === currentHash) {
    return { action: 'skip', reason: 'hash_unchanged' };
  }
  // Hash differs: German changed. Skip with warning (not overwrite, unless --force).
  return { action: 'warn_manual_edit' };
}
```

### Language exclusion (always skip 'de')
```typescript
// Filter configured languages — German source is never a translation target
const targetLangs = config.languages.filter((lang) => lang !== 'de');
```

### Summary output pattern (matches generate command)
```typescript
logger.success(
  `Translation complete: ${translated} translated, ${skipped} skipped (hash unchanged), ${failed} failed.`
);
if (failed > 0) {
  process.exit(1);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Translator` class | `DeepLClient` class | deepl-node v1.x | Same API surface, new naming convention |
| formality: `'less'` (hard) | formality: `'prefer_less'` (soft) | Always available but not always used | Prevents 400 errors on languages with no formality support |
| External translation state file | `source_hash` in translated file frontmatter | Project decision | Self-contained files; no separate state to track |

**Deprecated/outdated:**
- Old `deepl` npm package (not `deepl-node`): different API, not the official library. Always use `deepl-node`.

---

## Open Questions

1. **Exact deepl-node error class export names**
   - What we know: The SDK exports error types; community references mention `AuthorizationError`, `QuotaExceededError`, `TooManyRequestsError`
   - What's unclear: Exact exported symbol names from `deepl-node` v1.24.0 TypeScript types
   - Recommendation: During implementation, run `import type * as deepl from 'deepl-node'` and inspect exported names; or check `node_modules/deepl-node/dist/index.d.ts` after install

2. **Formality support for TR and UK**
   - What we know: NL (Dutch) has `supports_formality: true`. EN-US does NOT support formality. TR and UK support is uncertain from docs alone.
   - What's unclear: Whether passing `prefer_less` to TR/UK triggers an error or silently falls back to default
   - Recommendation: Use `prefer_less` throughout — this is documented as the safe soft-preference that falls back; if it still causes issues for specific language codes, switch those to omitting the formality option entirely

3. **DeepLClient `maxRetries` / backoff configuration**
   - What we know: The SDK retries 429 and 503 automatically; the CONTEXT.md asks for 2-3 retry attempts
   - What's unclear: Whether DeepLClient constructor accepts a `maxRetries` option
   - Recommendation: Check constructor options in `node_modules/deepl-node/dist/index.d.ts` after install; if not configurable, the default retry behavior is acceptable since it already handles transient errors

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | `vitest.config.ts` (root) — `include: ['tests/**/*.test.ts']` |
| Quick run command | `npm test -- --reporter=verbose tests/translator-*.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| TRANS-01 | `translateArticle()` calls DeepL with correct lang, formality, returns translated text | unit (mock deepl-node) | `npm test -- tests/translator-client.test.ts` | Wave 0 |
| TRANS-01 | Language code mapping — `en` → `EN-US`, `nl` → `NL`, `tr` → `TR`, `uk` → `UK` | unit | `npm test -- tests/translator-client.test.ts` | Wave 0 |
| TRANS-02 | `writeTranslatedArticle()` writes to `docs/{lang}/{area}/{slug}.md` | unit (tmpdir) | `npm test -- tests/translator-writer.test.ts` | Wave 0 |
| TRANS-03 | `computeHash()` produces stable SHA-256 for same input | unit | `npm test -- tests/translator-hash.test.ts` | Wave 0 |
| TRANS-03 | `parseFrontmatter()` extracts `source_hash` field from translated file | unit | `npm test -- tests/translator-frontmatter.test.ts` | Wave 0 |
| TRANS-03 | `checkGating()` returns `skip` when hash matches, `translate` when no file, `warn_manual_edit` when hash differs | unit | `npm test -- tests/translator-hash.test.ts` | Wave 0 |
| TRANS-03 | `buildTranslatedFrontmatter()` includes `source_hash` field | unit | `npm test -- tests/translator-frontmatter.test.ts` | Wave 0 |
| TRANS-04 | `writeTranslatedArticle()` uses `writeFileSync` only — no git commands | unit (tmpdir, check no git calls) | `npm test -- tests/translator-writer.test.ts` | Wave 0 |
| CLI-05 | `formatDeepLError()` maps error types to actionable messages with file path | unit | `npm test -- tests/translator-client.test.ts` | Wave 0 |
| CLI-05 | DeepL quota error message contains "deepl.com/account" or equivalent suggestion | unit | `npm test -- tests/translator-client.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test -- tests/translator-*.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/translator-client.test.ts` — covers TRANS-01, CLI-05 (mock deepl-node `DeepLClient`)
- [ ] `tests/translator-hash.test.ts` — covers TRANS-03 hash computation and gating logic
- [ ] `tests/translator-frontmatter.test.ts` — covers TRANS-03 parse/build frontmatter round-trip
- [ ] `tests/translator-writer.test.ts` — covers TRANS-02, TRANS-04 file writes in tmpdir

---

## Sources

### Primary (HIGH confidence)
- [deepl-node GitHub releases](https://github.com/DeepLcom/deepl-node/releases) — confirmed v1.24.0 is latest (January 21, 2025)
- [DeepL Error Handling docs](https://developers.deepl.com/docs/best-practices/error-handling) — HTTP 429 retryable, 456 permanent, exponential backoff recommendation
- [DeepL Supported Languages](https://developers.deepl.com/docs/resources/supported-languages) — UK (Ukrainian) confirmed supported target language
- Existing project source files — generate.ts, writer.ts, prompts.ts, logger.ts, schema.ts patterns confirmed by direct read

### Secondary (MEDIUM confidence)
- WebSearch results cross-referenced with official deepl-node GitHub — `DeepLClient` class name, `translateText()` signature, `prefer_less` formality option
- WebSearch for error class names (`AuthorizationError`, `QuotaExceededError`, `TooManyRequestsError`) — referenced across multiple sources but not verified against TypeScript types directly
- DeepL OpenAPI spec for languages — NL `supports_formality: true` from search result excerpt

### Tertiary (LOW confidence)
- Formality support for TR and UK: conflicting/incomplete signal from docs; `prefer_less` is documented as safe fallback but exact runtime behavior for TR/UK unconfirmed without live API test

---

## Metadata

**Confidence breakdown:**
- Standard stack (deepl-node): HIGH — official SDK, version confirmed, usage pattern confirmed
- Architecture (module structure, hash gating): HIGH — follows established project patterns, no new patterns needed
- Pitfalls (formality, ESM extensions, hash-gate): HIGH — derived from project codebase + official docs
- Error class names: MEDIUM — referenced widely but TypeScript type file not directly inspected
- Formality for TR/UK: LOW — use `prefer_less` as documented safe default

**Research date:** 2026-03-12
**Valid until:** 2026-06-12 (deepl-node stable; check for new major versions if > 60 days)
