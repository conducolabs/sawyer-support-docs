# Phase 1: Foundation - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Config layer, shared types, file path contract, and project scaffolding. Developer can initialize and configure the project with validated settings, and the file path contract is established as a stable public API for consuming applications. No scanning, generation, or translation logic — just the skeleton everything else plugs into.

</domain>

<decisions>
## Implementation Decisions

### Config file format
- JSON format: `sawyer-docs.config.json` at project root
- Secrets in `.env` file (API keys for DeepL and Anthropic)
- `.env` can override any config setting (config + .env override pattern)
- `.env.template` shipped with required variable names, no actual secrets
- `.env` and secret-containing files added to `.gitignore`
- Config validated at startup with clear error messages for missing keys
- Repo paths (mobile, dashboard, platform) stored in config with CLI flag overrides for one-off runs

### Output directory layout
- Top-level directory: `docs/`
- Language directories use short ISO 639-1 codes: `docs/de/`, `docs/en/`, `docs/nl/`, `docs/tr/`, `docs/uk/`
- Single-level feature areas under each language: `docs/de/authentication/`, `docs/de/payments/`
- File names are feature slugs only: `login.md`, `password-reset.md` (no type prefix)
- No index files — consuming apps handle discovery
- All slugs are URL-safe, umlaut-free English identifiers (stable public contract)

### CLI command design
- Binary name: `sawyer-docs`
- Subcommand architecture: `sawyer-docs generate`, `sawyer-docs translate`, `sawyer-docs scan`
- Structured output with spinners and colored status lines during runs
- Summary display at end of each run

### Verbosity
- Claude's discretion on default verbosity level
- Must support `--verbose` and `--quiet` flags

### README
- English language, comprehensive reference style
- Full setup instructions, all commands, config reference, troubleshooting
- Includes: architecture diagram (pipeline overview), config reference table, example article output, contributing guide

### Claude's Discretion
- Default verbosity level (quiet vs verbose)
- Exact spinner/progress implementation library
- TypeScript project structure (src/ layout, barrel exports, etc.)
- Package manager choice (npm vs pnpm)
- Zod schema design for config validation

</decisions>

<specifics>
## Specific Ideas

- Config + .env override pattern: developer sets defaults in config.json once, uses .env for secrets and per-machine overrides
- Repo paths in config means developer doesn't have to pass `--mobile ./path` every single run — just when overriding
- README should serve as a single entry point — a new developer reads it and can set up and run without asking questions

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, only LICENSE file exists

### Established Patterns
- None — all patterns will be established in this phase

### Integration Points
- Config layer will be consumed by all subsequent phases (scanner, generator, translator)
- File path utilities will be used by generator and translator to write to correct locations
- `.env.template` and `.gitignore` are setup-time artifacts

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-12*
