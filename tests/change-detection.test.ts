import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { getCurrentSha, getChangedFiles, needsScan } from '../src/scanner/change-detection.js';

// Use the sawyer-support-docs repo itself as a valid test git repo
const THIS_REPO = path.resolve('/Users/terhuerne/Development/sawyer-support-docs');

describe('getCurrentSha', () => {
  it('returns a trimmed SHA string for a valid git repo', async () => {
    const sha = await getCurrentSha(THIS_REPO);
    expect(sha).toBeTruthy();
    expect(typeof sha).toBe('string');
    // Git SHAs are 40-character hex strings
    expect(sha).toMatch(/^[0-9a-f]{40}$/);
  });

  it('does not have leading or trailing whitespace', async () => {
    const sha = await getCurrentSha(THIS_REPO);
    expect(sha).toBe(sha.trim());
  });

  it('throws an error when path is not a git repo', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-git-'));
    try {
      await expect(getCurrentSha(tempDir)).rejects.toThrow();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe('getChangedFiles', () => {
  it('returns empty array when stored SHA equals current SHA', async () => {
    const currentSha = await getCurrentSha(THIS_REPO);
    const changedFiles = await getChangedFiles(THIS_REPO, currentSha);
    expect(changedFiles).toEqual([]);
  });

  it('returns empty array when storedSha is empty string', async () => {
    // Empty storedSha signals a full scan is needed; getChangedFiles returns empty
    // (caller handles full scan logic)
    const changedFiles = await getChangedFiles(THIS_REPO, '');
    expect(changedFiles).toEqual([]);
  });

  it('returns a list of changed file paths when SHAs differ', async () => {
    const currentSha = await getCurrentSha(THIS_REPO);
    // Use an older commit SHA — ba5608a is before the current HEAD
    // We need the full 40-char SHA for git diff
    const { execSync } = await import('node:child_process');
    const olderSha = execSync('git rev-parse ba5608a', { cwd: THIS_REPO }).toString().trim();

    const changedFiles = await getChangedFiles(THIS_REPO, olderSha);
    // There must be changes between an older commit and current HEAD
    expect(Array.isArray(changedFiles)).toBe(true);
    expect(changedFiles.length).toBeGreaterThan(0);
    // Each entry should be a file path string
    for (const file of changedFiles) {
      expect(typeof file).toBe('string');
      expect(file.length).toBeGreaterThan(0);
    }
  });

  it('returns file paths without empty strings', async () => {
    const { execSync } = await import('node:child_process');
    const olderSha = execSync('git rev-parse ba5608a', { cwd: THIS_REPO }).toString().trim();
    const changedFiles = await getChangedFiles(THIS_REPO, olderSha);
    for (const file of changedFiles) {
      expect(file).not.toBe('');
    }
  });
});

describe('needsScan', () => {
  it('returns needed:true when no stored SHA exists (first run)', async () => {
    const result = await needsScan(THIS_REPO, undefined);
    expect(result.needed).toBe(true);
    expect(result.currentSha).toMatch(/^[0-9a-f]{40}$/);
    expect(result.changedFiles).toEqual([]);
  });

  it('returns needed:false when stored SHA equals current HEAD', async () => {
    const currentSha = await getCurrentSha(THIS_REPO);
    const result = await needsScan(THIS_REPO, currentSha);
    expect(result.needed).toBe(false);
    expect(result.currentSha).toBe(currentSha);
  });

  it('returns needed:true when stored SHA differs from current HEAD', async () => {
    const { execSync } = await import('node:child_process');
    const olderSha = execSync('git rev-parse ba5608a', { cwd: THIS_REPO }).toString().trim();

    const result = await needsScan(THIS_REPO, olderSha);
    expect(result.needed).toBe(true);
    expect(result.changedFiles.length).toBeGreaterThan(0);
  });

  it('includes current SHA in result regardless of whether scan is needed', async () => {
    const currentSha = await getCurrentSha(THIS_REPO);

    const resultWhenCurrent = await needsScan(THIS_REPO, currentSha);
    expect(resultWhenCurrent.currentSha).toBe(currentSha);

    const resultWhenNone = await needsScan(THIS_REPO, undefined);
    expect(resultWhenNone.currentSha).toBe(currentSha);
  });
});
