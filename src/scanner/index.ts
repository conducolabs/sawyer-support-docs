export {
  AdminRoleSchema,
  FeatureSchema,
  FeatureMapSchema,
  ScanStateSchema,
} from './schema.js';
export type { AdminRole, Feature, FeatureMap, ScanState } from './schema.js';

export {
  SAWYER_DOCS_DIR,
  readScanState,
  writeScanState,
  readFeatureMap,
  writeFeatureMap,
} from './state.js';

export { getCurrentSha, getChangedFiles, needsScan } from './change-detection.js';

export {
  runDiscoveryPass,
  runClassificationPass,
  runExtractionPass,
  runPlatformPass,
} from './passes.js';

export { mergeFeatureMaps } from './merge.js';

export {
  SYSTEM_PROMPT,
  PASS1_PROMPT,
  PASS2_PROMPT,
  PASS3_PROMPT,
  PLATFORM_PROMPT,
} from './prompts.js';
