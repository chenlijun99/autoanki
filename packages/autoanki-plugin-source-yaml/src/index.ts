import yaml from 'yaml';
import { z } from 'zod';

import type {
  AutoankiPlugin,
  SourcePlugin,
  ParsedNote,
  SourcePluginParsingOutput,
  AutoankiPluginApi,
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

function yamlAnkiNoteToParsedNote(yamlNote: YamlAnkiNote): ParsedNote {
  return {
    tags: yamlNote.tags ?? [],
    id: yamlNote.id,
    fields: yamlNote.fields,
    deckName: yamlNote.deck,
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

export class YamlSourcePlugin implements SourcePlugin {
  static pluginName = '@autoanki/plugin-source-yaml';

  constructor(private coreApi: AutoankiPluginApi) {}

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
      yaml.stringify(cache.originallyArray ? cache.parsed : cache.parsed[0], {
        /*
         * Disable folded block string (which I don't like. I use literal block
         * string).
         * TODO: implement YAML stringfication with minimal changes.
         * Using something like:
         *
         * * https://github.com/eemeli/yaml/issues/308
         * * https://github.com/eemeli/yaml/pull/309
         * * https://azimi.me/2015/10/16/yawn-yaml.html
         * * https://github.com/yarnpkg/berry/issues/1463
         *   * https://github.com/paul-soporan/enhanced-yaml
         */
        lineWidth: 0,
      })
    );
  }

  async parseFromInput(
    inputKey: string,
    inputContent: ArrayBufferLike
  ): Promise<SourcePluginParsingOutput[]> {
    var enc = new TextDecoder('utf8');
    const input = enc.decode(inputContent);
    let parsedYaml;
    try {
      parsedYaml = yaml.parse(input);
    } catch (error) {
      this.coreApi.logger.warn(`Unable to parse YAML in ${inputKey}. ${error}`);
      return [];
    }

    const isParsedYamlArray = Array.isArray(parsedYaml);
    if (!isParsedYamlArray) {
      parsedYaml = [parsedYaml];
    }

    this.yamlParseCache[inputKey] = {
      parsed: [],
      originallyArray: isParsedYamlArray,
    };
    const currentInputCache = this.yamlParseCache[inputKey];

    const outputs: SourcePluginParsingOutput[] = [];
    for (const [i, yamlItem] of (parsedYaml as unknown[]).entries()) {
      if (yamlItem === null) {
        /*
         * Some inputs may generated a parsed item that is `null`.
         * E.g. a file that contains only YAML comments.
         * Filter them out.
         */
        continue;
      }
      const parseResult = yamlAnkiNoteSchema.safeParse(yamlItem);
      if (parseResult.success) {
        currentInputCache.parsed.push(parseResult.data);
        const note: ParsedNote = yamlAnkiNoteToParsedNote(parseResult.data);
        outputs.push({
          note,
          metadata: { index: i } as Metadata,
        });
      } else {
        this.coreApi.logger.warn(
          `Item ${i} in "${inputKey}" is invalid: ${parseResult.error}`
        );
      }
    }
    return outputs;
  }
}

export default {
  source: YamlSourcePlugin,
} as AutoankiPlugin;
