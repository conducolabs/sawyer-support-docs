import * as deepl from 'deepl-node';

/**
 * Maps project short language codes to DeepL TargetLanguageCodes.
 * German ('de') is never a translation target and is not included here.
 */
const DEEPL_LANG_MAP: Record<string, deepl.TargetLanguageCode> = {
  en: 'en-US',
  nl: 'nl',
  tr: 'tr',
  uk: 'uk',
};

/**
 * Creates a new DeepL API client.
 */
export function createDeepLClient(apiKey: string): deepl.DeepLClient {
  return new deepl.DeepLClient(apiKey);
}

/**
 * Translates the given text body from German to the specified target language.
 * Uses prefer_less formality (safe soft-preference for all languages) and
 * preserves Markdown formatting.
 *
 * @throws Error if the target language has no mapping in DEEPL_LANG_MAP
 */
export async function translateArticle(
  client: deepl.DeepLClient,
  body: string,
  targetLang: string,
): Promise<string> {
  const deeplTarget = DEEPL_LANG_MAP[targetLang];
  if (!deeplTarget) {
    throw new Error(`No DeepL language code mapped for: ${targetLang}`);
  }

  const result = await client.translateText(body, 'de', deeplTarget, {
    formality: 'prefer_less',
    preserveFormatting: true,
  });

  return (result as deepl.TextResult).text;
}

/**
 * Maps DeepL error instances to actionable, user-facing error messages.
 * Includes the file path for context.
 */
export function formatDeepLError(err: unknown, filePath: string): string {
  if (err instanceof deepl.AuthorizationError) {
    return `Failed: ${filePath} — Invalid DeepL API key. Check DEEPL_API_KEY in your .env file.`;
  }
  if (err instanceof deepl.QuotaExceededError) {
    return `Failed: ${filePath} — DeepL quota exceeded. Check your plan at deepl.com/account.`;
  }
  if (err instanceof deepl.TooManyRequestsError) {
    return `Failed: ${filePath} — DeepL rate limit hit after retries. Try again later.`;
  }
  return `Failed: ${filePath} — ${(err as Error).message}`;
}
