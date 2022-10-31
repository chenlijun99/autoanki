#!/usr/bin/env node
import yargs from 'yargs/yargs';

import printCommand from './commands/print.js';
import syncCommand from './commands/sync/index.js';

import { initLog } from './middlewares/log.js';
import { initConfig } from './middlewares/config.js';

export interface GlobalArgs {
  verbose: boolean;
}

const argv = yargs(process.argv.slice(2))
  .scriptName('autoanki')
  .strict()
  .command(printCommand)
  .command(syncCommand)
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
  .recommendCommands()
  .help()
  .version()
  .middleware([
    (aArgv: GlobalArgs) => {
      initLog(aArgv.verbose);
    },
    initConfig,
  ]).argv;
