import winston from 'winston';
import type { CommandModule } from 'yargs';

function handler() {
  winston.info('Syncing...');
}

const command: CommandModule = {
  command: 'sync <file>',
  describe: 'mmm',
  handler,
  builder: (yargs) => {
    return yargs
      .positional('file', {
        type: 'string',
      })
      .options({
        deck: {
          description: 'The deck to be used',
          type: 'string',
          alias: ['d'],
          default: 'Autoanki Default',
        },
        lastVersion: {
          description: `The last version of the same file.  If provided, a diff is performed and notes are appropriately removed from Anki decks`,
          type: 'string',
          alias: ['l', 'last-version'],
        },
      });
  },
};

export default command;
