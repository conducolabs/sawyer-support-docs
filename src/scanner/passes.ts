import { resolve } from 'node:path';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { SYSTEM_PROMPT, PASS1_PROMPT, PASS2_PROMPT, PASS3_PROMPT, PLATFORM_PROMPT } from './prompts.js';
import { buildSlug } from '../paths/index.js';
import { FeatureSchema } from './schema.js';
import type { Feature } from './schema.js';
import type { Logger } from '../ui/logger.js';

/**
 * JSON Schema for structured output from Pass 3 (extraction pass).
 * Hand-written per RESEARCH.md — do not derive from Zod's toJsonSchema().
 */
const featureJsonSchema = {
  type: 'object' as const,
  properties: {
    features: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          name: { type: 'string' },
          featureArea: { type: 'string' },
          sourceApp: { type: 'string', enum: ['mobile', 'dashboard', 'both'] },
          audience: { type: 'string', enum: ['end_user', 'admin'] },
          adminRoles: {
            type: 'array',
            items: { type: 'string', enum: ['club_admin', 'company_admin', 'super_admin'] },
          },
          description: { type: 'string' },
        },
        required: ['name', 'featureArea', 'description'],
      },
    },
  },
  required: ['features'],
};

/**
 * Pass 1: Discovery — identify all user-facing screens and routes.
 * Streams output to logger for real-time developer feedback.
 * Returns the full result text to feed into Pass 2.
 */
export async function runDiscoveryPass(repoPath: string, logger: Logger): Promise<string> {
  const absolutePath = resolve(repoPath);
  logger.info(`Pass 1: Discovering screens and routes in ${absolutePath}`);

  let resultText = '';

  for await (const message of query({
    prompt: PASS1_PROMPT,
    options: {
      cwd: absolutePath,
      allowedTools: ['Read', 'Grep', 'Glob'],
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 15,
      systemPrompt: SYSTEM_PROMPT,
      includePartialMessages: true,
    },
  })) {
    if (message.type === 'assistant') {
      const content = message.message?.content;
      if (content) {
        for (const block of content) {
          if (block.type === 'text' && block.text) {
            process.stdout.write(block.text);
          }
        }
      }
    }
    if (message.type === 'result' && message.subtype === 'success') {
      resultText = message.result;
    }
  }

  return resultText;
}

/**
 * Pass 2: Classification — filter user-facing vs infrastructure screens.
 * Streams output to logger. Returns filtered result text.
 */
export async function runClassificationPass(
  repoPath: string,
  pass1Result: string,
  logger: Logger,
): Promise<string> {
  const absolutePath = resolve(repoPath);
  logger.info('Pass 2: Classifying user-facing vs infrastructure screens');

  let resultText = '';

  for await (const message of query({
    prompt: PASS2_PROMPT(pass1Result),
    options: {
      cwd: absolutePath,
      allowedTools: ['Read', 'Grep', 'Glob'],
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 10,
      systemPrompt: SYSTEM_PROMPT,
      includePartialMessages: true,
    },
  })) {
    if (message.type === 'assistant') {
      const content = message.message?.content;
      if (content) {
        for (const block of content) {
          if (block.type === 'text' && block.text) {
            process.stdout.write(block.text);
          }
        }
      }
    }
    if (message.type === 'result' && message.subtype === 'success') {
      resultText = message.result;
    }
  }

  return resultText;
}

/**
 * Pass 3: Extraction — extract structured feature details.
 * Uses structured JSON output via outputFormat.
 * Returns validated Feature[] with slugs applied.
 */
export async function runExtractionPass(
  repoPath: string,
  pass2Result: string,
  repoType: 'mobile' | 'dashboard',
  logger: Logger,
): Promise<Feature[]> {
  const absolutePath = resolve(repoPath);
  logger.info(`Pass 3: Extracting structured feature details (${repoType})`);

  let structuredOutput: unknown = null;

  for await (const message of query({
    prompt: PASS3_PROMPT(pass2Result, repoType),
    options: {
      cwd: absolutePath,
      allowedTools: ['Read', 'Grep', 'Glob'],
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 15,
      systemPrompt: SYSTEM_PROMPT,
      outputFormat: {
        type: 'json_schema',
        schema: featureJsonSchema,
      },
    },
  })) {
    if (message.type === 'result' && message.subtype === 'success') {
      structuredOutput = message.structured_output ?? null;
    }
  }

  if (!structuredOutput || typeof structuredOutput !== 'object') {
    logger.warn('Pass 3: No structured output received, returning empty features');
    return [];
  }

  const rawFeatures = (structuredOutput as { features?: unknown[] }).features ?? [];
  const features: Feature[] = [];

  for (const raw of rawFeatures) {
    const enriched = {
      ...(raw as object),
      slug: buildSlug(((raw as { name?: string }).name) ?? ''),
      sourceApp: repoType === 'mobile' ? 'mobile' : 'dashboard',
      audience: repoType === 'mobile' ? 'end_user' : 'admin',
    };

    const result = FeatureSchema.safeParse(enriched);
    if (result.success) {
      features.push(result.data);
    } else {
      logger.warn(`Pass 3: Skipping invalid feature "${(raw as { name?: string }).name}": ${result.error.issues[0]?.message}`);
    }
  }

  logger.info(`Pass 3: Extracted ${features.length} features from ${repoType} repo`);
  return features;
}

/**
 * Platform pass: Extract API context as text (no feature entries generated).
 * Returns context string to be attached to related features in the merge step.
 */
export async function runPlatformPass(repoPath: string, logger: Logger): Promise<string> {
  const absolutePath = resolve(repoPath);
  logger.info(`Platform pass: Extracting API context from ${absolutePath}`);

  let resultText = '';

  for await (const message of query({
    prompt: PLATFORM_PROMPT,
    options: {
      cwd: absolutePath,
      allowedTools: ['Read', 'Grep', 'Glob'],
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 15,
      includePartialMessages: true,
    },
  })) {
    if (message.type === 'assistant') {
      const content = message.message?.content;
      if (content) {
        for (const block of content) {
          if (block.type === 'text' && block.text) {
            process.stdout.write(block.text);
          }
        }
      }
    }
    if (message.type === 'result' && message.subtype === 'success') {
      resultText = message.result;
    }
  }

  return resultText;
}
