import slugify from '@sindresorhus/slugify';

/**
 * Converts any string input to a deterministic, URL-safe ASCII slug.
 *
 * German umlauts are transliterated to their ASCII equivalents by the
 * underlying slugify library (e.g., ü → ue, ö → oe, ä → ae).
 *
 * This function is the stable public contract — same input always produces
 * the same output across runs, making slugs safe to use as file system paths
 * that consuming applications depend on.
 *
 * @param input - Any string, including German feature names with umlauts or spaces
 * @returns A lowercase, hyphen-separated, URL-safe ASCII string
 */
export function buildSlug(input: string): string {
  return slugify(input, { separator: '-', lowercase: true });
}
