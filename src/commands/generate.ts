import { Command } from 'commander';
import { loadConfig } from '../config/index.js';
import { readFeatureMap } from '../scanner/index.js';
import { runGeneration, writeArticle } from '../generator/index.js';
import { createLogger } from '../ui/logger.js';

export const generateCommand = new Command('generate')
  .description('Generate support articles from codebase scan')
  .option('--features <slugs>', 'Comma-separated feature slugs to generate')
  .option('--dry-run', 'Preview what would be generated without making API calls')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const logger = createLogger(false, false);
      const cwd = process.cwd();

      const featureMap = readFeatureMap(cwd);
      if (!featureMap) {
        logger.error('No feature map found. Run "sawyer-docs scan" first.');
        process.exit(1);
      }

      let features = featureMap.features;

      if (options.features) {
        const slugSet = new Set(
          (options.features as string).split(',').map((s: string) => s.trim()),
        );
        features = features.filter((f) => slugSet.has(f.slug));
        if (features.length === 0) {
          logger.warn('No matching features found for the provided slugs.');
          process.exit(0);
        }
      }

      logger.info(`Generating articles for ${features.length} feature(s)...`);

      if (options.dryRun) {
        for (const feature of features) {
          logger.info(`  ${feature.name} (${feature.slug}) — ${feature.featureArea}`);
        }
        logger.success('Dry run complete — no articles generated.');
        return;
      }

      let generated = 0;
      let failed = 0;

      for (let i = 0; i < features.length; i++) {
        const feature = features[i]!;
        const spinner = logger.spinner(
          `Generating: ${feature.name} (${i + 1}/${features.length})...`,
        );
        try {
          const content = await runGeneration(feature, config.model);
          const relPath = writeArticle(cwd, feature, content);
          spinner.succeed(`Generated: ${relPath}`);
          generated++;
        } catch (err) {
          spinner.fail(`Failed: ${feature.name} — ${(err as Error).message}`);
          failed++;
        }
      }

      logger.success(`Generation complete: ${generated} generated, ${failed} failed.`);
      if (failed > 0) {
        process.exit(1);
      }
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });
