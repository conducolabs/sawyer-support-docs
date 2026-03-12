import { join } from 'node:path';
import type { SupportedLang } from '../config/schema.js';

/**
 * Builds the canonical article path for a given language, feature area, and slug.
 *
 * Returns: docs/{lang}/{featureArea}/{slug}.md
 *
 * The caller is responsible for passing a pre-slugified value — this function
 * does NOT call buildSlug internally. Keeping the path builder pure and
 * predictable means callers explicitly control the slug format.
 *
 * The resulting path structure is the stable public API that consuming
 * applications depend on — the same featureArea and slug will always produce
 * the same path for a given language.
 *
 * @param lang - ISO 639-1 language code (de, en, nl, tr, uk)
 * @param featureArea - Feature area directory name (e.g., 'authentication', 'payments')
 * @param slug - URL-safe article slug (e.g., 'login', 'password-reset')
 * @returns Relative path string: docs/{lang}/{featureArea}/{slug}.md
 */
export function buildArticlePath(lang: SupportedLang, featureArea: string, slug: string): string {
  return join('docs', lang, featureArea, `${slug}.md`);
}
