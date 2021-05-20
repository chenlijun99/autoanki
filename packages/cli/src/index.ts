#!/usr/bin/env node
import yargs from 'yargs/yargs';
import winston from 'winston';

import addCommand from './commands/add';
import dumpCommand from './commands/dump';
import syncCommand from './commands/sync';
import removeCommand from './commands/remove';
import migrateCommand from './commands/migrate';

interface Args {
  verbose: boolean;
}

function initLog(argv: Args) {
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
}

/* eslint-disable */
const argv = yargs(process.argv.slice(2))
  .scriptName('autoanki')
  .strict()
  .command(addCommand)
  .command(dumpCommand)
  .command(syncCommand)
  .command(removeCommand)
  .command(migrateCommand)
  .options({
    verbose: {
      description: 'Verbose output',
      type: 'boolean',
      alias: ['v'],
      default: false,
      global: true,
    },
  })
  .demandCommand()
  .help()
  .version()
  .middleware([initLog]).argv;
