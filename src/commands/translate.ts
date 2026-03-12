import { resolve } from 'node:path';
import { Command } from 'commander';
import { loadConfig } from '../config/index.js';
import { SUPPORTED_LANGS } from '../config/schema.js';
import { buildArticlePath } from '../paths/index.js';
import { readFeatureMap } from '../scanner/index.js';
import { createLogger } from '../ui/logger.js';
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

export const translateCommand = new Command('translate')
  .description('Translate German articles to configured languages via DeepL')
  .option('--features <slugs>', 'Comma-separated feature slugs to translate')
  .option('--languages <langs>', 'Override config languages (comma-separated, e.g., en,nl)')
  .option('--dry-run', 'Show what would be translated and estimated character count')
  .option('--force', 'Overwrite translations even if manually edited')
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

      // Resolve target languages — always exclude German
      let targetLangs = config.languages.filter((lang) => lang !== 'de');

      if (options.languages) {
        const requestedLangs = (options.languages as string)
          .split(',')
          .map((s: string) => s.trim())
          .filter((s): s is (typeof SUPPORTED_LANGS)[number] =>
            (SUPPORTED_LANGS as readonly string[]).includes(s),
          );
        targetLangs = targetLangs.filter((lang) => requestedLangs.includes(lang));
        if (targetLangs.length === 0) {
          logger.warn('No valid languages matched. Use one of: en, nl, tr, uk');
          process.exit(0);
        }
      }

      // --dry-run path
      if (options.dryRun) {
        let totalChars = 0;
        for (const feature of features) {
          const germanContent = readGermanArticle(cwd, feature.featureArea, feature.slug);
          if (!germanContent) continue;
          const parsed = parseFrontmatter(germanContent);
          const bodyLength = parsed.body.length;
          for (const lang of targetLangs) {
            console.log(`Would translate: ${feature.slug} -> ${lang}`);
            totalChars += bodyLength;
          }
        }
        console.log(`Estimated DeepL characters: ${totalChars}`);
        logger.success('Dry run complete — no translations made.');
        return;
      }

      // Translation loop
      const totalJobs = features.length * targetLangs.length;
      const client = createDeepLClient(config.deepl_api_key);
      let translated = 0;
      let skipped = 0;
      let failed = 0;
      let currentJob = 0;

      for (const feature of features) {
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
            failed++;
          }
        }
      }

      logger.success(
        `Translation complete: ${translated} translated, ${skipped} skipped (hash unchanged), ${failed} failed.`,
      );
      if (failed > 0) {
        process.exit(1);
      }
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });
