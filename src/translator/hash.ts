import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseFrontmatter } from './frontmatter.js';

export type GatingResult =
  | { action: 'translate' }
  | { action: 'skip'; reason: 'hash_unchanged' }
  | { action: 'warn_manual_edit' };

/**
 * Computes a SHA-256 content hash for the given string.
 * The hash is used as the source_hash frontmatter field to detect
 * when the German source article has changed since last translation.
 */
export function computeHash(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

/**
 * Determines whether a translated article should be written based on
 * the hash gating strategy:
 * - No existing file → translate
 * - force=true → translate regardless
 * - Existing file with no source_hash → translate (treat as untracked)
 * - Existing file with matching source_hash → skip (German unchanged)
 * - Existing file with different source_hash → warn_manual_edit (German changed but file may have been manually edited)
 */
export function checkGating(targetAbsPath: string, currentHash: string, force: boolean): GatingResult {
  if (!existsSync(targetAbsPath)) {
    return { action: 'translate' };
  }

  if (force) {
    return { action: 'translate' };
  }

  const existing = readFileSync(targetAbsPath, 'utf-8');

  let parsed;
  try {
    parsed = parseFrontmatter(existing);
  } catch {
    // Cannot parse frontmatter — treat as needing translation
    return { action: 'translate' };
  }

  if (!parsed.sourceHash) {
    return { action: 'translate' };
  }

  if (parsed.sourceHash === currentHash) {
    return { action: 'skip', reason: 'hash_unchanged' };
  }

  return { action: 'warn_manual_edit' };
}
