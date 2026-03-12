import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { Command } from 'commander';
import { loadConfig } from '../config/index.js';
import { SUPPORTED_LANGS } from '../config/schema.js';
import { buildArticlePath } from '../paths/index.js';
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
import { runGeneration, writeArticle } from '../generator/index.js';
import {
  checkGating,
  computeHash,
  createDeepLClient,
  formatDeepLError,
  buildTranslatedFrontmatter,
  parseFrontmatter,
  readGermanArticle,
  translateArticle,
  writeTranslatedArticle,
} from '../translator/index.js';

// ---- Pure helper functions (exported for unit testing) ----

/**
 * Derives the set of feature slugs that need regeneration based on which repos changed.
 * Features with sourceApp 'both' are included if either mobile or dashboard changed.
 */
export function deriveSlugsFromChangedRepos(
  features: Feature[],
  changedRepos: Set<string>,
): Set<string> {
  if (changedRepos.size === 0) return new Set();
  return new Set(
    features
      .filter((f) => {
        if (f.sourceApp === 'both') return changedRepos.has('mobile') || changedRepos.has('dashboard');
        return changedRepos.has(f.sourceApp);
      })
      .map((f) => f.slug),
  );
}

/**
 * Finds features that have no German article on disk.
 * Returns the set of slugs that are missing their German article.
 */
export function findMissingArticles(
  cwd: string,
  features: Feature[],
): Set<string> {
  const missing = new Set<string>();
  for (const f of features) {
    const relPath = buildArticlePath('de', f.featureArea, f.slug);
    if (!existsSync(resolve(cwd, relPath))) {
      missing.add(f.slug);
    }
  }
  return missing;
}

// ---- Run command ----

export const runCommand = new Command('run')
  .description('Run the full pipeline: scan -> generate -> translate')
  .option('--mobile <path>', 'Override mobile repo path')
  .option('--dashboard <path>', 'Override dashboard repo path')
  .option('--platform <path>', 'Override platform repo path')
  .option('--features <slugs>', 'Comma-separated feature slugs to process (intersect with detected changes)')
  .option('--languages <langs>', 'Override config languages (comma-separated, e.g., en,nl)')
  .option('--dry-run', 'Preview generate and translate stages without making generation or translation API calls')
  .option('--force', 'Force overwrite translations even if manually edited')
  .option('--verbose', 'Show detailed progress', false)
  .option('--quiet', 'Suppress non-essential output', false)
  .action(async (options: {
    mobile?: string;
    dashboard?: string;
    platform?: string;
    features?: string;
    languages?: string;
    dryRun?: boolean;
    force?: boolean;
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

    // ---- SCAN STAGE ----

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
          logger.info('No changes in mobile repo, skipping scan');
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
        const msg = (err as Error).message ?? String(err);
        const stack = (err as Error).stack ?? '';
        logger.error(`Mobile scan failed: ${msg}`);
        if (options.verbose && stack) {
          logger.error(stack);
        }
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
          logger.info('No changes in dashboard repo, skipping scan');
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
        const msg = (err as Error).message ?? String(err);
        const stack = (err as Error).stack ?? '';
        logger.error(`Dashboard scan failed: ${msg}`);
        if (options.verbose && stack) {
          logger.error(stack);
        }
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
          logger.info('No changes in platform repo, skipping scan');
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
        const msg = (err as Error).message ?? String(err);
        const stack = (err as Error).stack ?? '';
        logger.error(`Platform scan failed: ${msg}`);
        if (options.verbose && stack) {
          logger.error(stack);
        }
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
      newCount = mergedMap.features.length;
    }

    // Persist scan results
    const finalMap: FeatureMap = {
      generatedAt: mergedMap.generatedAt,
      features: mergedMap.features,
    };

    writeFeatureMap(cwd, finalMap);
    writeScanState(cwd, newState);

    // Compute changed repos (repos whose SHA changed)
    const changedRepos = new Set<string>();
    if (newState.mobile?.sha !== existingState.mobile?.sha) changedRepos.add('mobile');
    if (newState.dashboard?.sha !== existingState.dashboard?.sha) changedRepos.add('dashboard');
    if (newState.platform?.sha !== existingState.platform?.sha) changedRepos.add('platform');

    // Compute slugs to generate: from changed repos + missing articles
    let changedSlugs = deriveSlugsFromChangedRepos(finalMap.features, changedRepos);
    const missingSlugs = findMissingArticles(cwd, finalMap.features);
    for (const slug of missingSlugs) {
      changedSlugs.add(slug);
    }

    // CLI-04: Inform user about dry-run behaviour before generation starts
    if (options.dryRun) {
      logger.info(
        'Scan complete (used Claude API). Dry-run: previewing generate and translate stages...',
      );
    }

    // Change summary
    if (changedSlugs.size === 0) {
      logger.success(
        `Scan complete: ${newCount} new, ${updatedCount} updated, ${unchangedCount} unchanged — no repo changes detected and all articles exist. Nothing to do.`,
      );
      return;
    }

    logger.info(
      `Scan complete: ${newCount} new, ${updatedCount} updated, ${unchangedCount} unchanged — generating ${changedSlugs.size} article(s)...`,
    );

    // ---- GENERATE STAGE ----

    // Filter to only the features that need regeneration
    let featuresToGenerate = finalMap.features.filter((f) => changedSlugs.has(f.slug));

    // If --features flag was provided, intersect
    if (options.features) {
      const requestedSlugs = new Set(
        options.features.split(',').map((s) => s.trim()),
      );
      featuresToGenerate = featuresToGenerate.filter((f) => requestedSlugs.has(f.slug));
    }

    // Dry-run: preview generate stage
    if (options.dryRun) {
      logger.info(`Would generate ${featuresToGenerate.length} article(s):`);
      for (const feature of featuresToGenerate) {
        logger.info(`  ${feature.name} (${feature.slug}) — ${feature.featureArea}`);
      }

      // Dry-run: estimate DeepL characters for translate stage
      let targetLangs = config.languages.filter((lang) => lang !== 'de');
      if (options.languages) {
        const requestedLangs = options.languages
          .split(',')
          .map((s) => s.trim())
          .filter((s): s is (typeof SUPPORTED_LANGS)[number] =>
            (SUPPORTED_LANGS as readonly string[]).includes(s),
          );
        targetLangs = targetLangs.filter((lang) => requestedLangs.includes(lang));
      }

      let totalChars = 0;
      for (const feature of featuresToGenerate) {
        const germanContent = readGermanArticle(cwd, feature.featureArea, feature.slug);
        if (!germanContent) {
          // No existing article yet — skip char estimation
          logger.info(`Would translate: ${feature.slug} -> ${targetLangs.join(', ')} (no existing article to estimate)`);
          continue;
        }
        const parsed = parseFrontmatter(germanContent);
        const bodyLength = parsed.body.length;
        for (const lang of targetLangs) {
          logger.info(`Would translate: ${feature.slug} -> ${lang}`);
          totalChars += bodyLength;
        }
      }
      logger.info(`Estimated DeepL characters: ${totalChars}`);
      logger.success('Dry run complete — no articles generated or translated.');
      return;
    }

    // Execute generation
    const generatedSlugs = new Set<string>();
    let generateFailed = 0;

    for (let i = 0; i < featuresToGenerate.length; i++) {
      const feature = featuresToGenerate[i]!;
      const spinner = logger.spinner(
        `Generating: ${feature.name} (${i + 1}/${featuresToGenerate.length})...`,
      );
      try {
        const content = await runGeneration(feature, config.model);
        const relPath = writeArticle(cwd, feature, content);
        spinner.succeed(`Generated: ${relPath}`);
        generatedSlugs.add(feature.slug);
      } catch (err) {
        spinner.fail(`Failed: ${feature.name} — ${(err as Error).message}`);
        generateFailed++;
      }
    }

    logger.success(
      `Generation complete: ${generatedSlugs.size} generated, ${generateFailed} failed.`,
    );

    // ---- TRANSLATE STAGE ----
    // Only translate newly generated articles (not all features)

    if (generatedSlugs.size === 0) {
      logger.info('No articles generated — skipping translation.');
      if (generateFailed > 0) {
        process.exit(1);
      }
      return;
    }

    const featuresToTranslate = finalMap.features.filter((f) => generatedSlugs.has(f.slug));

    // Resolve target languages — always exclude German
    let targetLangs = config.languages.filter((lang) => lang !== 'de');

    if (options.languages) {
      const requestedLangs = options.languages
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is (typeof SUPPORTED_LANGS)[number] =>
          (SUPPORTED_LANGS as readonly string[]).includes(s),
        );
      targetLangs = targetLangs.filter((lang) => requestedLangs.includes(lang));
      if (targetLangs.length === 0) {
        logger.warn('No valid languages matched. Use one of: en, nl, tr, uk');
        if (generateFailed > 0) {
          process.exit(1);
        }
        return;
      }
    }

    const totalJobs = featuresToTranslate.length * targetLangs.length;
    const client = createDeepLClient(config.deepl_api_key);
    let translated = 0;
    let skipped = 0;
    let translationFailed = 0;
    let currentJob = 0;

    for (const feature of featuresToTranslate) {
      const germanContent = readGermanArticle(cwd, feature.featureArea, feature.slug);
      if (!germanContent) {
        logger.warn(`No German source for ${feature.slug} — skipping`);
        continue;
      }

      const parsed = parseFrontmatter(germanContent);
      const sourceHash = computeHash(germanContent);

      for (const lang of targetLangs) {
        const jobIndex = ++currentJob;
        const spinner = logger.spinner(
          `Translating: ${feature.slug} (${lang}) (${jobIndex}/${totalJobs})...`,
        );
        const targetRelPath = buildArticlePath(lang, feature.featureArea, feature.slug);
        const targetAbsPath = resolve(cwd, targetRelPath);

        const gating = checkGating(targetAbsPath, sourceHash, options.force ?? false);

        if (gating.action === 'skip') {
          spinner.succeed(`Skipped: ${feature.slug} (${lang}) — hash unchanged`);
          skipped++;
          continue;
        }

        if (gating.action === 'warn_manual_edit') {
          spinner.warn(
            `Skipped: ${feature.slug} (${lang}) — manually edited, use --force to overwrite`,
          );
          skipped++;
          continue;
        }

        try {
          const translatedBody = await translateArticle(client, parsed.body, lang);
          const fullContent =
            buildTranslatedFrontmatter(parsed.title, lang, sourceHash) + translatedBody;
          const relPath = writeTranslatedArticle(
            cwd,
            lang,
            feature.featureArea,
            feature.slug,
            fullContent,
          );
          spinner.succeed(`Translated: ${relPath}`);
          translated++;
        } catch (err) {
          spinner.fail(formatDeepLError(err, targetRelPath));
          translationFailed++;
        }
      }
    }

    logger.success(
      `Translation complete: ${translated} translated, ${skipped} skipped (hash unchanged), ${translationFailed} failed.`,
    );

    if (generateFailed > 0 || translationFailed > 0) {
      process.exit(1);
    }
  });
