import { z } from 'zod';

import { ParsedNote, AutoankiNote, AutoankiMediaFile } from './notes.js';

export type SourcePluginParsingOutput = {
  note: ParsedNote;
  metadata?: unknown;
};

interface BasePlugin {
  name: string;
}

export interface SourcePlugin extends BasePlugin {
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

export interface TransformerPlugin extends BasePlugin {
  transform: (note: AutoankiNote) => Promise<TransformerPluginOutput>;
}

type Class<T> = new (...args: unknown[]) => T;

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
  source?: Class<SourcePlugin>;
  transformer?: Class<TransformerPlugin>;
}

export const autoankiPluginSchema = z
  .object({
    source: z.function().optional(),
    transformer: z.function().optional(),
  })
  .transform((obj) => obj as AutoankiPlugin);

export type PluginType = keyof Required<AutoankiPlugin>;
