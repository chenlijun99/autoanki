import { z } from 'zod';
import {
  AutoankiMediaFile,
  AutoankiMediaFileMetadata,
  RawAutoankiMediaFile,
} from './media.js';

import { ParsedNote, AutoankiNote } from './notes.js';

export type SourcePluginParsingOutput = {
  note: ParsedNote;
  metadata?: unknown;
};

export interface SourcePlugin {
  /**
   * Given an array of newly inserted Anki notes, the plugin shall write the
   * note ids of the newly inserted notes back in the source input.
   *
   * @param inputURL the URL of the input from which the `newNotes` have been
   * parsed
   * @param inputContent original content
   * @param notes a subset of the notes returned by parseFromInput that have
   * been update d
   */
  writeBackToInput: (
    inputKey: string,
    originalInputContent: ArrayBufferLike,
    notes: SourcePluginParsingOutput[]
  ) => Promise<ArrayBufferLike>;
  /**
   * A source plugin that defines this function defers to Autoanki core
   * the task of loading the input content, which is provided via `inputContent`.
   *
   * @param inputURL the URL of the input resource
   * @param inputContent the content of the resource at `inputURL `
   */
  parseFromInput: (
    inputKey: string,
    inputContent: ArrayBufferLike
  ) => Promise<SourcePluginParsingOutput[]>;
}

export type TransformerPluginOutput = {
  transformedNote: AutoankiNote;
  metadata?: unknown;
  mediaFiles?: AutoankiMediaFile[];
  styleFiles?: AutoankiMediaFile[];
  scriptFiles?: AutoankiMediaFile[];
};

export interface TransformerPlugin {
  transform: (note: AutoankiNote) => Promise<TransformerPluginOutput>;
}

export interface AutoankiPluginApi {
  media: {
    computeAutoankiMediaFileFromRaw: (
      mediaFile: RawAutoankiMediaFile
    ) => Promise<AutoankiMediaFile>;
    computeAutoankiMediaFileFromRawSync: (
      mediaFile: RawAutoankiMediaFile
    ) => AutoankiMediaFile;
  };
}

interface PluginClass<T> {
  /**
   * Source and transformer plugins must be classed that have an constructor
   * that accept an API object from @autoanki/core, which contains a few
   * handy functions.
   */
  new (api: AutoankiPluginApi, args?: unknown): T;
  /**
   * They also must have an static name property
   */
  pluginName: string;
}

/**
 * Datatype of an Autoanki plugin.
 *
 * Plugins must default export an object of this type.
 *
 * Note that a plugin can be both a source plugin and a transformer plugin.
 * This may facilitate the development of external plugins that don't reside in
 * the autoanki monorepo.
 */
export interface AutoankiPlugin {
  source?: PluginClass<SourcePlugin>;
  transformer?: PluginClass<TransformerPlugin>;
}

export const autoankiPluginSchema = z
  .object({
    source: z.function().optional(),
    transformer: z.function().optional(),
  })
  .transform((obj) => obj as AutoankiPlugin);

export function getPluginName(plugin: SourcePlugin | TransformerPlugin) {
  return (plugin.constructor as PluginClass<typeof plugin>).pluginName;
}

export type PluginType = keyof Required<AutoankiPlugin>;
