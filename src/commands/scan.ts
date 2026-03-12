import { Command } from 'commander';

export const scanCommand = new Command('scan')
  .description('Scan codebases for user-facing features')
  .option('--mobile <path>', 'Override mobile repo path')
  .option('--dashboard <path>', 'Override dashboard repo path')
  .option('--platform <path>', 'Override platform repo path')
  .action(async () => {
    console.log('Scan command not yet implemented (Phase 2)');
    process.exit(0);
  });
