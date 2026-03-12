import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { buildArticlePath } from '../paths/index.js';
import type { Feature } from '../scanner/index.js';

export function writeArticle(cwd: string, feature: Feature, content: string): string {
  const relativePath = buildArticlePath('de', feature.featureArea, feature.slug);
  const absolutePath = resolve(cwd, relativePath);

  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, 'utf-8');

  return relativePath;
}
