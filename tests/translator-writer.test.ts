import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { readGermanArticle, writeTranslatedArticle } from '../src/translator/index.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = join(tmpdir(), `translator-writer-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('readGermanArticle', () => {
  it('returns file content when the German article exists', () => {
    const articleDir = resolve(tmpDir, 'docs/de/auth');
    mkdirSync(articleDir, { recursive: true });
    writeFileSync(resolve(articleDir, 'login.md'), '---\ntitle: "Login"\nlanguage: de\n---\n\n## Übersicht', 'utf-8');

    const result = readGermanArticle(tmpDir, 'auth', 'login');
    expect(result).toBe('---\ntitle: "Login"\nlanguage: de\n---\n\n## Übersicht');
  });

  it('returns null when the German article does not exist', () => {
    const result = readGermanArticle(tmpDir, 'auth', 'nonexistent-slug');
    expect(result).toBeNull();
  });
});

describe('writeTranslatedArticle', () => {
  it('writes translated file to docs/{lang}/{area}/{slug}.md', () => {
    const content = '---\ntitle: "Login"\nlanguage: en\nsource_hash: abc123\n---\n\n## Overview';
    writeTranslatedArticle(tmpDir, 'en', 'auth', 'login', content);

    const expectedPath = resolve(tmpDir, 'docs/en/auth/login.md');
    expect(existsSync(expectedPath)).toBe(true);
    expect(readFileSync(expectedPath, 'utf-8')).toBe(content);
  });

  it('creates parent directories recursively if they do not exist', () => {
    const content = '---\ntitle: "Login"\nlanguage: nl\nsource_hash: xyz789\n---\n\n## Overzicht';
    expect(existsSync(resolve(tmpDir, 'docs/nl/auth'))).toBe(false);

    writeTranslatedArticle(tmpDir, 'nl', 'auth', 'login', content);

    expect(existsSync(resolve(tmpDir, 'docs/nl/auth'))).toBe(true);
  });

  it('returns the relative path matching docs/{lang}/{area}/{slug}.md', () => {
    const content = '---\ntitle: "Login"\nlanguage: tr\nsource_hash: hash123\n---\n\nOturum Acma';
    const result = writeTranslatedArticle(tmpDir, 'tr', 'auth', 'login', content);
    expect(result).toBe('docs/tr/auth/login.md');
  });

  it('returns the relative path for nested feature areas', () => {
    const content = '---\ntitle: "Payment History"\nlanguage: uk\nsource_hash: hashxyz\n---\n\nContent';
    const result = writeTranslatedArticle(tmpDir, 'uk', 'finance/reports', 'payment-history', content);
    expect(result).toBe('docs/uk/finance/reports/payment-history.md');
    expect(existsSync(resolve(tmpDir, 'docs/uk/finance/reports/payment-history.md'))).toBe(true);
  });
});
