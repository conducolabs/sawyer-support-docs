import { Command } from 'commander';
import { loadConfig } from '../config/index.js';

export const generateCommand = new Command('generate')
  .description('Generate support articles from codebase scan')
  .option('--mobile <path>', 'Override mobile repo path')
  .option('--dashboard <path>', 'Override dashboard repo path')
  .option('--platform <path>', 'Override platform repo path')
  .option('--dry-run', 'Preview what would be generated without making API calls')
  .action(async (options) => {
    try {
      const _config = loadConfig();
      void options;
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
    console.log('Generate command not yet implemented (Phase 3)');
    process.exit(0);
  });
