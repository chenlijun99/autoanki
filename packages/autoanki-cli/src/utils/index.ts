import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { AutoankiNote, ConfigPluginInstance } from '@autoanki/core';
import { extractAutoankiNotes } from '@autoanki/core';

import { getConfig } from '../middlewares/config.js';
import { getLogger } from '../middlewares/log.js';

/**
 * From https://stackoverflow.com/a/14438954
 */
function uniqueArray<T>(arr: Array<T>): Array<T> {
  return [...new Set(arr)];
}

export async function extractAnkiNotesFromFiles(
  inputs: string[],
  extraTansformerPlugins?: ConfigPluginInstance[]
): Promise<AutoankiNote[]> {
  const configManager = getConfig();
  const groupedByConfig = configManager.getFilesGroupedByConfig(inputs);
  const logger = getLogger();
  logger.logLazy((print) => {
    print(
      `Extracting Anki notes from note sources, with the following configuration groups:\n${JSON.stringify(
        groupedByConfig,
        undefined,
        2
      )}`
    );
  });

  const notes = await Promise.all(
    groupedByConfig.map(({ files, config }) => {
      const pipeline = config['@autoanki/core'].pipeline;
      pipeline.transformers = (pipeline.transformers ?? []).concat(
        extraTansformerPlugins ?? []
      );
      return extractAutoankiNotes(config['@autoanki/core'], {
        keys: uniqueArray(
          files.map((inputPath) => {
            return path.resolve(inputPath);
          })
        ),
        contentLoader: async (inputPath) => {
          const content = await readFile(inputPath);
          return content.buffer;
        },
      });
    })
  );

  return notes.flat();
}
