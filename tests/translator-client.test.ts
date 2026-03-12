import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock deepl-node before any imports that use it
const mockTranslateText = vi.fn();

vi.mock('deepl-node', () => {
  class AuthorizationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'AuthorizationError';
    }
  }
  class QuotaExceededError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'QuotaExceededError';
    }
  }
  class TooManyRequestsError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'TooManyRequestsError';
    }
  }
  class DeepLClient {
    translateText: ReturnType<typeof vi.fn>;
    constructor(_apiKey: string) {
      this.translateText = mockTranslateText;
    }
  }

  return {
    DeepLClient,
    AuthorizationError,
    QuotaExceededError,
    TooManyRequestsError,
  };
});

import { translateArticle, formatDeepLError } from '../src/translator/index.js';
import * as deepl from 'deepl-node';

describe('translateArticle', () => {
  beforeEach(() => {
    mockTranslateText.mockReset();
    mockTranslateText.mockResolvedValue({ text: 'Translated text' });
  });

  it('calls translateText with sourceLang "de", formality "prefer_less", and preserveFormatting true', async () => {
    const client = new deepl.DeepLClient('fake-key');
    await translateArticle(client, 'German text', 'en');

    expect(mockTranslateText).toHaveBeenCalledWith(
      'German text',
      'de',
      expect.any(String),
      expect.objectContaining({
        formality: 'prefer_less',
        preserveFormatting: true,
      }),
    );
  });

  it('maps "en" to "en-US" target language', async () => {
    const client = new deepl.DeepLClient('fake-key');
    await translateArticle(client, 'body', 'en');
    expect(mockTranslateText).toHaveBeenCalledWith('body', 'de', 'en-US', expect.any(Object));
  });

  it('maps "nl" to "nl" target language', async () => {
    const client = new deepl.DeepLClient('fake-key');
    await translateArticle(client, 'body', 'nl');
    expect(mockTranslateText).toHaveBeenCalledWith('body', 'de', 'nl', expect.any(Object));
  });

  it('maps "tr" to "tr" target language', async () => {
    const client = new deepl.DeepLClient('fake-key');
    await translateArticle(client, 'body', 'tr');
    expect(mockTranslateText).toHaveBeenCalledWith('body', 'de', 'tr', expect.any(Object));
  });

  it('maps "uk" to "uk" target language', async () => {
    const client = new deepl.DeepLClient('fake-key');
    await translateArticle(client, 'body', 'uk');
    expect(mockTranslateText).toHaveBeenCalledWith('body', 'de', 'uk', expect.any(Object));
  });

  it('returns result.text from translateText', async () => {
    mockTranslateText.mockResolvedValue({ text: 'Translated result' });
    const client = new deepl.DeepLClient('fake-key');
    const result = await translateArticle(client, 'body', 'en');
    expect(result).toBe('Translated result');
  });

  it('throws for unmapped language code', async () => {
    const client = new deepl.DeepLClient('fake-key');
    await expect(translateArticle(client, 'body', 'fr')).rejects.toThrow();
  });
});

describe('formatDeepLError', () => {
  it('maps AuthorizationError to message containing "API key" and file path', () => {
    const err = new deepl.AuthorizationError('Unauthorized');
    const msg = formatDeepLError(err, 'docs/en/auth/login.md');
    expect(msg).toContain('API key');
    expect(msg).toContain('docs/en/auth/login.md');
  });

  it('maps QuotaExceededError to message containing "quota" and "deepl.com/account"', () => {
    const err = new deepl.QuotaExceededError('Quota exceeded');
    const msg = formatDeepLError(err, 'docs/en/auth/login.md');
    expect(msg.toLowerCase()).toContain('quota');
    expect(msg).toContain('deepl.com/account');
  });

  it('maps unknown error to message with error.message and file path', () => {
    const err = new Error('Something unexpected happened');
    const msg = formatDeepLError(err, 'docs/en/auth/login.md');
    expect(msg).toContain('Something unexpected happened');
    expect(msg).toContain('docs/en/auth/login.md');
  });
});
