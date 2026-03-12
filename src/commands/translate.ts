import { Command } from 'commander';

export const translateCommand = new Command('translate')
  .description('Translate articles to configured languages')
  .action(async () => {
    console.log('Translate command not yet implemented (Phase 4)');
    process.exit(0);
  });
