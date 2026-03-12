import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { writeArticle } from '../src/generator/index.js';
import type { Feature } from '../src/scanner/index.js';

const testFeature: Feature = {
  name: 'Login',
  slug: 'login',
  featureArea: 'auth',
  sourceApp: 'mobile',
  audience: 'end_user',
  description: 'Allows users to log in to the mobile app.',
};

const nestedFeature: Feature = {
  name: 'Payment History',
  slug: 'payment-history',
  featureArea: 'finance/reports',
  sourceApp: 'dashboard',
  audience: 'admin',
  description: 'Shows payment history reports.',
};

let tmpDir: string;

beforeEach(() => {
  tmpDir = join(tmpdir(), `generator-writer-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('writeArticle', () => {
  it('writes file to docs/de/{featureArea}/{slug}.md relative to cwd', () => {
    const content = '# Login\n\nThis is the login article.';
    writeArticle(tmpDir, testFeature, content);

    const expectedPath = resolve(tmpDir, 'docs/de/auth/login.md');
    expect(existsSync(expectedPath)).toBe(true);
  });

  it('creates parent directories recursively if they do not exist', () => {
    const content = '# Login\n\nThis is the login article.';
    // The docs/de/auth/ directory does not exist yet
    expect(existsSync(resolve(tmpDir, 'docs/de/auth'))).toBe(false);

    writeArticle(tmpDir, testFeature, content);

    expect(existsSync(resolve(tmpDir, 'docs/de/auth'))).toBe(true);
  });

  it('returns the relative path string', () => {
    const content = '# Login\n\nThis is the login article.';
    const result = writeArticle(tmpDir, testFeature, content);

    expect(result).toBe('docs/de/auth/login.md');
  });

  it('written file content matches what was passed in', () => {
    const content = '---\ntitle: "Login"\nlanguage: de\n---\n\n## Übersicht\n\nDiese Seite beschreibt den Login.';
    writeArticle(tmpDir, testFeature, content);

    const written = readFileSync(resolve(tmpDir, 'docs/de/auth/login.md'), 'utf-8');
    expect(written).toBe(content);
  });

  it('creates nested feature area directories (featureArea with slashes)', () => {
    const content = '# Payment History\n\nThis is the payment history article.';
    const result = writeArticle(tmpDir, nestedFeature, content);

    const expectedPath = resolve(tmpDir, 'docs/de/finance/reports/payment-history.md');
    expect(existsSync(expectedPath)).toBe(true);
    expect(result).toBe('docs/de/finance/reports/payment-history.md');
  });
});
