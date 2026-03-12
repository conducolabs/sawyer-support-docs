import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { ConfigSchema } from './schema.js';
import type { Config } from './schema.js';

export function loadConfig(cwd = process.cwd()): Config {
  // 1. Load .env into process.env FIRST (does not override existing env vars)
  dotenv.config({ path: resolve(cwd, '.env') });

  // 2. Read JSON config file
  const configPath = resolve(cwd, 'sawyer-docs.config.json');

  if (!existsSync(configPath)) {
    throw new Error(`sawyer-docs.config.json not found in ${cwd}`);
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    throw new Error(`sawyer-docs.config.json contains invalid JSON`);
  }

  // 3. Build merged config — env vars win over JSON values
  const merged: Record<string, unknown> = {
    ...raw,
    deepl_api_key: process.env.DEEPL_API_KEY ?? (raw.deepl_api_key as string | undefined),
    anthropic_api_key:
      process.env.ANTHROPIC_API_KEY ?? (raw.anthropic_api_key as string | undefined),
  };

  // Optional env overrides for model and languages
  if (process.env.SAWYER_DOCS_MODEL) {
    merged.model = process.env.SAWYER_DOCS_MODEL;
  }

  if (process.env.SAWYER_DOCS_LANGUAGES) {
    merged.languages = process.env.SAWYER_DOCS_LANGUAGES.split(',').map((l) => l.trim());
  }

  // 4. Validate with Zod — safeParse for clean error messages
  const result = ConfigSchema.safeParse(merged);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuration invalid:\n${issues}`);
  }

  return result.data;
}
