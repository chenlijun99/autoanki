import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { ConfigPluginInstance } from '@autoanki/core';
import { extractAutoankiNotes } from '@autoanki/core';

import { getConfig } from '../middlewares/config.js';

/**
 * From https://stackoverflow.com/a/14438954
 */
function uniqueArray<T>(arr: Array<T>): Array<T> {
  return [...new Set(arr)];
}

export async function extractAnkiNotesFromFiles(
  inputs: string[],
  extraTansformerPlugins?: ConfigPluginInstance[]
) {
  const config = getConfig()['@autoanki/core'];
  for (const pipeline of config.pipelines) {
    pipeline.transformers = (pipeline.transformers ?? []).concat(
      extraTansformerPlugins ?? []
    );
  }
  return extractAutoankiNotes(config, {
    keys: uniqueArray(
      inputs.map((inputPath) => {
        return path.resolve(inputPath);
      })
    ),
    contentLoader: async (inputPath) => {
      const content = await readFile(inputPath);
      return content.buffer;
    },
  });
}
