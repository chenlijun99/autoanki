import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { AutoankiNote, ConfigPluginInstance } from '@autoanki/core';
import { extractAutoankiNotes } from '@autoanki/core';
import { groupByMap } from '@autoanki/utils/array.js';

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
  const groupedByConfig = groupByMap(
    inputs,
    (input) => configManager.getFileConfig(input)['@autoanki/core']
  );
  const logger = getLogger();
  logger.logLazy((print) => {
    const str = Array.from(groupedByConfig.entries())
      .map(([config, inputsWithConfig]) => {
        return JSON.stringify(
          {
            config,
            inputs: inputsWithConfig,
          },
          undefined,
          2
        );
      })
      .join('\n');
    print(
      `Extracting Anki notes from note sources, with the following configuration groups:\n${str}`
    );
  });

  const notes = await Promise.all(
    Array.from(groupedByConfig.entries()).map(([config, files]) => {
      const pipeline = config.pipeline;
      pipeline.transformers = (pipeline.transformers ?? []).concat(
        extraTansformerPlugins ?? []
      );
      return extractAutoankiNotes(config, {
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
