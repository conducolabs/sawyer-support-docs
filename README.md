# sawyer-docs

CLI tool for generating and translating multilingual support documentation for the sawyer ecosystem. It scans three application codebases (mobile app, admin dashboard, platform API), generates German support articles via Claude AI, and translates them to all configured languages via DeepL Pro.

## Architecture

```
Codebase Repos
     │
     ▼
Scanner (Claude Agent SDK — multi-pass)
     │
     ▼
Feature Map (JSON)
     │
     ▼
Generator (Claude AI — temperature 0)
     │
     ▼
German Articles (docs/de/)
     │
     ▼
Translator (DeepL Pro — hash gated)
     │
     ▼
Multilingual Docs
(docs/de/, docs/en/, docs/nl/, docs/tr/, docs/uk/)
```

Consuming applications (mobile app, dashboard, etc.) clone or pull this repo and read `.md` files directly from the file system. No API layer is involved.

## Prerequisites

- Node.js 22 or later
- npm
- DeepL Pro API key (required for `translate` and `run` commands)
- Anthropic API key (required for `scan`, `generate`, and `run` commands)

## Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/conducolabs/sawyer-support-docs.git
   cd sawyer-support-docs
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the environment template and fill in your API keys:

   ```bash
   cp .env.template .env
   ```

   Then edit `.env`:

   ```
   DEEPL_API_KEY=your_deepl_api_key_here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

   - **DeepL API key:** Create a DeepL developer account at [deepl.com/pro-api](https://www.deepl.com/pro-api). Navigate to your account settings to find your authentication key.
   - **Anthropic API key:** Sign in to [console.anthropic.com](https://console.anthropic.com), go to API Keys, and create a new key.

4. Build the project:

   ```bash
   npm run build
   ```

5. (Optional) Link the CLI globally for direct `sawyer-docs` invocation:

   ```bash
   npm link
   ```

## Configuration

Project settings live in `sawyer-docs.config.json` at the repository root. Secrets always go in `.env` (never in the config file — it is committed to version control).

### Config file reference

| Setting | Key | Env Override | Default | Description |
|---------|-----|-------------|---------|-------------|
| Languages | `languages` | `SAWYER_DOCS_LANGUAGES` | `["de","en","nl","tr","uk"]` | Languages to generate/translate. Comma-separated in env var. |
| AI model | `model` | `SAWYER_DOCS_MODEL` | `"claude-sonnet-4-5"` | Claude model for article generation. |
| Mobile app repo | `repos.mobile` | — | `""` | Local path to the sawyer-mobile-app repository. |
| Dashboard repo | `repos.dashboard` | — | `""` | Local path to the sawyer-dashboard repository. |
| Platform repo | `repos.platform` | — | `""` | Local path to the projectsawyer-platform repository. |
| DeepL API key | `deepl_api_key` | `DEEPL_API_KEY` | — | **Required.** DeepL Pro authentication key. |
| Anthropic API key | `anthropic_api_key` | `ANTHROPIC_API_KEY` | — | **Required.** Anthropic API key for Claude. |

### Example config file

```json
{
  "languages": ["de", "en", "nl", "tr", "uk"],
  "model": "claude-sonnet-4-5",
  "repos": {
    "mobile": "/Users/you/projects/sawyer-mobile-app",
    "dashboard": "/Users/you/projects/sawyer-dashboard",
    "platform": "/Users/you/projects/projectsawyer-platform"
  }
}
```

Store repo paths in the config file so you do not have to pass `--mobile`, `--dashboard`, and `--platform` flags on every run.

## CLI Commands

All commands are available via `sawyer-docs` (after `npm run build && npm link`) or `npm run dev -- <command>` (no build step).

### `sawyer-docs run`

Run the full pipeline: scan codebases, detect changes, generate German articles, and translate them. This is the primary command for keeping documentation up to date.

```
sawyer-docs run [options]

Options:
  --mobile <path>      Override mobile app repository path
  --dashboard <path>   Override dashboard repository path
  --platform <path>    Override platform repository path
  --features <slugs>   Comma-separated feature slugs to process (intersect with detected changes)
  --languages <langs>  Override config languages (comma-separated, e.g., en,nl)
  --dry-run            Preview what would be generated/translated without API calls (scan still runs)
  --force              Force overwrite translations even if manually edited
  --verbose            Show detailed progress
  --quiet              Suppress non-essential output
```

**Change detection:** On subsequent runs, the scanner compares against a stored state file and only regenerates articles for features in codebases that changed. If nothing changed, the pipeline exits early without calling Claude or DeepL.

**Hash gating:** Translated files include a `source_hash` in frontmatter. If you manually edit a translation, it will not be overwritten on the next run unless the German source article has changed. Use `--force` to overwrite regardless.

### `sawyer-docs scan`

Scan codebases and produce a feature map (without generating articles). Useful for inspecting what the scanner detects.

```
sawyer-docs scan [options]

Options:
  --mobile <path>      Override mobile app repository path
  --dashboard <path>   Override dashboard repository path
  --platform <path>    Override platform repository path
  -v, --verbose        Show detailed output
  -q, --quiet          Suppress all output except errors
  --config <path>      Path to config file (default: ./sawyer-docs.config.json)
```

### `sawyer-docs generate`

Generate German support articles from the feature map. Requires a prior `scan` run.

```
sawyer-docs generate [options]

Options:
  --features <slugs>   Comma-separated feature slugs to generate (default: all)
  --dry-run            Preview what would be generated without making API calls
```

### `sawyer-docs translate`

Translate German articles to all configured languages via DeepL Pro.

```
sawyer-docs translate [options]

Options:
  --features <slugs>   Comma-separated feature slugs to translate (default: all)
  --languages <langs>  Override config languages (comma-separated, e.g., en,nl)
  --dry-run            Show what would be translated and estimated character count
  --force              Overwrite translations even if manually edited
```

### Global flags

All commands accept these flags:

| Flag | Short | Description |
|------|-------|-------------|
| `--verbose` | `-v` | Show detailed progress and debug output |
| `--quiet` | `-q` | Suppress all output except errors |
| `--config <path>` | — | Use a custom config file path |
| `--help` | `-h` | Show command help |

### Manual article creation (Claude Code Skill)

If you use Claude Code, invoke the `/new-article` skill to create a one-off article interactively. The skill:

1. Asks structured questions (topic, audience, feature area)
2. Asks clarifying questions if the scope is unclear
3. Generates a German draft and presents it for approval
4. On approval, auto-translates to all configured languages

Manual articles land in the same `docs/` tree as automated ones but are not tracked in the feature map, so they will not be overwritten by subsequent `run` commands.

## Output Directory Structure

Generated documentation is written to the `docs/` directory:

```
docs/
├── de/
│   ├── authentication/
│   │   ├── login.md
│   │   └── password-reset.md
│   ├── payments/
│   │   └── checkout.md
│   └── club-management/
│       └── member-overview.md
├── en/
│   ├── authentication/
│   │   ├── login.md
│   │   └── password-reset.md
│   └── payments/
│       └── checkout.md
├── nl/
├── tr/
└── uk/
```

The directory structure is identical across all languages — the same feature area and slug segments appear under every language directory, differing only in the top-level language code.

## File Path Contract

Article paths follow the format: `docs/{lang}/{feature-area}/{slug}.md`

**Slugs are stable.** They are URL-safe, umlaut-free English identifiers computed deterministically from feature names. The same feature always produces the same slug across runs, which means consuming applications can hard-code paths like `docs/de/authentication/login.md` and rely on them never changing for that feature.

**The path is the public API.** If your application links to or reads a support article at a specific path, that path will remain stable as long as the underlying feature exists and its name does not change.

Example slugs:
- `Benutzer-Authentifizierung` → `benutzer-authentifizierung`
- `Passwort zurücksetzen` → `passwort-zurucksetzen`
- `Club Übersicht` → `club-ubersicht`

## Article Format

Articles are generated in German first, then translated. Each article has YAML frontmatter and a markdown body:

```markdown
---
title: Anmelden
language: de
---

# Anmelden

Dieser Artikel erklärt, wie du dich in der sawyer App anmeldest.

## Schritte

1. Öffne die sawyer App auf deinem Gerät.
2. Tippe auf **Anmelden**.
3. Gib deine E-Mail-Adresse und dein Passwort ein.
4. Tippe auf **Weiter**.
```

Translated files include an additional `source_hash` field in frontmatter to track the German source version.

Articles are audience-aware:
- **Mobile app features** are written for end users (informal Du-form)
- **Dashboard features** are written for club/company admins

Enrollment and onboarding topics direct users to their local contact person rather than providing step-by-step instructions.

## Development

Run the CLI directly without building:

```bash
npm run dev -- run --dry-run --mobile ../sawyer-mobile-app --dashboard ../sawyer-dashboard --platform ../projectsawyer-platform
npm run dev -- generate --dry-run
npm run dev -- translate --dry-run
npm run dev -- scan --verbose
```

Run the test suite:

```bash
npm test
```

Build to `dist/`:

```bash
npm run build
```

Output lands in `dist/` as ESM JavaScript. The `dist/` directory is git-ignored — do not commit built files.

## Contributing

### Code style

- TypeScript with strict mode enabled — no `any` types
- Pure ESM project — all imports use `.js` extensions (even when importing `.ts` source files)
- Config validation with Zod `safeParse` — raw `ZodError` is never surfaced to users
- Temperature 0 for all Claude generation calls (determinism is a correctness requirement)

### Architecture

The project uses a vertical slice structure:

```
src/
├── bin/        — CLI entry point (commander setup)
├── commands/   — One file per subcommand (scan, generate, translate, run)
├── config/     — Config schema (Zod), loader, barrel export
├── generator/  — Prompt templates, frontmatter builder, article writer
├── paths/      — Slug utility and article path builder (public contract)
├── scanner/    — Multi-pass Claude Agent SDK scanner, schemas, state persistence
├── skill/      — Manual article creation helper for Claude Code Skill
├── translator/ — DeepL client, hash gating, frontmatter round-trip, file writer
└── ui/         — Logger utility (ora + picocolors)
```

Each module is self-contained with a barrel export (`index.ts`). Downstream modules import from barrel exports without coupling to internal implementation details.

### Before submitting

1. Run `npm test` — all tests must pass
2. Run `npm run build` — build must succeed with no TypeScript errors
3. Keep per-task commits atomic and well-described

## License

See [LICENSE](./LICENSE).
