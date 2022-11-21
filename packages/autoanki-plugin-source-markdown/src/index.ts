import { unified } from 'unified';
import { Code, Root } from 'mdast';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { visit } from 'unist-util-visit';

import type {
  AutoankiPlugin,
  AutoankiPluginApi,
  SourcePlugin,
  SourcePluginParsingOutput,
} from '@autoanki/core';

import yamlPlugin from '@autoanki/plugin-source-yaml';

interface Metadata {
  index: number;
  yamlMetadata: unknown;
}

const mdProcessor = unified().use(remarkParse);
const mdStringifyProcessor = unified().use(remarkStringify);

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf8');

export class MarkdownSourcePlugin implements SourcePlugin {
  static pluginName = '@autoanki/plugin-source-markdown';

  private markdownParseCache: Record<
    string,
    { ast: Root; yamlBlocks: Code[] }
  > = {};

  private yamlPlugin;

  constructor(api: AutoankiPluginApi) {
    this.yamlPlugin = new yamlPlugin.source!(api);
  }

  async writeBackToInput(
    inputKey: string,
    originalInputContent: ArrayBufferLike,
    notes: SourcePluginParsingOutput[]
  ): Promise<ArrayBufferLike> {
    const thisFileCache = this.markdownParseCache[inputKey];
    const notesPerYamlBlock = notes.reduce((group, note) => {
      const metadata = note.metadata as Metadata;
      (group[metadata.index] = group[metadata.index] || []).push(note);
      return group;
    }, {} as Record<number, SourcePluginParsingOutput[]>);
    const modifiedMarkdownBlocks = await Promise.all(
      Object.entries(notesPerYamlBlock).map(
        async ([i, notesOfThisYamlBlock]) => {
          const ithBlock = Number.parseInt(i);
          const newContent = await this.yamlPlugin.writeBackToInput(
            `${inputKey}-${i}`,
            encoder.encode(thisFileCache.yamlBlocks[ithBlock].value),
            notesOfThisYamlBlock.map((note) => {
              return {
                note: note.note,
                metadata: (note.metadata as Metadata).yamlMetadata,
              } as SourcePluginParsingOutput;
            })
          );
          return {
            ithBlock,
            newContent,
          };
        }
      )
    );
    for (const block of modifiedMarkdownBlocks) {
      thisFileCache.yamlBlocks[block.ithBlock].value = decoder.decode(
        block.newContent
      );
    }
    return encoder.encode(mdStringifyProcessor.stringify(thisFileCache.ast));
  }

  async parseFromInput(inputKey: string, inputContent: ArrayBufferLike) {
    var enc = new TextDecoder('utf8');
    const input = enc.decode(inputContent);
    if (!this.markdownParseCache[inputKey]) {
      this.markdownParseCache[inputKey] = {
        ast: mdProcessor.parse(input),
        yamlBlocks: [],
      };

      visit(this.markdownParseCache[inputKey].ast, 'code', (node, _) => {
        if (node.lang === 'autoanki') {
          this.markdownParseCache[inputKey].yamlBlocks.push(node);
        }
      });
      const result = await Promise.all(
        this.markdownParseCache[inputKey].yamlBlocks.map((yaml, i) => {
          return this.yamlPlugin.parseFromInput(
            `${inputKey}-${i}`,
            encoder.encode(yaml.value)
          );
        })
      );
      return result.flatMap((outputs, ithYamlBlock) => {
        return outputs.map((output) => {
          return {
            note: output.note,
            metadata: {
              index: ithYamlBlock,
              yamlMetadata: output.metadata,
            } as Metadata,
          } as SourcePluginParsingOutput;
        });
      });
    }
    return [];
  }
}

export default {
  source: MarkdownSourcePlugin,
} as AutoankiPlugin;
