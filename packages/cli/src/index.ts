#!/usr/bin/env node
import yargs from 'yargs/yargs';
import winston from 'winston';

interface Args {
  buildDirs: string[];
  outDir: string;
  verbose: boolean;
}

const argv: Args = yargs(process.argv.slice(2))
  .scriptName('autoanki')
  .command('sync', 'Synchronize markdown file with collection', {})
  .help()
  .version()
  .options({
    verbose: {
      description: 'Verbose output',
      type: 'boolean',
      alias: ['v', 'verbose'],
      default: false,
    },
  }).argv as unknown as Args;

winston.configure({
  levels: winston.config.cli.levels,
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()],
});

winston.addColors(winston.config.cli.colors);

if (argv.verbose) {
  winston.level = 'verbose';
} else {
  winston.level = 'info';
}

winston.info('Processing input');
