import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

describe('Project scaffold smoke tests', () => {
  it('.env.template exists and contains DEEPL_API_KEY placeholder', () => {
    const path = resolve(ROOT, '.env.template');
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('DEEPL_API_KEY');
  });

  it('.env.template contains ANTHROPIC_API_KEY placeholder', () => {
    const path = resolve(ROOT, '.env.template');
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('ANTHROPIC_API_KEY');
  });

  it('.env.template does not contain real API keys', () => {
    const path = resolve(ROOT, '.env.template');
    const content = readFileSync(path, 'utf-8');
    // Should not contain real key patterns
    expect(content).not.toMatch(/sk-ant-/);
    expect(content).not.toMatch(/DeepL-Auth-Key /);
  });

  it('.gitignore contains .env entry', () => {
    const path = resolve(ROOT, '.gitignore');
    expect(existsSync(path)).toBe(true);
    const content = readFileSync(path, 'utf-8');
    const lines = content.split('\n');
    // .env must appear as its own entry (not just a comment)
    const hasEnvEntry = lines.some(
      (line) => line.trim() === '.env' || line.trim() === '.env.local'
    );
    expect(hasEnvEntry).toBe(true);
  });

  it('sawyer-docs.config.json exists and is valid JSON', () => {
    const path = resolve(ROOT, 'sawyer-docs.config.json');
    expect(existsSync(path)).toBe(true);
    const raw = readFileSync(path, 'utf-8');
    expect(() => JSON.parse(raw)).not.toThrow();
    const config = JSON.parse(raw);
    expect(config).toHaveProperty('languages');
    expect(config).toHaveProperty('model');
    expect(config).toHaveProperty('repos');
  });

  it('package.json has "type": "module"', () => {
    const path = resolve(ROOT, 'package.json');
    const raw = readFileSync(path, 'utf-8');
    const pkg = JSON.parse(raw);
    expect(pkg.type).toBe('module');
  });
});
