# Technology Stack

**Project:** sawyer Support Docs — Multilingual Documentation Generation CLI
**Researched:** 2026-03-12
**Confidence note:** External tools (WebSearch, WebFetch, Context7) were unavailable during this research session. All version numbers and library assessments are based on training knowledge (cutoff August 2025). **Versions MUST be verified against npmjs.com before lock-in.** Confidence levels are assigned conservatively.

---

## Recommended Stack

### Runtime & Language

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js | 22 LTS | Runtime | LTS as of Oct 2024, active maintenance through 2027. Native ESM, excellent `fs` APIs, no compile step needed. Matches the target codebases (React Native / React / Node.js) so toolchain is unified. |
| TypeScript | ~5.4 | Type safety | Confidence: MEDIUM — 5.x branch is stable and widely adopted. Exact patch should be resolved at install time via `latest` in the 5.x range. Enables IDE autocomplete for the AI SDK and DeepL types, critical for maintainability. |

### CLI Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| commander | ~12.x | CLI argument parsing, subcommands | Confidence: HIGH (training). The de-facto standard for Node.js CLIs. Zero runtime deps, extremely stable API, excellent TypeScript support via `@types/commander`. Simpler and more predictable than `yargs` for this scope; avoids `oclif`'s heavy plugin/plugin-registry overhead which is unnecessary here. Used by widely deployed tools including `@vue/cli` and `create-react-app`. |
| ora | ~8.x | Spinner / progress indicators | Confidence: MEDIUM — Pure-ESM package in recent versions. Shows progress during AI generation and translation calls which have non-trivial latency. Widely used, minimal surface area. |
| chalk | ~5.x | Terminal coloring | Confidence: HIGH (training). Pure-ESM in v5+. Standard for CLI output styling. No alternatives worth evaluating at this scope. |
| inquirer | ~9.x | Interactive prompts | Confidence: MEDIUM — Used in the Claude Code Skill flow for clarifying questions before article generation. Inquirer v9+ is pure-ESM with good TypeScript types. Alternative `@inquirer/prompts` (the modular successor) is appropriate if only a subset of prompt types is needed. |

### AI Content Generation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @anthropic-ai/sdk | ~0.24.x | Claude API client | Confidence: LOW — Version number based on training data from mid-2025; Anthropic releases frequently. The official SDK is the only correct choice. Supports streaming, tool use, and the Messages API. Provides TypeScript types. **Verify current version at npmjs.com/package/@anthropic-ai/sdk before installing.** |

### Translation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| deepl-node | ~1.x | DeepL Pro API client | Confidence: LOW — Version based on training data. The official DeepL Node.js library maintained by DeepL GmbH. Supports text and document translation, language detection, glossaries. Handles Pro API key authentication. **Verify current version at npmjs.com/package/deepl-node.** |

### Codebase Scanning

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| simple-git | ~3.x | Git diff / change detection | Confidence: HIGH (training). The standard high-level Git wrapper for Node.js. Used for `git diff` to identify changed files and new screens/flows between commits. Avoids shelling out to `git` directly and handles cross-platform path normalization. |
| glob | ~11.x | File discovery | Confidence: MEDIUM — Used to enumerate `.tsx`, `.ts`, `.jsx` files in the scanned codebases. Node.js 22 ships a built-in `glob` in `fs/promises` (as of Node 22), but the `glob` npm package provides richer pattern support and is battle-tested. Consider using the built-in first; fall back to the package only if pattern complexity requires it. |
| @babel/parser | ~7.x | AST parsing for React/RN component extraction | Confidence: MEDIUM — Parses `.tsx`/`.jsx` to extract screen names, route definitions, and component identifiers without needing a full TypeScript compiler setup. Alternative: `typescript` compiler API directly, but that requires a `tsconfig.json` in the scanned repo. Babel parser handles both TS and JSX without config overhead. |

### File Output

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| gray-matter | ~4.x | Frontmatter parsing and writing | Confidence: HIGH (training). The standard library for YAML frontmatter in markdown files. Used to write and read the `title` and `language` metadata fields. Used by Gatsby, Astro, Vitepress, and nearly every static site tool — extremely stable, no churn expected. |
| Node.js `fs/promises` | built-in | File read/write | No dependency needed. Native async file I/O is sufficient for writing `.md` files to the output directory tree. |

### Configuration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| zod | ~3.x | Config schema validation | Confidence: HIGH (training). Validates the user's config file (API keys, language list, model name, source paths) at startup with human-readable error messages. Prevents cryptic downstream failures when config is malformed. Smaller surface than Joi; better TypeScript inference than yup. |
| dotenv | ~16.x | .env file loading | Confidence: HIGH (training). Loads `ANTHROPIC_API_KEY`, `DEEPL_API_KEY`, and any other secrets from a `.env` file. Zero deps, industry standard. |

### Testing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| vitest | ~2.x | Unit and integration tests | Confidence: MEDIUM — Fast, ESM-native test runner. Preferred over Jest for ESM-first Node.js projects because it avoids the transform configuration pain that Jest requires for ESM. Provides compatible `describe`/`it`/`expect` API for easy migration. `vitest` v2.x is the current major. |
| msw | ~2.x | HTTP mocking for AI/DeepL API calls | Confidence: MEDIUM — Mock Service Worker v2 works in Node.js (via `@mswjs/interceptors`) and intercepts `fetch`/`http` calls. Required to test generation and translation pipelines without incurring real API costs. Alternative: `nock`, but nock doesn't work with `fetch`-based clients; the Anthropic SDK uses `fetch`. |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| CLI framework | commander | yargs | Yargs is more complex with more implicit magic; better suited for tools with many nested subcommands and dynamic options. This CLI has a small, fixed command surface. |
| CLI framework | commander | oclif | oclif adds a plugin registry, generator scaffolding, and a class-based command architecture. Significant overhead for a single-repo internal tool. |
| AI SDK | @anthropic-ai/sdk | fetch directly | Raw fetch is viable but loses type safety, streaming helpers, and automatic retry logic. The SDK cost is one package; the benefit is significant. |
| Translation | deepl-node | deepl REST API via fetch | Same argument as above — the official SDK handles auth, rate-limit retries, and type safety. |
| AST parsing | @babel/parser | typescript compiler API | TypeScript compiler API requires `tsconfig.json` in each scanned repo and is significantly heavier to invoke. Babel parser is simpler for extraction-only use cases. |
| AST parsing | @babel/parser | regex/string matching | Regex against source files for screen names and route definitions is fragile and will break on any formatting variation. AST parsing is the correct approach. |
| Config validation | zod | joi | Joi is CommonJS-first and adds more weight. Zod has superior TypeScript inference and is the community-converging choice for Node.js config validation. |
| Test runner | vitest | jest | Jest requires explicit ESM transform config (`--experimental-vm-modules` or babel transform). Vitest is ESM-native and works without configuration overhead for modern Node.js projects. |
| Markdown frontmatter | gray-matter | manual string construction | Manual YAML construction is error-prone for multi-language strings. gray-matter handles escaping and serialization correctly. |

---

## Project Structure Recommendation

```
sawyer-support-docs/
├── src/
│   ├── cli/           # commander entry point, command definitions
│   ├── scanner/       # codebase scanning, AST extraction, git diff
│   ├── generator/     # Claude AI article generation
│   ├── translator/    # DeepL translation pipeline
│   ├── writer/        # .md file output with gray-matter
│   ├── config/        # zod schema, dotenv loading
│   └── skill/         # Claude Code Skill (interactive article creation)
├── docs/              # generated output (committed separately)
├── .env.example       # template for API keys
└── package.json       # type: "module" (pure ESM)
```

**Use `"type": "module"` in `package.json`.** All recommended libraries support ESM. Mixing CJS and ESM mid-project is the single most common source of friction in Node.js CLI projects.

---

## Installation

```bash
# Runtime dependencies
npm install commander ora chalk inquirer \
  @anthropic-ai/sdk deepl-node \
  simple-git glob \
  @babel/parser \
  gray-matter \
  zod dotenv

# Dev dependencies
npm install -D typescript @types/node \
  vitest msw \
  @babel/types
```

---

## Key Configuration Notes

**Claude model:** Project requires `claude-sonnet-4-5` as default with a configurable override. The Anthropic SDK accepts the model string in the messages call — no special setup needed. Validate the model string via zod enum or allowlist at startup to fail fast on typos.

**DeepL language codes:** DeepL uses specific codes for language variants (e.g., `EN-US` not `EN`, `DE` for German). The `deepl-node` SDK exports a `TargetLanguageCode` enum — use it, don't pass raw strings.

**Rate limiting:** DeepL Pro has a character-based quota, not a requests-per-second hard cap, but large batch translations should be chunked. The Anthropic API has per-minute token limits. Build a simple retry-with-backoff wrapper around both clients.

**Git operations scope:** `simple-git` must be initialized against each scanned repo's path separately (not the docs repo). Paths are passed in at CLI invocation time.

---

## Confidence Assessment

| Component | Confidence | Caveat |
|-----------|------------|--------|
| Node.js 22 LTS | HIGH | LTS status verified in training, stable until 2027 |
| TypeScript 5.x | HIGH | Major version stable, patch version needs verification |
| commander ~12.x | HIGH | Very stable library, major version unlikely to have changed |
| @anthropic-ai/sdk version | LOW | Anthropic releases frequently; verify at npmjs.com |
| deepl-node version | LOW | Verify at npmjs.com before install |
| @babel/parser ~7.x | HIGH | Babel 7.x has been the stable major for years |
| gray-matter ~4.x | HIGH | No churn; widely embedded in static site tooling |
| vitest ~2.x | MEDIUM | v2 was current as of mid-2025; may have moved to v3 |
| msw ~2.x | MEDIUM | v2 Node.js support is solid; verify current version |
| inquirer ~9.x | MEDIUM | The modular `@inquirer/prompts` split was in progress; verify which package is current community recommendation |

---

## Sources

- Training knowledge (cutoff August 2025) — all claims
- Official documentation URLs to verify before development:
  - Anthropic SDK: https://docs.anthropic.com/en/api/getting-started
  - DeepL Node SDK: https://github.com/DeepLcom/deepl-node
  - commander: https://github.com/tj/commander.js
  - vitest: https://vitest.dev/
  - simple-git: https://github.com/steveukx/git-js
  - gray-matter: https://github.com/jonschlinkert/gray-matter
