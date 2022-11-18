import type { CommandModule } from 'yargs';

import type { AutoankiMediaFile } from '@autoanki/core';
import { getPluginName, isPlugin } from '@autoanki/core';

import { extractAnkiNotesFromFiles } from '../utils/index.js';

interface Args {
  inputs: string[];
}

function isAutoankiMediaFile(value: any): value is AutoankiMediaFile {
  return value && value.filename && value.base64Content;
}

function replacer(key: string, value: any): any {
  if (isAutoankiMediaFile(value)) {
    return {
      filename: value.filename,
      base64Content: '[Media content not shown...]',
      metadata: value.metadata,
    };
  }
  if (isPlugin(value)) {
    return getPluginName(value);
  }
  return value;
}

async function handler(argv: Args) {
  const notes = await extractAnkiNotesFromFiles(argv.inputs);
  for (const note of notes) {
    console.log(JSON.stringify(note, replacer, 2));
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
