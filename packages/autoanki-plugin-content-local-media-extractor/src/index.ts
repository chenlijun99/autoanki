import path from 'node:path';
import fs from 'node:fs';

import { z } from 'zod';

import { VFile } from 'vfile';
import { unified } from 'unified';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { Root } from 'hast';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';

import type {
  AutoankiNote,
  AutoankiPlugin,
  TransformerPlugin,
  TransformerPluginOutput,
  AutoankiMediaFile,
  AutoankiPluginApi,
} from '@autoanki/core';

export const resolverSchema = z.union([
  z.object({
    type: z.literal('relativeTo'),
    basePath: z.string(),
  }),
  z.function().args(z.string()).returns(z.string()),
]);
export type Resolver = z.infer<typeof resolverSchema>;

export const pluginConfigSchema = z.object({
  resolvers: z.array(resolverSchema),
});
export type PluginConfig = z.infer<typeof pluginConfigSchema>;

interface RehypePluginOptions {
  coreApi: AutoankiPluginApi;
  config: PluginConfig;
}
/**
 * From https://dev.to/jdbar/the-problem-with-handling-node-js-errors-in-typescript-and-the-workaround-m64
 */
export function instanceOfNodeError<T extends new (...args: any) => Error>(
  value: unknown,
  errorType: T
): value is InstanceType<T> & NodeJS.ErrnoException {
  return value instanceof errorType;
}

async function attemptToResolveAndLoadFile(
  mediaPath: string,
  sourceFilePath: string,
  options: RehypePluginOptions
): Promise<
  | {
      success: true;
      fileContentBae64: string;
    }
  | {
      success: false;
      errorCodes: Set<string>;
    }
> {
  const isAbsolute = path.isAbsolute(mediaPath);

  const errorCodes: Set<string> = new Set();
  for (const resolver of [
    {
      type: 'relativeTo',
      basePath: path.dirname(sourceFilePath),
    } as Resolver,
  ].concat(options.config.resolvers)) {
    let resolvedPath: string;
    if (typeof resolver === 'function') {
      resolvedPath = resolver(mediaPath);
    } else if (resolver.type === 'relativeTo' && !isAbsolute) {
      resolvedPath = path.join(resolver.basePath, mediaPath);
    } else {
      continue;
    }
    try {
      options.coreApi.logger.log(`Attempting to access ${resolvedPath}...`);
      const buffer = await fs.promises.readFile(resolvedPath);
      return {
        success: true,
        fileContentBae64: buffer.toString('base64'),
      };
    } catch (error) {
      if (instanceOfNodeError(error, Error) && error.code) {
        errorCodes.add(error.code);
      } else {
        throw error;
      }
    }
  }
  return {
    success: false,
    errorCodes,
  };
}

const rehypePluginDataKey = 'extractor';
type RehypePluginData = {
  extractedMediaFiles: AutoankiMediaFile[];
};

const rehypeExtractMediaFilesAndRename: Plugin<[RehypePluginOptions]> = (
  options
) => {
  const logger = options.coreApi.logger;

  return async (tree, file) => {
    type ExtractedMedia = {
      mediaPath: string;
      mediaPathUpdater: (newPath: string) => void;
    };
    const extractedMedias: ExtractedMedia[] = [];
    visit(tree as Root, 'element', (node) => {
      if (
        ['img', 'audio', 'video'].includes(node.tagName) &&
        node.properties?.src &&
        typeof node.properties.src === 'string'
      ) {
        logger.log(
          `Extracting ${node.properties.src} from ${node.tagName} tag`
        );
        extractedMedias.push({
          mediaPath: node.properties!.src,
          mediaPathUpdater: (newPath) => {
            node.properties!.src = newPath;
          },
        });
      }
      if (
        node.tagName === 'object' &&
        node.properties?.data &&
        typeof node.properties.data === 'string'
      ) {
        logger.log(
          `Extracting ${node.properties.data} from ${node.tagName} tag`
        );
        extractedMedias.push({
          mediaPath: node.properties!.data,
          mediaPathUpdater: (newPath) => {
            node.properties!.data = newPath;
          },
        });
      }
    });

    (file.data[rehypePluginDataKey] as RehypePluginData) = {
      extractedMediaFiles: [],
    };
    await Promise.all(
      extractedMedias.map(async (media) => {
        const result = await attemptToResolveAndLoadFile(
          media.mediaPath,
          file.path,
          options
        );
        if (result.success) {
          const autoankiMediaFile =
            await options.coreApi.media.computeAutoankiMediaFileFromRaw({
              filename: media.mediaPath,
              base64Content: result.fileContentBae64,
            });
          (
            file.data[rehypePluginDataKey] as RehypePluginData
          ).extractedMediaFiles.push(autoankiMediaFile);
          media.mediaPathUpdater(autoankiMediaFile.metadata.storedFilename);
        } else {
          let reasons: string[] = [];
          if (result.errorCodes.size === 1 && result.errorCodes.has('ENOENT')) {
            reasons.push('Not found');
          } else if (result.errorCodes.size > 0) {
            if (result.errorCodes.has('EISDIR')) {
              reasons.push('Found but it is a directory');
            }
            if (result.errorCodes.has('EACCES')) {
              reasons.push('Access denied');
            }
          }
          if (reasons.length === 0) {
            reasons.push('Unknown');
          }

          options.coreApi.logger.warn(
            `Unable to resolve media file ${media.mediaPath}: ${reasons.join(
              ', '
            )}`
          );
        }
      })
    );
  };
};

const DEFAULT_CONFIG: PluginConfig = {
  resolvers: [],
};

export class LocalMediaExtractorContentPlugin implements TransformerPlugin {
  static pluginName = '@autoanki/plugin-content-local-media-extractor';

  constructor(
    private coreApi: AutoankiPluginApi,
    config?: Partial<PluginConfig>
  ) {
    this.processor = unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeExtractMediaFilesAndRename, {
        coreApi,
        config: config
          ? { ...DEFAULT_CONFIG, ...pluginConfigSchema.partial().parse(config) }
          : DEFAULT_CONFIG,
      })
      .use(rehypeStringify);
  }

  private processor;

  async transform(note: AutoankiNote): Promise<TransformerPluginOutput> {
    const mediaFilesPerField = await Promise.all(
      Object.entries(note.fields).map(async ([fieldName, fieldContent]) => {
        const file = new VFile({
          path: note.autoanki.metadata.input.key,
          value: fieldContent,
        });
        const vfile = await this.processor.process(file);
        const data = file.data[rehypePluginDataKey] as RehypePluginData;
        if (data.extractedMediaFiles.length > 0) {
          note.fields[fieldName] = vfile.value.toString();
        }
        return data.extractedMediaFiles;
      })
    );
    return {
      transformedNote: note,
      mediaFiles: mediaFilesPerField.flat(),
    } as TransformerPluginOutput;
  }
}

export default {
  transformer: LocalMediaExtractorContentPlugin,
} as AutoankiPlugin;
