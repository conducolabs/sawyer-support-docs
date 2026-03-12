# sawyer-docs

CLI tool for generating and translating multilingual support documentation for the sawyer ecosystem. It scans three application codebases (mobile app, admin dashboard, platform API), generates German support articles via Claude AI, and translates them to all configured languages via DeepL Pro.

## Architecture

```
Codebase Repos
     │
     ▼
Scanner (Claude Code)
     │
     ▼
Feature Map
     │
     ▼
Generator (Claude AI)
     │
     ▼
German Articles
     │
     ▼
Translator (DeepL Pro)
     │
     ▼
Multilingual Docs
(docs/de/, docs/en/, docs/nl/, docs/tr/, docs/uk/)
```

Consuming applications (mobile app, dashboard, etc.) clone or pull this repo and read `.md` files directly from the file system. No API layer is involved.

## Prerequisites

- Node.js 18 or later
- npm
- DeepL Pro API key (required for `translate` command)
- Anthropic API key (required for `generate` command)

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

### `sawyer-docs generate`

Scan the configured codebases and generate German support articles.

```
sawyer-docs generate [options]

Options:
  --mobile <path>      Override mobile app repository path
  --dashboard <path>   Override dashboard repository path
  --platform <path>    Override platform repository path
  --dry-run            Preview what would be generated without writing files
  -v, --verbose        Show detailed output
  -q, --quiet          Suppress all output except errors
  --config <path>      Path to config file (default: ./sawyer-docs.config.json)
  -h, --help           Display help
```

### `sawyer-docs translate`

Translate existing German articles to all configured languages via DeepL Pro.

```
sawyer-docs translate [options]

Options:
  -v, --verbose        Show detailed output
  -q, --quiet          Suppress all output except errors
  --config <path>      Path to config file (default: ./sawyer-docs.config.json)
  -h, --help           Display help
```

### `sawyer-docs scan`

Scan the configured codebases and output a feature map (without generating articles).

```
sawyer-docs scan [options]

Options:
  --mobile <path>      Override mobile app repository path
  --dashboard <path>   Override dashboard repository path
  --platform <path>    Override platform repository path
  -v, --verbose        Show detailed output
  -q, --quiet          Suppress all output except errors
  --config <path>      Path to config file (default: ./sawyer-docs.config.json)
  -h, --help           Display help
```

### Global flags

All commands accept these flags:

| Flag | Short | Description |
|------|-------|-------------|
| `--verbose` | `-v` | Show detailed progress and debug output |
| `--quiet` | `-q` | Suppress all output except errors |
| `--config <path>` | — | Use a custom config file path |
| `--help` | `-h` | Show command help |

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

## Example Article Output

A generated article looks like this:

```markdown
---
title: Logging In
language: en
---

# Logging In

This article explains how to log in to the sawyer app.

## Steps

1. Open the sawyer app on your device.
2. Tap **Sign in**.
3. Enter your email address and password.
4. Tap **Continue**.

If you have forgotten your password, tap **Forgot password?** on the sign-in screen.

## Troubleshooting

**I cannot log in.**
Check that you are using the email address associated with your sawyer account. If the issue persists, contact your club or company administrator.
```

German is always the source language. The `translate` command produces equivalent articles under the `en/`, `nl/`, `tr/`, and `uk/` directories.

## Development

Run the CLI directly without building:

```bash
npm run dev -- generate --dry-run
npm run dev -- translate
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

### Architecture

The project uses a vertical slice structure:

```
src/
├── bin/        — CLI entry point (commander setup)
├── commands/   — One file per subcommand (generate, translate, scan)
├── config/     — Config schema (Zod), loader, barrel export
├── paths/      — Slug utility and article path builder (public contract)
└── ui/         — Logger utility (ora + picocolors)
```

Each module is self-contained. Downstream phases (scanner, generator, translator) import from `src/config/index.js` and `src/paths/index.js` without coupling to internal implementation details.

### Before submitting

1. Run `npm test` — all tests must pass
2. Run `npm run build` — build must succeed with no TypeScript errors
3. Keep per-task commits atomic and well-described

## License

See [LICENSE](./LICENSE).
