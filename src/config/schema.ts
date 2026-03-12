import { z } from 'zod';

export const SUPPORTED_LANGS = ['de', 'en', 'nl', 'tr', 'uk'] as const;

export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export const ConfigSchema = z.object({
  languages: z.array(z.enum(SUPPORTED_LANGS)).default(['de', 'en', 'nl', 'tr', 'uk']),
  model: z.string().default('claude-sonnet-4-5'),
  repos: z.object({
    mobile: z.string(),
    dashboard: z.string(),
    platform: z.string(),
  }),
  deepl_api_key: z.string().min(1, 'DEEPL_API_KEY is required'),
  anthropic_api_key: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
});

export type Config = z.infer<typeof ConfigSchema>;
