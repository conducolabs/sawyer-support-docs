import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

// We import loadConfig lazily inside tests to allow environment control

function createTempDir(): string {
  const dir = join(tmpdir(), `sawyer-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeConfig(dir: string, config: Record<string, unknown>): void {
  writeFileSync(join(dir, 'sawyer-docs.config.json'), JSON.stringify(config, null, 2));
}

function writeEnv(dir: string, vars: Record<string, string>): void {
  const content = Object.entries(vars)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  writeFileSync(join(dir, '.env'), content);
}

describe('Config schema and loader', () => {
  let tmpDir: string;
  let savedEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tmpDir = createTempDir();
    // Save and clear relevant env vars
    savedEnv = { ...process.env };
    delete process.env.DEEPL_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.SAWYER_DOCS_MODEL;
    delete process.env.SAWYER_DOCS_LANGUAGES;
  });

  afterEach(() => {
    // Restore env
    process.env = savedEnv;
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('Valid config parsing', () => {
    it('parses a fully valid config with all required fields', async () => {
      writeConfig(tmpDir, {
        languages: ['de', 'en'],
        model: 'claude-sonnet-4-5',
        repos: {
          mobile: './repos/mobile',
          dashboard: './repos/dashboard',
          platform: './repos/platform',
        },
      });
      writeEnv(tmpDir, {
        DEEPL_API_KEY: 'test-deepl-key',
        ANTHROPIC_API_KEY: 'test-anthropic-key',
      });

      const { loadConfig } = await import('../src/config/index.js');
      const config = loadConfig(tmpDir);

      expect(config.languages).toEqual(['de', 'en']);
      expect(config.model).toBe('claude-sonnet-4-5');
      expect(config.repos.mobile).toBe('./repos/mobile');
      expect(config.deepl_api_key).toBe('test-deepl-key');
      expect(config.anthropic_api_key).toBe('test-anthropic-key');
    });

    it('applies default languages when omitted from config', async () => {
      writeConfig(tmpDir, {
        model: 'claude-sonnet-4-5',
        repos: {
          mobile: './repos/mobile',
          dashboard: './repos/dashboard',
          platform: './repos/platform',
        },
      });
      writeEnv(tmpDir, {
        DEEPL_API_KEY: 'test-deepl-key',
        ANTHROPIC_API_KEY: 'test-anthropic-key',
      });

      const { loadConfig } = await import('../src/config/index.js');
      const config = loadConfig(tmpDir);

      expect(config.languages).toEqual(['de', 'en', 'nl', 'tr', 'uk']);
    });

    it('applies default model when omitted from config', async () => {
      writeConfig(tmpDir, {
        repos: {
          mobile: './repos/mobile',
          dashboard: './repos/dashboard',
          platform: './repos/platform',
        },
      });
      writeEnv(tmpDir, {
        DEEPL_API_KEY: 'test-deepl-key',
        ANTHROPIC_API_KEY: 'test-anthropic-key',
      });

      const { loadConfig } = await import('../src/config/index.js');
      const config = loadConfig(tmpDir);

      expect(config.model).toBe('claude-sonnet-4-5');
    });
  });

  describe('Environment variable overlay', () => {
    it('env DEEPL_API_KEY overrides JSON config value', async () => {
      writeConfig(tmpDir, {
        repos: {
          mobile: './repos/mobile',
          dashboard: './repos/dashboard',
          platform: './repos/platform',
        },
        deepl_api_key: 'json-deepl-key',
      });
      writeEnv(tmpDir, {
        DEEPL_API_KEY: 'env-deepl-key',
        ANTHROPIC_API_KEY: 'test-anthropic-key',
      });

      const { loadConfig } = await import('../src/config/index.js');
      const config = loadConfig(tmpDir);

      expect(config.deepl_api_key).toBe('env-deepl-key');
    });

    it('env ANTHROPIC_API_KEY overrides JSON config value', async () => {
      writeConfig(tmpDir, {
        repos: {
          mobile: './repos/mobile',
          dashboard: './repos/dashboard',
          platform: './repos/platform',
        },
      });
      writeEnv(tmpDir, {
        DEEPL_API_KEY: 'test-deepl-key',
        ANTHROPIC_API_KEY: 'env-anthropic-key',
      });

      const { loadConfig } = await import('../src/config/index.js');
      const config = loadConfig(tmpDir);

      expect(config.anthropic_api_key).toBe('env-anthropic-key');
    });

    it('SAWYER_DOCS_MODEL env var overrides model config', async () => {
      writeConfig(tmpDir, {
        repos: {
          mobile: './repos/mobile',
          dashboard: './repos/dashboard',
          platform: './repos/platform',
        },
      });
      writeEnv(tmpDir, {
        DEEPL_API_KEY: 'test-deepl-key',
        ANTHROPIC_API_KEY: 'test-anthropic-key',
        SAWYER_DOCS_MODEL: 'claude-opus-4-5',
      });

      const { loadConfig } = await import('../src/config/index.js');
      const config = loadConfig(tmpDir);

      expect(config.model).toBe('claude-opus-4-5');
    });

    it('SAWYER_DOCS_LANGUAGES env var overrides languages config', async () => {
      writeConfig(tmpDir, {
        repos: {
          mobile: './repos/mobile',
          dashboard: './repos/dashboard',
          platform: './repos/platform',
        },
      });
      writeEnv(tmpDir, {
        DEEPL_API_KEY: 'test-deepl-key',
        ANTHROPIC_API_KEY: 'test-anthropic-key',
        SAWYER_DOCS_LANGUAGES: 'de,en',
      });

      const { loadConfig } = await import('../src/config/index.js');
      const config = loadConfig(tmpDir);

      expect(config.languages).toEqual(['de', 'en']);
    });
  });

  describe('Validation errors', () => {
    it('throws when DEEPL_API_KEY is missing', async () => {
      writeConfig(tmpDir, {
        repos: {
          mobile: './repos/mobile',
          dashboard: './repos/dashboard',
          platform: './repos/platform',
        },
      });
      writeEnv(tmpDir, {
        ANTHROPIC_API_KEY: 'test-anthropic-key',
      });

      const { loadConfig } = await import('../src/config/index.js');

      expect(() => loadConfig(tmpDir)).toThrow(/deepl_api_key|DEEPL_API_KEY/i);
    });

    it('throws when ANTHROPIC_API_KEY is missing', async () => {
      writeConfig(tmpDir, {
        repos: {
          mobile: './repos/mobile',
          dashboard: './repos/dashboard',
          platform: './repos/platform',
        },
      });
      writeEnv(tmpDir, {
        DEEPL_API_KEY: 'test-deepl-key',
      });

      const { loadConfig } = await import('../src/config/index.js');

      expect(() => loadConfig(tmpDir)).toThrow(/anthropic_api_key|ANTHROPIC_API_KEY/i);
    });

    it('throws with "Configuration invalid" prefix on validation failure', async () => {
      writeConfig(tmpDir, {
        repos: {
          mobile: './repos/mobile',
          dashboard: './repos/dashboard',
          platform: './repos/platform',
        },
      });
      // No .env file — API keys missing

      const { loadConfig } = await import('../src/config/index.js');

      expect(() => loadConfig(tmpDir)).toThrow(/Configuration invalid/);
    });

    it('rejects invalid language value in languages array', async () => {
      writeConfig(tmpDir, {
        languages: ['de', 'invalid-lang'],
        repos: {
          mobile: './repos/mobile',
          dashboard: './repos/dashboard',
          platform: './repos/platform',
        },
      });
      writeEnv(tmpDir, {
        DEEPL_API_KEY: 'test-deepl-key',
        ANTHROPIC_API_KEY: 'test-anthropic-key',
      });

      const { loadConfig } = await import('../src/config/index.js');

      expect(() => loadConfig(tmpDir)).toThrow(/Configuration invalid/);
    });
  });

  describe('File error handling', () => {
    it('throws clear error when sawyer-docs.config.json is missing', async () => {
      // No config file written

      const { loadConfig } = await import('../src/config/index.js');

      expect(() => loadConfig(tmpDir)).toThrow(/sawyer-docs.config.json not found/);
    });

    it('throws clear error when sawyer-docs.config.json has invalid JSON', async () => {
      writeFileSync(join(tmpDir, 'sawyer-docs.config.json'), '{ invalid json }');

      const { loadConfig } = await import('../src/config/index.js');

      expect(() => loadConfig(tmpDir)).toThrow(/invalid JSON/);
    });
  });

  describe('Schema exports', () => {
    it('exports SUPPORTED_LANGS constant', async () => {
      const { SUPPORTED_LANGS } = await import('../src/config/index.js');
      expect(SUPPORTED_LANGS).toEqual(['de', 'en', 'nl', 'tr', 'uk']);
    });

    it('exports ConfigSchema', async () => {
      const { ConfigSchema } = await import('../src/config/index.js');
      expect(ConfigSchema).toBeDefined();
      expect(typeof ConfigSchema.safeParse).toBe('function');
    });
  });
});
