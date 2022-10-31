import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { extractAutoankiNotes } from '@autoanki/core';

import { getConfig } from '../middlewares/config.js';

/**
 * From https://stackoverflow.com/a/14438954
 */
function uniqueArray<T>(arr: Array<T>): Array<T> {
  return [...new Set(arr)];
}

export async function extractAnkiNotesFromFiles(inputs: string[]) {
  return extractAutoankiNotes(getConfig()['@autoanki/core'], {
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
