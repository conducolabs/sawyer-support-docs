# Phase 1: Foundation - Research

**Researched:** 2026-03-12
**Domain:** Node.js TypeScript CLI scaffolding — config validation, env overlay, file-path contracts, slug generation
**Confidence:** HIGH (core stack), MEDIUM (version specifics), HIGH (architecture patterns)

## Summary

This phase establishes the entire skeleton the later phases plug into: a TypeScript CLI project with a validated config layer, a slug-based file-path contract, and the developer setup artifacts (.env.template, .gitignore entries, README). Because later phases call into the config module and file-path utilities as stable APIs, correctness and immutability of those contracts matters more than any feature.

The primary challenge is the Node.js ESM/CJS split. Most modern, actively-maintained CLI helper libraries (ora, @sindresorhus/slugify, chalk) went ESM-only. Setting the project up as native ESM from day one (`"type": "module"` in package.json, tsup outputting `.mjs`) is the cleanest path; retrofitting later is painful.

Zod v4 (stable since July 2025) is the right choice for config and env validation — it is 14× faster than v3, has zero dependencies, and produces TypeScript types directly from the schema, which the generator and translator phases will consume. Commander.js v14 handles the subcommand tree cleanly with native TypeScript types.

**Primary recommendation:** Scaffold as a full-ESM TypeScript project, validated by Zod v4, built by tsup, tested by Vitest 4.x in node environment. All other phases depend on this foundation being stable on day one.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Config file format: JSON format — `sawyer-docs.config.json` at project root
- Secrets in `.env` file (API keys for DeepL and Anthropic)
- `.env` can override any config setting (config + .env override pattern)
- `.env.template` shipped with required variable names, no actual secrets
- `.env` and secret-containing files added to `.gitignore`
- Config validated at startup with clear error messages for missing keys
- Repo paths (mobile, dashboard, platform) stored in config with CLI flag overrides for one-off runs
- Top-level directory: `docs/`
- Language directories use short ISO 639-1 codes: `docs/de/`, `docs/en/`, `docs/nl/`, `docs/tr/`, `docs/uk/`
- Single-level feature areas under each language: `docs/de/authentication/`, `docs/de/payments/`
- File names are feature slugs only: `login.md`, `password-reset.md` (no type prefix)
- No index files — consuming apps handle discovery
- All slugs are URL-safe, umlaut-free English identifiers (stable public contract)
- Binary name: `sawyer-docs`
- Subcommand architecture: `sawyer-docs generate`, `sawyer-docs translate`, `sawyer-docs scan`
- Structured output with spinners and colored status lines during runs
- Summary display at end of each run
- README: English language, comprehensive reference style
- README includes: architecture diagram (pipeline overview), config reference table, example article output, contributing guide

### Claude's Discretion
- Default verbosity level (quiet vs verbose)
- Exact spinner/progress implementation library
- TypeScript project structure (src/ layout, barrel exports, etc.)
- Package manager choice (npm vs pnpm)
- Zod schema design for config validation

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLI-02 | Developer can configure the target language list via config file (default: DE, NL, EN-US, TR, UK) | Zod schema with `z.array(z.enum([...]))` + default value; JSON config loaded at startup |
| CLI-03 | Developer can configure the AI model via config file (default: Claude Sonnet 4.5) | Zod schema field with string + default; consumed downstream |
| CLI-06 | CLI reads API keys (DeepL, Anthropic) from environment variables or a local .env file | dotenv 16.x loads .env; Zod schema validates required keys from process.env; env overrides JSON config |
| CLI-07 | Project ships a .env.template with required variable names (no actual secrets) | Static text file with placeholder values; committed to git |
| CLI-08 | .env and any files containing secrets are in .gitignore — never committed | .gitignore already contains `.env` entry (confirmed in existing file) |
| FILE-01 | Articles organized by feature area within each language directory | File-path utility function `buildArticlePath(lang, featureArea, slug)` → `docs/{lang}/{featureArea}/{slug}.md` |
| FILE-02 | File paths use URL-safe, umlaut-free English slugs (stable public contract) | @sindresorhus/slugify handles German umlauts, normalizes to ASCII; deterministic output |
| FILE-03 | Directory structure consistent across all languages | Path builder uses same featureArea and slug segments for all languages; utility tested |
| DOC-01 | README.md explains what the project is, how to set it up, and how to use the CLI | Authored in this phase |
| DOC-02 | README includes setup instructions for API keys (copy .env.template to .env) | Authored in this phase |
| DOC-03 | README documents available CLI commands and flags | Authored in this phase — subcommand structure is locked |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| typescript | ^5.x | Language | Required for type-safe config/path contracts consumed by later phases |
| zod | ^4.x | Config + env schema validation | v4 stable (July 2025); zero deps; TypeScript types flow from schema; 14× faster than v3 |
| dotenv | ^16.x | Load .env into process.env | Industry standard; v16.4.7 (Dec 2024); zero deps; integrates cleanly before Zod parse |
| commander | ^14.x | CLI subcommand tree | v14.0.2; native TypeScript; most widely used Node.js CLI framework; `.addCommand()` API |
| @sindresorhus/slugify | ^3.x | Umlaut-free, URL-safe slug generation | ESM-only v3; handles German ä→ae, ö→oe, ü→ue by default; deterministic; built-in TypeScript types |
| ora | ^8.x | Terminal spinners | v8.2.0 (Feb 2025); ESM-only; built-in TypeScript support; sindresorhus ecosystem |
| picocolors | ^1.x | Terminal string coloring | CJS+ESM dual; 14× smaller than chalk; used by PostCSS, SVGO, Stylelint; no setup required |

### Build / Dev
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsup | ^8.x | Bundle TypeScript to ESM output | Auto-handles hashbang → chmod +x; wraps esbuild; minimal config; standard for TS CLIs 2025 |
| vitest | ^4.x | Test framework | v4.0.x; native TypeScript; fast; node environment; no extra config for pure Node.js |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @sindresorhus/slugify | `slugify` (npm) | slugify supports CJS but German umlaut handling is less precise (no ae/oe/ue expansion by default) |
| picocolors | chalk v4 (CJS) | chalk v4 is CJS-compatible but unmaintained; chalk v5 is ESM-only like picocolors — just heavier |
| ora | `cli-spinners` + custom | More work; ora gives spinner + succeed/fail/warn/info API in one package |
| tsup | tsc only | tsc alone works but doesn't handle hashbang chmod, tree-shaking, or single-file output |
| pnpm | npm | pnpm is faster and stricter about phantom deps; either works for a local dev tool — npm is simpler |

**Installation:**
```bash
npm init -y
npm install zod dotenv commander @sindresorhus/slugify ora picocolors
npm install --save-dev typescript tsup vitest @types/node
```

---

## Architecture Patterns

### Recommended Project Structure
```
sawyer-support-docs/
├── src/
│   ├── bin/
│   │   └── cli.ts           # Entry point: hashbang, program setup, subcommand registration
│   ├── config/
│   │   ├── schema.ts        # Zod schemas for sawyer-docs.config.json and .env
│   │   ├── loader.ts        # loadConfig(): reads JSON + overlays .env, validates, returns typed Config
│   │   └── index.ts         # Re-export: Config type, loadConfig
│   ├── paths/
│   │   ├── slugify.ts       # buildSlug(input: string): string — wraps @sindresorhus/slugify
│   │   ├── paths.ts         # buildArticlePath(lang, featureArea, slug): string
│   │   └── index.ts         # Re-export: buildSlug, buildArticlePath, SUPPORTED_LANGS
│   ├── commands/
│   │   ├── generate.ts      # generate subcommand action handler (stub in phase 1)
│   │   ├── translate.ts     # translate subcommand action handler (stub in phase 1)
│   │   └── scan.ts          # scan subcommand action handler (stub in phase 1)
│   └── ui/
│       └── logger.ts        # Wrapper: spinner, info/warn/error/success using ora + picocolors
├── tests/
│   ├── config.test.ts       # Config validation unit tests
│   └── paths.test.ts        # Slug + path utility unit tests
├── .env.template            # Required variable names, no values
├── sawyer-docs.config.json  # Example/default config (committed; no secrets)
├── package.json             # "type": "module", bin: sawyer-docs
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── README.md
```

### Pattern 1: Zod Config + Env Overlay

**What:** Load JSON config first, then parse relevant env vars, merge env on top of config, validate the merged object with a single Zod schema call.

**When to use:** Any time a tool has both a committed config file and secret/machine-specific env vars.

**Example:**
```typescript
// src/config/schema.ts
import { z } from 'zod';

export const SUPPORTED_LANGS = ['de', 'en', 'nl', 'tr', 'uk'] as const;

export const ConfigSchema = z.object({
  languages: z.array(z.enum(SUPPORTED_LANGS)).default(['de', 'en', 'nl', 'tr', 'uk']),
  model: z.string().default('claude-sonnet-4-5'),
  repos: z.object({
    mobile: z.string(),
    dashboard: z.string(),
    platform: z.string(),
  }),
  deepl_api_key: z.string().min(1, 'DEEPL_API_KEY is required'),
  anthropic_api_key: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
});

export type Config = z.infer<typeof ConfigSchema>;
```

```typescript
// src/config/loader.ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { ConfigSchema } from './schema.js';

export function loadConfig(cwd = process.cwd()): Config {
  // 1. Load .env into process.env (does not override existing env vars)
  dotenv.config({ path: resolve(cwd, '.env') });

  // 2. Read JSON config
  const raw = JSON.parse(
    readFileSync(resolve(cwd, 'sawyer-docs.config.json'), 'utf-8')
  );

  // 3. Overlay env vars on top of JSON (env wins)
  const merged = {
    ...raw,
    deepl_api_key: process.env.DEEPL_API_KEY ?? raw.deepl_api_key,
    anthropic_api_key: process.env.ANTHROPIC_API_KEY ?? raw.anthropic_api_key,
  };

  // 4. Validate — throws ZodError with field-level messages on failure
  const result = ConfigSchema.safeParse(merged);
  if (!result.success) {
    const issues = result.error.issues
      .map(i => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuration invalid:\n${issues}`);
  }

  return result.data;
}
```

### Pattern 2: Slug-to-Path Contract

**What:** A deterministic function converts any string label (including German feature names) to a URL-safe English slug, then assembles the canonical path. Same input always produces the same output.

**When to use:** Any code that writes or references article files.

**Example:**
```typescript
// src/paths/slugify.ts
import slugify from '@sindresorhus/slugify';

/**
 * Converts any string to a URL-safe, umlaut-free English slug.
 * This is the stable public contract for consuming applications.
 *
 * Examples:
 *   "Benutzer-Authentifizierung" → "benutzer-authentifizierung"
 *   "Passwort zurücksetzen"      → "passwort-zurucksetzen"
 *   "Club Übersicht"             → "club-ubersicht"
 */
export function buildSlug(input: string): string {
  return slugify(input, {
    separator: '-',
    lowercase: true,
    // German umlauts: ä→ae, ö→oe, ü→ue handled by default
  });
}
```

```typescript
// src/paths/paths.ts
import { join } from 'node:path';
import type { SupportedLang } from './index.js';

/**
 * Builds the canonical article path relative to project root.
 * Stable public contract — never changes shape once established.
 *
 * @returns e.g. "docs/de/authentication/login.md"
 */
export function buildArticlePath(
  lang: SupportedLang,
  featureArea: string,
  slug: string
): string {
  return join('docs', lang, featureArea, `${slug}.md`);
}
```

### Pattern 3: Commander.js Subcommand Tree

**What:** Root program defines global flags (--verbose, --quiet, --config); each subcommand is defined in its own file and registered via `.addCommand()`.

**Example:**
```typescript
// src/bin/cli.ts
#!/usr/bin/env node
import { Command } from 'commander';
import { generateCommand } from '../commands/generate.js';
import { translateCommand } from '../commands/translate.js';
import { scanCommand } from '../commands/scan.js';

const program = new Command();

program
  .name('sawyer-docs')
  .description('Generate and translate support documentation for the sawyer ecosystem')
  .version('0.1.0')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-q, --quiet', 'Suppress non-essential output')
  .option('--config <path>', 'Path to config file', 'sawyer-docs.config.json');

program.addCommand(generateCommand);
program.addCommand(translateCommand);
program.addCommand(scanCommand);

program.parse();
```

### Anti-Patterns to Avoid

- **Validating config at module import time:** Config should be loaded inside the command action, not at module level — otherwise unit tests that import config utilities fail without a real config file present.
- **Using relative `./` imports without `.js` extension in ESM:** Node.js ESM requires explicit `.js` extensions even for TypeScript source files. Always import as `./schema.js` (tsc and tsup resolve this correctly to the `.ts` source during compilation).
- **Committing `.env` with real keys:** The existing `.gitignore` already covers `.env` patterns. Double-check `.env.local` and similar variants are also covered.
- **Making slugs locale-aware (German):** All slugs must stay English-ASCII regardless of the feature name's language. Slugs are the consuming app's API — a German feature name must produce a stable ASCII slug, not a German one.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Config schema validation | Custom type-checking function | Zod v4 | Edge cases: optional fields, default values, union types, nested objects, meaningful error messages |
| Umlaut-to-ASCII conversion | Custom char map (ä→ae etc.) | @sindresorhus/slugify | 30+ character mappings across German, French, Scandinavian; tested across Unicode edge cases |
| Terminal spinners | `process.stdout.write` loop | ora | TTY detection, CI-mode fallback, graceful cleanup on SIGINT, persist-on-complete behavior |
| .env file loading | `fs.readFileSync` + split/parse | dotenv | Handles quoted values, multiline values, comments, UTF-8; the hand-rolled version breaks on day 2 |
| CLI argument parsing | `process.argv.slice(2)` manually | commander | Automatic help generation, option inheritance, subcommand routing, type coercion |

**Key insight:** Each of these problems has 3–5 non-obvious edge cases. The libraries exist because every team that hand-rolled them eventually rewrote them.

---

## Common Pitfalls

### Pitfall 1: ESM/CJS Import Mismatch

**What goes wrong:** Project uses `"type": "module"` but a dependency (or the test runner config) imports with `require()`, producing `ERR_REQUIRE_ESM`.

**Why it happens:** Some older devDependencies or jest-style test setups default to CJS. The ESM-only libraries (ora, @sindresorhus/slugify) will hard-fail in a CJS context.

**How to avoid:** Set `"type": "module"` in package.json from the very start. Use Vitest (not Jest) — Vitest natively supports ESM. Use tsup with `format: ['esm']` only (no CJS needed for a local CLI tool). Use `.js` extensions in all TypeScript imports.

**Warning signs:** Any `require()` call in project code; `jest` in devDependencies; missing `.js` extension in a TypeScript import statement.

### Pitfall 2: Slug Instability Across Runs

**What goes wrong:** A feature slug changes on re-run because the input changes (e.g., Claude returns a slightly different label), breaking the consuming app's file references.

**Why it happens:** If slugs are derived from AI-generated labels rather than stable source identifiers, they drift. The slug must be computed once from a canonical source.

**How to avoid:** Phase 1 establishes the slug utility as pure deterministic function (same string in → same string out, every time). The scanner phase (Phase 2) is responsible for defining stable source identifiers; Phase 1's utility only needs to be proven deterministic via tests.

**Warning signs:** Tests that pass different strings and expect the same slug output; any randomness in the slug input pipeline.

### Pitfall 3: Zod Error Messages Too Terse for Developers

**What goes wrong:** `ZodError` is thrown with the raw error object, producing JSON output the developer doesn't understand.

**Why it happens:** `ConfigSchema.parse()` throws on failure with the raw ZodError. If not caught and formatted, the output is unreadable.

**How to avoid:** Always use `safeParse()` and manually format `result.error.issues` into human-readable messages before throwing. See the `loadConfig` pattern above.

**Warning signs:** Any `ConfigSchema.parse(...)` call not wrapped in a try/catch or safeParse check.

### Pitfall 4: .env Template With Actual Values

**What goes wrong:** Developer accidentally commits real API keys because they put them in `.env.template` instead of `.env`.

**Why it happens:** `.env.template` is committed; if it contains real values, they go into git history.

**How to avoid:** `.env.template` contains only variable names with placeholder values (`DEEPL_API_KEY=your_key_here`). The `.gitignore` already covers `.env` but NOT `.env.template` — that's correct and intentional.

**Warning signs:** Any actual API key pattern (starts with `sk-`, `DeepL-Auth-Key `, etc.) appearing in `.env.template`.

### Pitfall 5: Config Loaded Before dotenv.config() Runs

**What goes wrong:** `process.env.DEEPL_API_KEY` is `undefined` when the Zod schema validates it because `dotenv.config()` was never called or called after the validate step.

**Why it happens:** Module-level initialization order in ESM is not always obvious; a utility imported by config may trigger validation before the CLI entry point runs `dotenv.config()`.

**How to avoid:** Call `dotenv.config()` as the very first thing inside `loadConfig()`, before reading the JSON file or accessing `process.env`. Never validate config at module import time.

---

## Code Examples

Verified patterns from official sources:

### Zod safeParse with formatted errors
```typescript
// Pattern verified: zod.dev official docs
const result = ConfigSchema.safeParse(merged);
if (!result.success) {
  const issues = result.error.issues
    .map(i => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Configuration invalid:\n${issues}`);
}
return result.data; // fully typed as Config
```

### Commander subcommand with option flags
```typescript
// Pattern verified: commander.js official docs / tj/commander.js GitHub
export const generateCommand = new Command('generate')
  .description('Generate support articles from codebase scan')
  .option('--mobile <path>', 'Override mobile repo path')
  .option('--dashboard <path>', 'Override dashboard repo path')
  .option('--platform <path>', 'Override platform repo path')
  .action(async (options) => {
    const config = loadConfig();
    // merge CLI option overrides on top of config
    const mobile = options.mobile ?? config.repos.mobile;
    // ...
  });
```

### ora spinner lifecycle
```typescript
// Pattern verified: sindresorhus/ora GitHub README
import ora from 'ora';

const spinner = ora('Loading config').start();
try {
  const config = loadConfig();
  spinner.succeed('Config loaded');
} catch (err) {
  spinner.fail(`Config invalid: ${(err as Error).message}`);
  process.exit(1);
}
```

### tsup.config.ts for CLI binary
```typescript
// Pattern verified: tsup.egoist.dev official docs
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/bin/cli.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  sourcemap: false,
  // tsup auto-detects hashbang and sets chmod +x on output
});
```

### package.json bin field
```json
{
  "type": "module",
  "bin": {
    "sawyer-docs": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsx src/bin/cli.ts",
    "test": "vitest run"
  }
}
```

### vitest.config.ts for Node.js CLI
```typescript
// Pattern verified: vitest.dev/config official docs
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| chalk v4 (CJS) for colors | picocolors or chalk v5 (ESM) | 2022/chalk v5 | Must pick ESM-compatible color lib |
| Jest for Node.js testing | Vitest | 2022–2023 | Native ESM, no transform config needed |
| ts-node for dev execution | tsx | 2023 | tsx is faster, no config needed |
| Zod v3 for validation | Zod v4 (stable July 2025) | July 2025 | 14× faster; new API (minor migration) |
| ora v5 (CJS) | ora v8+ (ESM-only) | 2021/v6 | ESM-only; must use ESM project setup |
| Custom env parsing | dotenv v16 | ongoing | v16.4.7 adds multiline, better TS defs |

**Deprecated/outdated:**
- `ts-node`: Replaced by `tsx` for development execution — faster, no tsconfig setup
- `chalk v4`: Not deprecated but unmaintained relative to v5; v5 is ESM-only so requires ESM project
- `jest` with `ts-jest`: Still works but requires heavy CJS/ESM bridging config; Vitest is zero-config for TypeScript

---

## Open Questions

1. **tsx vs ts-node for dev execution**
   - What we know: `tsx` is widely recommended for 2025 ESM TypeScript projects; faster than ts-node
   - What's unclear: Whether the user wants a `dev` watch mode at all for a CLI tool (vs just `npm run build && sawyer-docs ...`)
   - Recommendation: Add `tsx` as a devDependency; it costs nothing and enables `tsx src/bin/cli.ts` for fast iteration

2. **Default verbosity**
   - What we know: User delegated this to Claude's discretion
   - Recommendation: Default to "normal" (spinner visible, final summary shown, individual file ops suppressed). `--verbose` adds per-file logging. `--quiet` suppresses everything except errors and the final summary line.

3. **Package manager: npm vs pnpm**
   - What we know: User delegated this; project is greenfield
   - Recommendation: Use `npm` — the existing `.gitignore` is npm-flavored (npm-debug.log, no pnpm entries), and `npm` requires no installation. Switch to pnpm only if workspace features are needed later.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` — Wave 0 gap |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLI-02 | Zod schema accepts valid language list; rejects invalid values | unit | `npx vitest run tests/config.test.ts` | Wave 0 |
| CLI-03 | Zod schema accepts model string; applies default when omitted | unit | `npx vitest run tests/config.test.ts` | Wave 0 |
| CLI-06 | loadConfig() reads API keys from process.env overlay | unit | `npx vitest run tests/config.test.ts` | Wave 0 |
| CLI-07 | .env.template file exists and contains DEEPL_API_KEY, ANTHROPIC_API_KEY placeholders | smoke | `npx vitest run tests/setup.test.ts` | Wave 0 |
| CLI-08 | .gitignore contains .env entry | smoke | `npx vitest run tests/setup.test.ts` | Wave 0 |
| FILE-01 | buildArticlePath returns correct path for known inputs | unit | `npx vitest run tests/paths.test.ts` | Wave 0 |
| FILE-02 | buildSlug('Räksmörgås') produces umlaut-free ASCII output; idempotent on re-run | unit | `npx vitest run tests/paths.test.ts` | Wave 0 |
| FILE-03 | buildArticlePath('de', ...) and buildArticlePath('nl', ...) use same structure | unit | `npx vitest run tests/paths.test.ts` | Wave 0 |
| DOC-01 | README.md exists and is non-empty | smoke | `npx vitest run tests/setup.test.ts` | Wave 0 |
| DOC-02 | README.md contains setup instructions section | smoke | manual | — |
| DOC-03 | README.md documents sawyer-docs generate, translate, scan | smoke | manual | — |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — test environment configuration
- [ ] `tests/config.test.ts` — covers CLI-02, CLI-03, CLI-06
- [ ] `tests/paths.test.ts` — covers FILE-01, FILE-02, FILE-03
- [ ] `tests/setup.test.ts` — covers CLI-07, CLI-08, DOC-01 (file existence checks)
- [ ] Framework install: `npm install --save-dev vitest` — no test infra exists yet

---

## Sources

### Primary (HIGH confidence)
- zod.dev — Zod v4 stable confirmed, safeParse API, schema definition patterns
- github.com/tj/commander.js — v14.0.2 confirmed, subcommand API, TypeScript types
- github.com/sindresorhus/slugify — v3.0.0 confirmed, ESM-only, German umlaut handling, customization options
- tsup.egoist.dev — tsup configuration for CLI binaries, hashbang handling
- vitest.dev/config — v4.0.x, node environment config, test file discovery

### Secondary (MEDIUM confidence)
- generalistprogrammer.com/tutorials/ora-npm-package-guide — ora v8.2.0 (Feb 2025), ESM-only, spinner API
- npmpackage.info/package/ora — version 8.2.0 confirmed
- motdotla/dotenv GitHub — v16.4.7 (Dec 2024), TypeScript definitions, multiline support

### Tertiary (LOW confidence)
- WebSearch: chalk vs picocolors comparison — multiple sources agree picocolors is smaller and dual CJS/ESM; chalk v5 ESM-only. Recommendation is MEDIUM confidence.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed via multiple search sources; Zod v4 release confirmed by InfoQ and zod.dev
- Architecture: HIGH — patterns are standard Node.js TypeScript CLI conventions; Zod/Commander patterns verified against official docs
- Pitfalls: HIGH — ESM pitfall is documented and reproducible; slug stability is a project-specific correctness requirement clearly derived from requirements

**Research date:** 2026-03-12
**Valid until:** 2026-06-12 (stable libraries; Zod v4 API unlikely to change significantly within 90 days)
