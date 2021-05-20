#!/usr/bin/env node
import yargs from 'yargs/yargs';

import addCommand from './commands/add';
import dumpCommand from './commands/dump';
import syncCommand from './commands/sync';
import removeCommand from './commands/remove';
import migrateCommand from './commands/migrate';

import { initLog, initAutoAnkiService, initConfig } from './middlewares';

export interface GlobalArgs {
  verbose: boolean;
  port?: number;
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
    port: {
      description: 'Anki-connect port',
      type: 'number',
      alias: ['p'],
      required: false,
      global: true,
    },
    verbose: {
      description: 'Verbose output',
      type: 'boolean',
      alias: ['v'],
      default: false,
      global: true,
    },
  })
  .demandCommand()
  .recommendCommands()
  .help()
  .version()
  .middleware([
    (argv) => {
      initLog(argv.verbose);
    },
    initAutoAnkiService,
    initConfig,
  ]).argv;
