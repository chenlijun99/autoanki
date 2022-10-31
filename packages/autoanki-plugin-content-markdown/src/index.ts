import { unified } from 'unified';

import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeFormat from 'rehype-format';
import rehypeStringify from 'rehype-stringify';

import type {
  AutoankiNote,
  AutoankiPlugin,
  MediaFile,
  TransformerPlugin,
  TransformerPluginOutput,
} from '@autoanki/core';

import katexBundledCssStr from 'katex/dist/katex.min.css';

interface Theme {
  name: string;
  css: string;
}

interface Config {
  highlight?: {
    lightTheme?: Theme;
    darkTheme?: Theme;
  };
}

export class MarkdownContentPlugin implements TransformerPlugin {
  name = '@autoanki/plugin-content-markdown';

  private unifiedPipeline = unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeHighlight)
    .use(rehypeKatex)
    .use(rehypeRaw)
    .use(rehypeFormat)
    .use(rehypeStringify);

  async getPluginMediaFiles(): Promise<MediaFile[]> {
    return [
      {
        filename: 'katex.css',
        data: katexBundledCssStr,
      },
    ] as MediaFile[];
  }

  async markdownToHtml(md: string): Promise<string> {
    return this.unifiedPipeline
      .process(md)
      .then((vfile) => vfile.value.toString());
  }

  async transform(note: AutoankiNote): Promise<TransformerPluginOutput> {
    Promise.all(
      Object.entries(note.fields).map(async ([fieldName, fieldContent]) => {
        note.fields[fieldName] = await this.markdownToHtml(fieldContent);
      })
    );
    return { transformedNote: note } as TransformerPluginOutput;
  }
}

export default {
  transformer: MarkdownContentPlugin,
} as AutoankiPlugin;
