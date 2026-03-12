#!/usr/bin/env node
import { Command } from 'commander';
import { generateCommand } from '../commands/generate.js';
import { translateCommand } from '../commands/translate.js';
import { scanCommand } from '../commands/scan.js';

const program = new Command();

program
  .name('sawyer-docs')
  .description('Generate and translate support documentation for the sawyer ecosystem')
  .version('0.1.0')
  .option('-v, --verbose', 'Enable verbose output')
  .option('-q, --quiet', 'Suppress non-essential output')
  .option('--config <path>', 'Path to config file', 'sawyer-docs.config.json');

program.addCommand(generateCommand);
program.addCommand(translateCommand);
program.addCommand(scanCommand);

program.parse();
