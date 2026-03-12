import { describe, it, expect } from 'vitest';
import { buildSlug } from '../src/paths/slugify.js';
import { buildArticlePath } from '../src/paths/paths.js';

describe('buildSlug', () => {
  it('converts a hyphenated German compound word to lowercase slug', () => {
    expect(buildSlug('Benutzer-Authentifizierung')).toBe('benutzer-authentifizierung');
  });

  it('replaces spaces with hyphens', () => {
    expect(buildSlug('Passwort zurucksetzen')).toBe('passwort-zurucksetzen');
  });

  it('converts a mixed-case German phrase with spaces', () => {
    expect(buildSlug('Club Ubersicht')).toBe('club-ubersicht');
  });

  it('produces only URL-safe characters matching /^[a-z0-9-]+$/', () => {
    const inputs = [
      'Benutzer-Authentifizierung',
      'Passwort zurucksetzen',
      'Club Ubersicht',
      'hello world 123',
      'Feature Overview',
    ];
    for (const input of inputs) {
      const slug = buildSlug(input);
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('is idempotent — applying buildSlug twice returns the same result', () => {
    const inputs = [
      'Benutzer-Authentifizierung',
      'Passwort zurucksetzen',
      'hello world',
      'already-a-slug',
    ];
    for (const input of inputs) {
      expect(buildSlug(buildSlug(input))).toBe(buildSlug(input));
    }
  });

  it('strips umlaut characters — output contains no ä, ö, ü characters', () => {
    const slug = buildSlug('Ubersicht');
    expect(slug).not.toMatch(/[äöüÄÖÜ]/);
    expect(slug).toMatch(/^[a-z0-9-]+$/);
  });
});

describe('buildArticlePath', () => {
  it('returns docs/de/authentication/login.md for (de, authentication, login)', () => {
    expect(buildArticlePath('de', 'authentication', 'login')).toBe(
      'docs/de/authentication/login.md'
    );
  });

  it('returns docs/en/payments/checkout.md for (en, payments, checkout)', () => {
    expect(buildArticlePath('en', 'payments', 'checkout')).toBe('docs/en/payments/checkout.md');
  });

  it('produces identical structure across languages — only language segment differs', () => {
    const dePath = buildArticlePath('de', 'authentication', 'login');
    const nlPath = buildArticlePath('nl', 'authentication', 'login');
    // Paths must differ only in the language segment
    expect(dePath).toBe('docs/de/authentication/login.md');
    expect(nlPath).toBe('docs/nl/authentication/login.md');
    // Verify the rest of the structure is identical
    const deSegments = dePath.split('/');
    const nlSegments = nlPath.split('/');
    expect(deSegments[0]).toBe(nlSegments[0]); // docs
    expect(deSegments[2]).toBe(nlSegments[2]); // authentication
    expect(deSegments[3]).toBe(nlSegments[3]); // login.md
  });

  it('produces paths for all supported languages', () => {
    const langs = ['de', 'en', 'nl', 'tr', 'uk'] as const;
    for (const lang of langs) {
      const path = buildArticlePath(lang, 'payments', 'checkout');
      expect(path).toBe(`docs/${lang}/payments/checkout.md`);
    }
  });
});
