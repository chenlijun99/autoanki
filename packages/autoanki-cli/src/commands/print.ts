import type { CommandModule } from 'yargs';

import { extractAnkiNotesFromFiles } from '../utils/index.js';

interface Args {
  inputs: string[];
}

async function handler(argv: Args) {
  const notes = await extractAnkiNotesFromFiles(argv.inputs);
  for (const note of notes) {
    console.log(JSON.stringify(note, undefined, 2));
  }
}

const command: CommandModule<{}, Args> = {
  command: 'print <inputs...>',
  describe: 'Print all Anki notes extracted from the given source files',
  handler,
  builder: (yargs) => {
    return yargs.positional('inputs', {
      type: 'string',
      array: true,
      demandOption: true,
      describe: 'File paths or URLs',
    });
  },
};

export default command;
