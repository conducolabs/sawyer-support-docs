import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

// --- Mocks for external modules ---

vi.mock('../src/paths/index.js', () => ({
  buildSlug: (input: string) => input.toLowerCase().replace(/\s+/g, '-'),
  buildArticlePath: (lang: string, area: string, slug: string) => `docs/${lang}/${area}/${slug}.md`,
}));

vi.mock('../src/generator/index.js', () => ({
  runGeneration: vi.fn(),
  writeArticle: vi.fn(),
  buildFrontmatter: vi.fn(),
}));

const mockTranslateText = vi.fn();

vi.mock('deepl-node', () => {
  class DeepLClient {
    translateText: ReturnType<typeof vi.fn>;
    constructor(_apiKey: string) {
      this.translateText = mockTranslateText;
    }
  }
  return { DeepLClient };
});

vi.mock('../src/translator/index.js', () => ({
  createDeepLClient: vi.fn(),
  translateArticle: vi.fn(),
  writeTranslatedArticle: vi.fn(),
  parseFrontmatter: vi.fn(),
  computeHash: vi.fn(),
  buildTranslatedFrontmatter: vi.fn(),
}));

import {
  checkSlugCollision,
  buildFeatureFromArgs,
  writeAndTranslate,
} from '../src/skill/new-article.js';
import * as generatorModule from '../src/generator/index.js';
import * as translatorModule from '../src/translator/index.js';
import { buildSlug } from '../src/paths/index.js';

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

let tmpDir: string;

beforeEach(() => {
  tmpDir = join(tmpdir(), `skill-new-article-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  vi.clearAllMocks();
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// -----------------------------------------------------------------------
// checkSlugCollision
// -----------------------------------------------------------------------

describe('checkSlugCollision', () => {
  it('returns true when article file already exists at docs/de/{area}/{slug}.md', () => {
    const area = 'authentication';
    const slug = 'login';
    const articleDir = resolve(tmpDir, `docs/de/${area}`);
    mkdirSync(articleDir, { recursive: true });
    writeFileSync(resolve(articleDir, `${slug}.md`), '# Article');

    const result = checkSlugCollision(tmpDir, area, slug);
    expect(result).toBe(true);
  });

  it('returns false when article file does not exist', () => {
    const result = checkSlugCollision(tmpDir, 'authentication', 'nonexistent-slug');
    expect(result).toBe(false);
  });

  it('returns false for a different slug in the same area', () => {
    const area = 'authentication';
    const articleDir = resolve(tmpDir, `docs/de/${area}`);
    mkdirSync(articleDir, { recursive: true });
    writeFileSync(resolve(articleDir, 'login.md'), '# Login');

    const result = checkSlugCollision(tmpDir, area, 'register');
    expect(result).toBe(false);
  });

  it('returns true for nested feature areas', () => {
    const area = 'finance/reports';
    const slug = 'payment-history';
    const articleDir = resolve(tmpDir, `docs/de/${area}`);
    mkdirSync(articleDir, { recursive: true });
    writeFileSync(resolve(articleDir, `${slug}.md`), '# Payment History');

    const result = checkSlugCollision(tmpDir, area, slug);
    expect(result).toBe(true);
  });
});

// -----------------------------------------------------------------------
// buildFeatureFromArgs
// -----------------------------------------------------------------------

describe('buildFeatureFromArgs', () => {
  it('builds a Feature-shaped object from provided args', () => {
    const feature = buildFeatureFromArgs({
      name: 'Login Feature',
      app: 'mobile',
      audience: 'end_user',
      area: 'authentication',
      type: 'guide',
    });

    expect(feature.name).toBe('Login Feature');
    expect(feature.featureArea).toBe('authentication');
    expect(feature.sourceApp).toBe('mobile');
    expect(feature.audience).toBe('end_user');
  });

  it('generates slug from name using buildSlug()', () => {
    const feature = buildFeatureFromArgs({
      name: 'My Feature Name',
      app: 'dashboard',
      audience: 'admin',
      area: 'payments',
      type: 'faq',
    });

    expect(feature.slug).toBe(buildSlug('My Feature Name'));
  });

  it('sets empty description (skill articles have no scanner descriptions)', () => {
    const feature = buildFeatureFromArgs({
      name: 'Test Feature',
      app: 'both',
      audience: 'end_user',
      area: 'general',
      type: 'overview',
    });

    expect(feature.description).toBe('');
  });

  it('maps app "both" to sourceApp "both"', () => {
    const feature = buildFeatureFromArgs({
      name: 'Shared Feature',
      app: 'both',
      audience: 'admin',
      area: 'general',
      type: 'guide',
    });

    expect(feature.sourceApp).toBe('both');
  });
});

// -----------------------------------------------------------------------
// writeAndTranslate
// -----------------------------------------------------------------------

describe('writeAndTranslate', () => {
  const config = {
    languages: ['de', 'en', 'nl', 'tr'] as ('de' | 'en' | 'nl' | 'tr')[],
    model: 'claude-3-5-sonnet-20241022',
    deepl_api_key: 'fake-key',
  };

  const germanContent = '---\ntitle: "Login"\nlanguage: de\n---\n\n## Übersicht\n\nLogin Inhalt.';
  const featureArea = 'authentication';
  const slug = 'login';

  const mockClient = { translateText: vi.fn() };

  beforeEach(() => {
    vi.mocked(translatorModule.createDeepLClient).mockReturnValue(mockClient as never);
    vi.mocked(translatorModule.parseFrontmatter).mockReturnValue({
      title: 'Login',
      language: 'de',
      body: '## Übersicht\n\nLogin Inhalt.',
    });
    vi.mocked(translatorModule.computeHash).mockReturnValue('abc123hash');
    vi.mocked(translatorModule.translateArticle).mockResolvedValue('Translated body');
    vi.mocked(translatorModule.buildTranslatedFrontmatter).mockReturnValue(
      '---\ntitle: "Login"\nlanguage: en\nsource_hash: abc123hash\n---\n\n',
    );
    vi.mocked(translatorModule.writeTranslatedArticle).mockReturnValue('docs/en/authentication/login.md');
    vi.mocked(generatorModule.writeArticle).mockReturnValue('docs/de/authentication/login.md');
  });

  it('writes the German article via writeArticle', async () => {
    await writeAndTranslate(tmpDir, config, featureArea, slug, germanContent);

    expect(generatorModule.writeArticle).toHaveBeenCalledOnce();
    expect(vi.mocked(generatorModule.writeArticle).mock.calls[0]![0]).toBe(tmpDir);
    expect(vi.mocked(generatorModule.writeArticle).mock.calls[0]![2]).toBe(germanContent);
  });

  it('creates DeepL client once using the api key from config', async () => {
    await writeAndTranslate(tmpDir, config, featureArea, slug, germanContent);

    expect(translatorModule.createDeepLClient).toHaveBeenCalledOnce();
    expect(translatorModule.createDeepLClient).toHaveBeenCalledWith('fake-key');
  });

  it('calls translateArticle for each non-de language in config', async () => {
    await writeAndTranslate(tmpDir, config, featureArea, slug, germanContent);

    // config has de, en, nl, tr — so 3 non-de languages
    expect(translatorModule.translateArticle).toHaveBeenCalledTimes(3);
  });

  it('calls writeTranslatedArticle for each translated language', async () => {
    await writeAndTranslate(tmpDir, config, featureArea, slug, germanContent);

    expect(translatorModule.writeTranslatedArticle).toHaveBeenCalledTimes(3);
  });

  it('skips "de" when translating', async () => {
    await writeAndTranslate(tmpDir, config, featureArea, slug, germanContent);

    const translateCalls = vi.mocked(translatorModule.translateArticle).mock.calls;
    const translatedLangs = translateCalls.map((call) => call[2]);
    expect(translatedLangs).not.toContain('de');
    expect(translatedLangs).toContain('en');
    expect(translatedLangs).toContain('nl');
    expect(translatedLangs).toContain('tr');
  });

  it('builds translated frontmatter with source hash', async () => {
    await writeAndTranslate(tmpDir, config, featureArea, slug, germanContent);

    expect(translatorModule.buildTranslatedFrontmatter).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'abc123hash',
    );
  });

  it('returns a summary with germanPath and translatedPaths', async () => {
    const result = await writeAndTranslate(tmpDir, config, featureArea, slug, germanContent);

    expect(result.germanPath).toBe('docs/de/authentication/login.md');
    expect(result.translatedPaths).toHaveLength(3);
  });
});
