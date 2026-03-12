import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { Command } from 'commander';
import { loadConfig } from '../config/index.js';
import { createLogger } from '../ui/logger.js';
import {
  readScanState,
  writeScanState,
  readFeatureMap,
  writeFeatureMap,
  needsScan,
  runDiscoveryPass,
  runClassificationPass,
  runExtractionPass,
  runPlatformPass,
  mergeFeatureMaps,
} from '../scanner/index.js';
import type { Feature, FeatureMap, ScanState } from '../scanner/index.js';

export const scanCommand = new Command('scan')
  .description('Scan codebases for user-facing features')
  .option('--mobile <path>', 'Override mobile repo path')
  .option('--dashboard <path>', 'Override dashboard repo path')
  .option('--platform <path>', 'Override platform repo path')
  .option('--verbose', 'Show detailed scan progress', false)
  .option('--quiet', 'Suppress non-essential output', false)
  .action(async (options: {
    mobile?: string;
    dashboard?: string;
    platform?: string;
    verbose: boolean;
    quiet: boolean;
  }) => {
    const logger = createLogger(options.verbose, options.quiet);
    const cwd = process.cwd();

    // Check if Claude CLI is available before starting
    try {
      const { execSync } = await import('node:child_process');
      execSync('claude --version', { stdio: 'pipe' });
    } catch {
      logger.error(
        'Claude CLI must be installed and authenticated. Run \'claude --version\' to check, or \'claude login\' to authenticate.',
      );
      process.exit(1);
    }

    // Load config
    let config;
    try {
      config = loadConfig(cwd);
    } catch (err) {
      logger.error((err as Error).message);
      process.exit(1);
    }

    // Apply CLI path overrides
    const repoPaths = {
      mobile: options.mobile ?? config.repos.mobile,
      dashboard: options.dashboard ?? config.repos.dashboard,
      platform: options.platform ?? config.repos.platform,
    };

    // Read existing state
    const existingState = readScanState(cwd);
    const existingFeatureMap = readFeatureMap(cwd);

    // Track per-repo results
    let mobileFeatures: Feature[] = [];
    let dashboardFeatures: Feature[] = [];
    let platformContext = '';
    const newState: ScanState = { ...existingState };

    let newCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    // --- Mobile repo ---
    const mobileRepoPath = resolve(cwd, repoPaths.mobile);
    if (!existsSync(mobileRepoPath)) {
      logger.warn(`Mobile repo not found at ${mobileRepoPath}, skipping`);
    } else {
      try {
        const { needed, currentSha } = await needsScan(mobileRepoPath, existingState.mobile?.sha);
        if (!needed) {
          logger.info(`No changes in mobile repo, skipping scan`);
          // Preserve existing mobile features from the existing feature map
          if (existingFeatureMap) {
            mobileFeatures = existingFeatureMap.features.filter(
              (f) => f.sourceApp === 'mobile' || f.sourceApp === 'both',
            );
          }
        } else {
          const spinner = logger.spinner('Scanning mobile repo (Pass 1/3)...');
          try {
            const pass1 = await runDiscoveryPass(mobileRepoPath, logger);
            spinner.text = 'Classifying mobile screens (Pass 2/3)...';
            const pass2 = await runClassificationPass(mobileRepoPath, pass1, logger);
            spinner.text = 'Extracting mobile features (Pass 3/3)...';
            mobileFeatures = await runExtractionPass(mobileRepoPath, pass2, 'mobile', logger);
            spinner.succeed(`Mobile scan complete: ${mobileFeatures.length} features found`);
          } catch (err) {
            spinner.fail('Mobile scan failed');
            throw err;
          }
          newState.mobile = { sha: currentSha, scannedAt: new Date().toISOString() };
        }
      } catch (err) {
        logger.error(`Mobile scan failed: ${(err as Error).message}`);
      }
    }

    // --- Dashboard repo ---
    const dashboardRepoPath = resolve(cwd, repoPaths.dashboard);
    if (!existsSync(dashboardRepoPath)) {
      logger.warn(`Dashboard repo not found at ${dashboardRepoPath}, skipping`);
    } else {
      try {
        const { needed, currentSha } = await needsScan(dashboardRepoPath, existingState.dashboard?.sha);
        if (!needed) {
          logger.info(`No changes in dashboard repo, skipping scan`);
          if (existingFeatureMap) {
            dashboardFeatures = existingFeatureMap.features.filter(
              (f) => f.sourceApp === 'dashboard' || f.sourceApp === 'both',
            );
          }
        } else {
          const spinner = logger.spinner('Scanning dashboard repo (Pass 1/3)...');
          try {
            const pass1 = await runDiscoveryPass(dashboardRepoPath, logger);
            spinner.text = 'Classifying dashboard screens (Pass 2/3)...';
            const pass2 = await runClassificationPass(dashboardRepoPath, pass1, logger);
            spinner.text = 'Extracting dashboard features (Pass 3/3)...';
            dashboardFeatures = await runExtractionPass(dashboardRepoPath, pass2, 'dashboard', logger);
            spinner.succeed(`Dashboard scan complete: ${dashboardFeatures.length} features found`);
          } catch (err) {
            spinner.fail('Dashboard scan failed');
            throw err;
          }
          newState.dashboard = { sha: currentSha, scannedAt: new Date().toISOString() };
        }
      } catch (err) {
        logger.error(`Dashboard scan failed: ${(err as Error).message}`);
      }
    }

    // --- Platform repo ---
    const platformRepoPath = resolve(cwd, repoPaths.platform);
    if (!existsSync(platformRepoPath)) {
      logger.warn(`Platform repo not found at ${platformRepoPath}, skipping`);
    } else {
      try {
        const { needed, currentSha } = await needsScan(platformRepoPath, existingState.platform?.sha);
        if (!needed) {
          logger.info(`No changes in platform repo, skipping scan`);
        } else {
          const spinner = logger.spinner('Scanning platform API repo...');
          try {
            platformContext = await runPlatformPass(platformRepoPath, logger);
            spinner.succeed('Platform scan complete');
          } catch (err) {
            spinner.fail('Platform scan failed');
            throw err;
          }
          newState.platform = { sha: currentSha, scannedAt: new Date().toISOString() };
        }
      } catch (err) {
        logger.error(`Platform scan failed: ${(err as Error).message}`);
      }
    }

    // Merge features from all repos
    const mergedMap = mergeFeatureMaps(mobileFeatures, dashboardFeatures, platformContext);

    // Smart merge with existing feature map — track new/updated/unchanged
    if (existingFeatureMap) {
      const existingSlugs = new Map<string, Feature>(
        existingFeatureMap.features.map((f) => [f.slug, f]),
      );

      for (const feature of mergedMap.features) {
        if (!existingSlugs.has(feature.slug)) {
          newCount++;
        } else {
          const existing = existingSlugs.get(feature.slug)!;
          if (
            existing.description !== feature.description ||
            existing.sourceApp !== feature.sourceApp ||
            existing.featureArea !== feature.featureArea
          ) {
            updatedCount++;
          } else {
            unchangedCount++;
          }
        }
      }

      // Preserve features from repos that were not rescanned
      const rescannedSources = new Set<string>();
      if (newState.mobile?.sha !== existingState.mobile?.sha) rescannedSources.add('mobile');
      if (newState.dashboard?.sha !== existingState.dashboard?.sha) rescannedSources.add('dashboard');
      if (newState.platform?.sha !== existingState.platform?.sha) rescannedSources.add('platform');

      // If a source was not rescanned, preserve its existing features not already in the merged map
      if (!rescannedSources.has('mobile') || !rescannedSources.has('dashboard')) {
        const mergedSlugs = new Set(mergedMap.features.map((f) => f.slug));
        const preserved: Feature[] = [];
        for (const existing of existingFeatureMap.features) {
          if (!mergedSlugs.has(existing.slug)) {
            preserved.push(existing);
            unchangedCount++;
          }
        }
        mergedMap.features.push(...preserved);
      }
    } else {
      // First run — all features are new
      newCount = mergedMap.features.length;
    }

    // Persist results
    const finalMap: FeatureMap = {
      generatedAt: mergedMap.generatedAt,
      features: mergedMap.features,
    };

    writeFeatureMap(cwd, finalMap);
    writeScanState(cwd, newState);

    logger.success(
      `Scan complete: ${finalMap.features.length} features (${newCount} new, ${updatedCount} updated, ${unchangedCount} unchanged)`,
    );
  });
