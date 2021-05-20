import fs from 'fs';

import type { CommandModule } from 'yargs';
import { getAutoankiService } from '../middlewares';

interface Args {
  file: string;
  deck: string;
  tags: string[];
}

async function handler(argv: Args) {
  const textFileContent = fs.readFileSync(argv.file).toString('utf8');

  const service = getAutoankiService();
  const operation = await service.add(textFileContent, argv.deck);
  return operation.execute();
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
