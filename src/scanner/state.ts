import * as fs from 'node:fs';
import * as path from 'node:path';
import { ScanStateSchema, FeatureMapSchema } from './schema.js';
import type { ScanState, FeatureMap } from './schema.js';

export const SAWYER_DOCS_DIR = '.sawyer-docs';

function getSawyerDocsPath(basePath: string): string {
  return path.join(basePath, SAWYER_DOCS_DIR);
}

export function readScanState(basePath: string): ScanState {
  const stateFilePath = path.join(getSawyerDocsPath(basePath), 'scan-state.json');

  if (!fs.existsSync(stateFilePath)) {
    return {};
  }

  const raw = fs.readFileSync(stateFilePath, 'utf-8');
  const parsed = JSON.parse(raw);
  const result = ScanStateSchema.safeParse(parsed);

  if (!result.success) {
    return {};
  }

  return result.data;
}

export function writeScanState(basePath: string, state: ScanState): void {
  const sawyerDocsPath = getSawyerDocsPath(basePath);
  fs.mkdirSync(sawyerDocsPath, { recursive: true });

  const stateFilePath = path.join(sawyerDocsPath, 'scan-state.json');
  fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2), 'utf-8');
}

export function readFeatureMap(basePath: string): FeatureMap | null {
  const featureMapPath = path.join(getSawyerDocsPath(basePath), 'feature-map.json');

  if (!fs.existsSync(featureMapPath)) {
    return null;
  }

  const raw = fs.readFileSync(featureMapPath, 'utf-8');
  const parsed = JSON.parse(raw);
  const result = FeatureMapSchema.safeParse(parsed);

  if (!result.success) {
    return null;
  }

  return result.data;
}

export function writeFeatureMap(basePath: string, map: FeatureMap): void {
  const sawyerDocsPath = getSawyerDocsPath(basePath);
  fs.mkdirSync(sawyerDocsPath, { recursive: true });

  const featureMapPath = path.join(sawyerDocsPath, 'feature-map.json');
  fs.writeFileSync(featureMapPath, JSON.stringify(map, null, 2), 'utf-8');
}
