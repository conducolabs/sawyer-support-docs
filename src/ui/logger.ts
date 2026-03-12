import ora from 'ora';
import pc from 'picocolors';

export interface Logger {
  spinner(text: string): ReturnType<typeof ora>;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  success(msg: string): void;
}

export function createLogger(verbose: boolean, quiet: boolean): Logger {
  return {
    spinner(text: string) {
      const s = ora({ text, isSilent: quiet });
      s.start();
      return s;
    },

    info(msg: string) {
      if (!quiet) {
        console.log(`${pc.blue('info')}  ${msg}`);
      }
    },

    warn(msg: string) {
      console.warn(`${pc.yellow('warn')}  ${msg}`);
    },

    error(msg: string) {
      console.error(`${pc.red('error')} ${msg}`);
    },

    success(msg: string) {
      if (!quiet) {
        console.log(`${pc.green('done')}  ${msg}`);
      }
      if (verbose) {
        // verbose success shows with more detail marker
        console.log(`${pc.green('✓')} ${msg}`);
      }
    },
  };
}
