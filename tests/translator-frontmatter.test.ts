import { describe, it, expect } from 'vitest';
import { parseFrontmatter, buildTranslatedFrontmatter } from '../src/translator/index.js';

describe('parseFrontmatter', () => {
  it('extracts title, language, and body from a German source article (no source_hash)', () => {
    const raw = `---\ntitle: "Login"\nlanguage: de\n---\n\n## Übersicht\n\nDiese Seite beschreibt den Login.`;
    const result = parseFrontmatter(raw);

    expect(result.title).toBe('Login');
    expect(result.language).toBe('de');
    expect(result.sourceHash).toBeUndefined();
    expect(result.body).toBe('## Übersicht\n\nDiese Seite beschreibt den Login.');
  });

  it('extracts title, language, sourceHash, and body from a translated article', () => {
    const raw = `---\ntitle: "Login"\nlanguage: en\nsource_hash: abc123def456\n---\n\n## Overview\n\nThis page describes the login.`;
    const result = parseFrontmatter(raw);

    expect(result.title).toBe('Login');
    expect(result.language).toBe('en');
    expect(result.sourceHash).toBe('abc123def456');
    expect(result.body).toBe('## Overview\n\nThis page describes the login.');
  });

  it('throws on content without frontmatter delimiters', () => {
    const raw = `This content has no frontmatter at all.`;
    expect(() => parseFrontmatter(raw)).toThrow();
  });
});

describe('buildTranslatedFrontmatter', () => {
  it('produces exact YAML frontmatter with title, language, and source_hash', () => {
    const result = buildTranslatedFrontmatter('Login', 'en', 'abc123');
    expect(result).toBe(`---\ntitle: "Login"\nlanguage: en\nsource_hash: abc123\n---\n\n`);
  });

  it('escapes double quotes in title', () => {
    const result = buildTranslatedFrontmatter('He said "hello"', 'en', 'hash123');
    expect(result).toContain('title: "He said \\"hello\\""');
  });

  it('round-trip: buildTranslatedFrontmatter values can be read back by parseFrontmatter', () => {
    const title = 'Password Reset';
    const lang = 'nl';
    const hash = 'deadbeefdeadbeef';
    const body = 'De inhoud van het artikel.';

    const frontmatter = buildTranslatedFrontmatter(title, lang, hash);
    const full = `${frontmatter}${body}`;
    const parsed = parseFrontmatter(full);

    expect(parsed.title).toBe(title);
    expect(parsed.language).toBe(lang);
    expect(parsed.sourceHash).toBe(hash);
    expect(parsed.body).toBe(body);
  });
});
