import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { buildArticlePath } from '../paths/index.js';
import type { SupportedLang } from '../config/schema.js';

/**
 * Reads the German source article for the given feature area and slug.
 * Returns the raw file content, or null if the file does not exist.
 */
export function readGermanArticle(cwd: string, featureArea: string, slug: string): string | null {
  const relPath = buildArticlePath('de', featureArea, slug);
  const absPath = resolve(cwd, relPath);
  if (!existsSync(absPath)) {
    return null;
  }
  return readFileSync(absPath, 'utf-8');
}

/**
 * Writes a translated article to the per-language directory.
 * Creates parent directories recursively if they do not exist.
 * Returns the relative path of the written file.
 */
export function writeTranslatedArticle(
  cwd: string,
  lang: SupportedLang,
  featureArea: string,
  slug: string,
  content: string,
): string {
  const relativePath = buildArticlePath(lang, featureArea, slug);
  const absolutePath = resolve(cwd, relativePath);

  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, 'utf-8');

  return relativePath;
}
