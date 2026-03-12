import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { computeHash, checkGating } from '../src/translator/index.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = join(tmpdir(), `translator-hash-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('computeHash', () => {
  it('produces a 64-character hex string (SHA-256)', () => {
    const hash = computeHash('hello');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic — same input produces same hash', () => {
    expect(computeHash('hello')).toBe(computeHash('hello'));
  });

  it('produces different hashes for different inputs', () => {
    expect(computeHash('hello')).not.toBe(computeHash('world'));
  });
});

describe('checkGating', () => {
  it('returns { action: "translate" } when target file does not exist', () => {
    const nonExistentPath = resolve(tmpDir, 'docs/en/auth/login.md');
    const result = checkGating(nonExistentPath, 'anyhash', false);
    expect(result).toEqual({ action: 'translate' });
  });

  it('returns { action: "skip", reason: "hash_unchanged" } when hash matches existing file', () => {
    const hash = computeHash('German content here');
    const targetPath = resolve(tmpDir, 'existing-translated.md');
    const translatedContent = `---\ntitle: "Login"\nlanguage: en\nsource_hash: ${hash}\n---\n\nTranslated body.`;
    writeFileSync(targetPath, translatedContent, 'utf-8');

    const result = checkGating(targetPath, hash, false);
    expect(result).toEqual({ action: 'skip', reason: 'hash_unchanged' });
  });

  it('returns { action: "warn_manual_edit" } when hash differs (source changed, file manually edited)', () => {
    const oldHash = computeHash('Old German content');
    const newHash = computeHash('New German content');
    const targetPath = resolve(tmpDir, 'manually-edited.md');
    const translatedContent = `---\ntitle: "Login"\nlanguage: en\nsource_hash: ${oldHash}\n---\n\nManually edited translation.`;
    writeFileSync(targetPath, translatedContent, 'utf-8');

    const result = checkGating(targetPath, newHash, false);
    expect(result).toEqual({ action: 'warn_manual_edit' });
  });

  it('returns { action: "translate" } when force=true, ignoring existing file', () => {
    const hash = computeHash('German content');
    const targetPath = resolve(tmpDir, 'force-overwrite.md');
    const translatedContent = `---\ntitle: "Login"\nlanguage: en\nsource_hash: ${hash}\n---\n\nExisting translation.`;
    writeFileSync(targetPath, translatedContent, 'utf-8');

    // Even though hash matches, force=true means translate
    const result = checkGating(targetPath, hash, true);
    expect(result).toEqual({ action: 'translate' });
  });

  it('returns { action: "translate" } when existing file has no source_hash field', () => {
    const targetPath = resolve(tmpDir, 'no-hash.md');
    const noHashContent = `---\ntitle: "Login"\nlanguage: en\n---\n\nExisting translation without hash.`;
    writeFileSync(targetPath, noHashContent, 'utf-8');

    const result = checkGating(targetPath, 'anyhash', false);
    expect(result).toEqual({ action: 'translate' });
  });
});
