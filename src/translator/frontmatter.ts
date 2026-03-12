export interface ParsedArticle {
  title: string;
  language: string;
  sourceHash?: string;
  body: string;
}

/**
 * Parses the YAML frontmatter from a markdown article.
 * Handles German source articles (title + language) and
 * translated articles (title + language + source_hash).
 *
 * @throws Error if the content does not contain valid frontmatter delimiters
 */
export function parseFrontmatter(raw: string): ParsedArticle {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
  if (!match) {
    throw new Error('Could not parse frontmatter: missing --- delimiters');
  }
  const yaml = match[1]!;
  const body = match[2]!;

  const titleMatch = yaml.match(/^title:\s*"((?:[^"\\]|\\.)*)"/m);
  const title = titleMatch ? titleMatch[1]!.replace(/\\"/g, '"') : '';
  const language = yaml.match(/^language:\s*(\S+)/m)?.[1] ?? '';
  const sourceHash = yaml.match(/^source_hash:\s*(\S+)/m)?.[1];

  return { title, language, ...(sourceHash !== undefined ? { sourceHash } : {}), body };
}

/**
 * Builds the translated article frontmatter YAML string.
 * Includes title, language, and source_hash fields.
 * Double quotes in the title are escaped.
 */
export function buildTranslatedFrontmatter(title: string, lang: string, sourceHash: string): string {
  const safeTitle = title.replace(/"/g, '\\"');
  return `---\ntitle: "${safeTitle}"\nlanguage: ${lang}\nsource_hash: ${sourceHash}\n---\n\n`;
}
