import fs from 'fs/promises';
import winston from 'winston';

import type { CommandModule } from 'yargs';
import { getAutoankiService } from '../middlewares';

interface Args {
  file: string;
  deck: string;
  tags: string[];
}

async function handler(argv: Args) {
  const textFileContent = (await fs.readFile(argv.file)).toString('utf8');

  const service = getAutoankiService();
  const operation = await service.add(textFileContent, argv.deck, argv.tags);
  if (operation.actions.length === 0) {
    winston.warn('No operation was required');
    return;
  }
  const { modifiedText, successes, errors } = await operation.execute();
  winston.info(`${successes.length} notes added`);
  if (errors.length > 0) {
    winston.error(`Failed to add ${errors.length} notes`);
  }
  await fs.writeFile(argv.file, modifiedText);
}

const command: CommandModule<{}, Args> = {
  command: 'add <file>',
  describe: 'Add all notes in the given markdown file from Anki',
  handler,
  builder: (yargs) => {
    return yargs
      .positional('file', {
        type: 'string',
        demandOption: true,
      })
      .options({
        deck: {
          description: 'The deck to be used',
          type: 'string',
          alias: ['d'],
          required: true,
          default: 'Autoanki Default',
        },
        tags: {
          description: 'The tags to be added',
          type: 'string',
          alias: ['t'],
          array: true,
          required: true,
          default: ['autoanki'],
        },
      });
  },
};

export default command;
