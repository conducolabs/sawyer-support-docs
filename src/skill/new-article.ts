#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSlug, buildArticlePath } from '../paths/index.js';
import { runGeneration, writeArticle } from '../generator/index.js';
import {
  createDeepLClient,
  translateArticle,
  writeTranslatedArticle,
  parseFrontmatter,
  computeHash,
  buildTranslatedFrontmatter,
} from '../translator/index.js';
import type { Feature } from '../scanner/schema.js';
import type { Config } from '../config/index.js';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export interface FeatureArgs {
  name: string;
  app: 'mobile' | 'dashboard' | 'both';
  audience: 'end_user' | 'admin';
  area: string;
  type: string;
}

export interface WriteAndTranslateResult {
  germanPath: string;
  translatedPaths: string[];
}

// -----------------------------------------------------------------------
// Exported helper functions (for testability)
// -----------------------------------------------------------------------

/**
 * Checks if an article already exists at docs/de/{featureArea}/{slug}.md
 * relative to cwd.
 */
export function checkSlugCollision(cwd: string, featureArea: string, slug: string): boolean {
  const relPath = buildArticlePath('de', featureArea, slug);
  return existsSync(resolve(cwd, relPath));
}

/**
 * Builds a Feature object from CLI args.
 * Slug is auto-generated from name using buildSlug() for consistency
 * with scan-generated articles.
 * Description is empty — skill articles don't have scanner descriptions.
 */
export function buildFeatureFromArgs(args: FeatureArgs): Feature {
  return {
    name: args.name,
    slug: buildSlug(args.name),
    featureArea: args.area,
    sourceApp: args.app,
    audience: args.audience,
    description: '',
  };
}

/**
 * Writes the German article and translates it to all non-de languages
 * in config. Returns a summary object of written file paths.
 */
export async function writeAndTranslate(
  cwd: string,
  config: Pick<Config, 'languages' | 'deepl_api_key'>,
  featureArea: string,
  slug: string,
  germanContent: string,
): Promise<WriteAndTranslateResult> {
  // Build a minimal Feature for writeArticle (only featureArea and slug are used)
  const feature: Feature = {
    name: slug,
    slug,
    featureArea,
    sourceApp: 'mobile',
    audience: 'end_user',
    description: '',
  };

  // Write German original
  const germanPath = writeArticle(cwd, feature, germanContent);

  // Parse frontmatter and compute hash for translation gating
  const parsed = parseFrontmatter(germanContent);
  const sourceHash = computeHash(germanContent);

  // Create DeepL client once
  const client = createDeepLClient(config.deepl_api_key);

  const translatedPaths: string[] = [];
  const targetLanguages = config.languages.filter((lang) => lang !== 'de');

  for (const lang of targetLanguages) {
    const translatedBody = await translateArticle(client, parsed.body, lang);
    const translatedFrontmatter = buildTranslatedFrontmatter(parsed.title, lang, sourceHash);
    const fullTranslated = translatedFrontmatter + translatedBody;
    const writtenPath = writeTranslatedArticle(cwd, lang, featureArea, slug, fullTranslated);
    translatedPaths.push(writtenPath);
  }

  return { germanPath, translatedPaths };
}

// -----------------------------------------------------------------------
// CLI argument parser helpers
// -----------------------------------------------------------------------

function parseFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return undefined;
}

function requireFlag(args: string[], flag: string, subcommand: string): string {
  const value = parseFlag(args, flag);
  if (!value) {
    console.error(`Error: missing required flag ${flag} for ${subcommand}`);
    process.exit(1);
  }
  return value;
}

// -----------------------------------------------------------------------
// CLI main
// -----------------------------------------------------------------------

async function main(): Promise<void> {
  const { loadConfig } = await import('../config/index.js');
  const cwd = process.cwd();
  const [, , subcommand, ...args] = process.argv;

  if (!subcommand) {
    console.error('Usage: new-article.ts <check-slug|generate|write-and-translate> [options]');
    process.exit(1);
  }

  // ---
  // check-slug <slug> --area <area>
  // ---
  if (subcommand === 'check-slug') {
    const slug = args[0];
    if (!slug) {
      console.error('Usage: new-article.ts check-slug <slug> --area <area>');
      process.exit(1);
    }
    const area = requireFlag(args.slice(1), '--area', 'check-slug');
    const relPath = buildArticlePath('de', area, slug);
    const exists = checkSlugCollision(cwd, area, slug);
    console.log(JSON.stringify({ exists, path: relPath }));
    return;
  }

  // ---
  // generate --feature <name> --app <app> --audience <audience> --area <area> --type <type>
  // ---
  if (subcommand === 'generate') {
    const config = loadConfig(cwd);
    const name = requireFlag(args, '--feature', 'generate');
    const app = requireFlag(args, '--app', 'generate') as 'mobile' | 'dashboard' | 'both';
    const audience = requireFlag(args, '--audience', 'generate') as 'end_user' | 'admin';
    const area = requireFlag(args, '--area', 'generate');
    const type = requireFlag(args, '--type', 'generate');

    const feature = buildFeatureFromArgs({ name, app, audience, area, type });
    const content = await runGeneration(feature, config.model);
    process.stdout.write(content);
    return;
  }

  // ---
  // write-and-translate --slug <slug> --area <area>
  // Reads German draft from stdin.
  // ---
  if (subcommand === 'write-and-translate') {
    const config = loadConfig(cwd);
    const slug = requireFlag(args, '--slug', 'write-and-translate');
    const area = requireFlag(args, '--area', 'write-and-translate');

    // Read stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    const germanContent = Buffer.concat(chunks).toString('utf-8');

    if (!germanContent.trim()) {
      console.error('Error: no content received on stdin');
      process.exit(1);
    }

    const result = await writeAndTranslate(cwd, config, area, slug, germanContent);

    console.log(`Written files:`);
    console.log(`  German original: ${result.germanPath}`);
    for (const p of result.translatedPaths) {
      console.log(`  Translation: ${p}`);
    }
    return;
  }

  console.error(`Unknown subcommand: ${subcommand}`);
  console.error('Available: check-slug, generate, write-and-translate');
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('new-article.ts')) {
  main().catch((err: Error) => {
    console.error(err.message);
    process.exit(1);
  });
}
