#!/usr/bin/env node
import yargs from 'yargs/yargs';

import printCommand from './commands/print.js';
import syncCommand from './commands/sync/index.js';

import { initLog } from './middlewares/log.js';
import { initConfig } from './middlewares/config.js';

export interface GlobalArgs {
  verbose: boolean;
}

try {
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
    ])
    .showHelpOnFail(false)
    .fail((msg, error, aYargs) => {
      if (error === undefined) {
        /*
         * Didn't find it in the documentation. But when error is undefined
         * it meanas it was yargs who raised the error because the CLI
         * wasn't well formatted.
         * Only in that case we want to print the help.
         */
        console.info(msg);
        aYargs.showHelp();
      }
    }).argv;

  Promise.resolve(argv).catch((error) => {
    // print errors that occured inside commands
    console.error(error);
  });
} catch (error) {
  // print errors that occured in middleware execution
  console.error(error);
}
