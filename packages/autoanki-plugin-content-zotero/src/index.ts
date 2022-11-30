import { VFile } from 'vfile';
import { unified } from 'unified';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { Root, Element } from 'hast';
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
import { MEDIA_URL_DATA_ATTRIBUTES } from '@autoanki/utils/plugins/media.js';

import { handleApiWithPath } from './router.js';

const URL_PROTOCOL = 'autoanki-zotero:';

interface RehypePluginOptions {
  coreApi: AutoankiPluginApi;
}

async function attemptToResolveZoteroAttachment(
  api: AutoankiPluginApi,
  urlStr: string
): Promise<string | undefined> {
  let url: URL | undefined = undefined;
  try {
    url = new URL(urlStr);
  } catch (error) {
    if (error instanceof TypeError) {
      return;
    }
  }
  if (url === undefined || url.protocol !== URL_PROTOCOL) {
    return;
  }
  return handleApiWithPath(api, url.hostname + url.pathname);
}

const rehypePluginDataKey = 'extractor';
type RehypePluginData = {
  extractedMediaFiles: AutoankiMediaFile[];
};

function addOriginalQueryStringAndHash(node: Element, url: string): void {
  // Given a random base if it is a relative url.
  const u = new URL(url, 'http://hello');

  node.properties![MEDIA_URL_DATA_ATTRIBUTES.queryString] = u.search;
  node.properties![MEDIA_URL_DATA_ATTRIBUTES.hash] = u.hash;
}

const rehypeExtractZoteroAttachmentsAndRename: Plugin<[RehypePluginOptions]> = (
  options
) => {
  return async (tree, file) => {
    type ExtractedMedia = {
      mediaPath: string;
      mediaPathUpdater: (newPath: string) => void;
    };

    const extractedMedias: ExtractedMedia[] = [];

    visit(tree as Root, 'element', (node) => {
      if (
        node.tagName === 'object' &&
        node.properties?.data &&
        typeof node.properties.data === 'string'
      ) {
        extractedMedias.push({
          mediaPath: node.properties.data,
          mediaPathUpdater: (newPath) => {
            addOriginalQueryStringAndHash(
              node,
              node.properties!.data as string
            );
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
        const fileContentBae64 = await attemptToResolveZoteroAttachment(
          options.coreApi,
          media.mediaPath
        );
        if (fileContentBae64) {
          const autoankiMediaFile =
            await options.coreApi.media.computeAutoankiMediaFileFromRaw({
              filename: media.mediaPath,
              base64Content: fileContentBae64,
              mime: 'application/pdf',
            });
          (
            file.data[rehypePluginDataKey] as RehypePluginData
          ).extractedMediaFiles.push(autoankiMediaFile);
          media.mediaPathUpdater(autoankiMediaFile.metadata.storedFilename);
        }
      })
    );
  };
};

export class ZoteroContentPlugin implements TransformerPlugin {
  static pluginName = '@autoanki/plugin-content-zotero';

  constructor(coreApi: AutoankiPluginApi) {
    this.processor = unified()
      .use(rehypeParse, { fragment: true })
      .use(rehypeExtractZoteroAttachmentsAndRename, {
        coreApi,
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
  transformer: ZoteroContentPlugin,
} as AutoankiPlugin;
