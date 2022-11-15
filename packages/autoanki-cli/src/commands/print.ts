import type { CommandModule } from 'yargs';

import type {
  AutoankiNote,
  SourcePlugin,
  TransformerPlugin,
} from '@autoanki/core';
import { getPluginName } from '@autoanki/core';

import { extractAnkiNotesFromFiles } from '../utils/index.js';

interface Args {
  inputs: string[];
}

function isPlugin(value: any): value is SourcePlugin | TransformerPlugin {
  if (value && value.name) {
    const v = value as SourcePlugin & TransformerPlugin;
    return !!(v.parseFromInput || v.writeBackToInput || v.transform);
  }
  return false;
}

function isAutoankiMediaFile(
  value: any
): value is AutoankiNote['mediaFiles'][number] {
  return value && value.fromPlugin && isPlugin(value.fromPlugin);
}

function replacer(key: string, value: any): any {
  if (isAutoankiMediaFile(value)) {
    return {
      fromPlugin: getPluginName(value.fromPlugin),
      media: {
        filename: value.media.filename,
        content: '[Media content not shown...]',
      },
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
