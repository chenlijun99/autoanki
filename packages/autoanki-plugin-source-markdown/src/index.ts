import type {
  AutoankiPlugin,
  SourcePlugin,
  ExistingNote,
} from '@autoanki/core';

export class MarkdownSourcePlugin implements SourcePlugin {
  constructor(private config) {}

  async writeNewNotesIds(
    inputKey: string,
    originalInputContent: ArrayBufferLike,
    notes: SourcePluginParsingOutput[]
  ) {
    return;
  }

  async parseFromInput(inputKey: string, inputContent: ArrayBufferLike) {
    return [];
  }
}

export default {
  source: MarkdownSourcePlugin,
} as AutoankiPlugin;
