import yaml from 'yaml';
import { z } from 'zod';

import type {
  AutoankiPlugin,
  SourcePlugin,
  ParsedNote,
  SourcePluginParsingOutput,
} from '@autoanki/core';

interface Metadata {
  /**
   * The index of the current note in the deserialized YAML array.
   * Will be 0 if the original YAML input was a single item and not an array.
   */
  index: number;
}

const yamlAnkiNoteSchema = z
  .object({
    id: z.string().optional(),
    deleted: z.boolean().optional(),
    deck: z.string().optional(),
    note_type: z.string(),
    fields: z.record(z.string().min(1), z.string()),
    tags: z.string().array().optional(),
  })
  .strict();

type YamlAnkiNote = z.infer<typeof yamlAnkiNoteSchema>;

function yamlAnkiNoteToParsedNote(
  yamlNote: YamlAnkiNote,
  defaultDeck: string
): ParsedNote {
  return {
    tags: yamlNote.tags ?? [],
    id: yamlNote.id,
    fields: yamlNote.fields,
    deckName: yamlNote.deck ?? defaultDeck,
    modelName: yamlNote.note_type,
    deleted: yamlNote.deleted,
  };
}
function parsedNoteToYamlAnkiNote(parsedNote: ParsedNote): YamlAnkiNote {
  return {
    id: parsedNote.id,
    fields: parsedNote.fields,
    note_type: parsedNote.modelName,
    deck: parsedNote.deckName,
    tags: parsedNote.tags,
    deleted: parsedNote.deleted,
  };
}

const pluginConfigSchema = z
  .object({
    defaultDeck: z.string().default('Default'),
  })
  .strict();

type PluginConfig = z.infer<typeof pluginConfigSchema>;

export class YamlSourcePlugin implements SourcePlugin {
  name = '@autoanki/plugin-source-yaml';

  constructor(inputConfig?: unknown) {
    if (inputConfig) {
      this.config = pluginConfigSchema.parse(inputConfig);
    }
  }

  private config: PluginConfig = {
    defaultDeck: 'Default',
  };

  private yamlParseCache: Record<
    string,
    {
      /**
       * Whether the YAML input was an array
       */
      originallyArray: boolean;
      parsed: YamlAnkiNote[];
    }
  > = {};

  async writeBackToInput(
    inputKey: string,
    originalInputContent: ArrayBufferLike,
    notes: SourcePluginParsingOutput[]
  ): Promise<ArrayBufferLike> {
    const cache = this.yamlParseCache[inputKey];
    for (const note of notes) {
      const metadata: Metadata = note.metadata! as Metadata;
      cache.parsed[metadata.index] = parsedNoteToYamlAnkiNote(note.note);
    }
    return new TextEncoder().encode(
      yaml.stringify(cache.originallyArray ? cache.parsed : cache.parsed[0])
    );
  }

  async parseFromInput(inputKey: string, inputContent: ArrayBufferLike) {
    var enc = new TextDecoder('utf8');
    const input = enc.decode(inputContent);
    let parsedYaml = yaml.parse(input);

    const isParsedYamlArray = Array.isArray(parsedYaml);
    if (!isParsedYamlArray) {
      parsedYaml = [parsedYaml];
    }

    this.yamlParseCache[inputKey] = {
      parsed: [],
      originallyArray: isParsedYamlArray,
    };
    const currentInputCache = this.yamlParseCache[inputKey];

    return (parsedYaml as any[]).map((item, i) => {
      const parsedItem = yamlAnkiNoteSchema.parse(item);
      currentInputCache.parsed.push(parsedItem);
      const note: ParsedNote = yamlAnkiNoteToParsedNote(
        parsedItem,
        this.config.defaultDeck
      );
      return {
        note,
        metadata: { index: i } as Metadata,
      } as SourcePluginParsingOutput;
    });
  }
}

export default {
  source: YamlSourcePlugin,
} as AutoankiPlugin;
