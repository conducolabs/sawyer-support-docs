import { query } from '@anthropic-ai/claude-agent-sdk';
import { GENERATION_SYSTEM_PROMPT, buildFeaturePrompt, buildFrontmatter } from './prompts.js';
import type { Feature } from '../scanner/index.js';

export async function runGeneration(feature: Feature, model: string): Promise<string> {
  let articleBody = '';

  for await (const message of query({
    prompt: buildFeaturePrompt(feature),
    options: {
      tools: [],
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 3,
      model,
      systemPrompt: GENERATION_SYSTEM_PROMPT,
      settings: { modelSettings: { temperature: 0 } },
    },
  })) {
    if (message.type === 'result' && message.subtype === 'success') {
      articleBody = message.result;
    }
    if (message.type === 'result' && message.subtype !== 'success') {
      const errorDetail = 'result' in message ? String(message.result) : message.subtype;
      throw new Error(`Generation failed for "${feature.name}": ${errorDetail}`);
    }
  }

  if (!articleBody) {
    throw new Error(`Generation produced empty output for ${feature.name}`);
  }

  return buildFrontmatter(feature) + articleBody;
}
