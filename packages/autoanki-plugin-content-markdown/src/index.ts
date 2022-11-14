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

import katexBundledBase64 from 'katex/dist/katex.min.css';
import styleBundledBase64 from './style.css';

import type {
  AutoankiNote,
  AutoankiPlugin,
  TransformerPlugin,
  TransformerPluginOutput,
  AutoankiMediaFile,
} from '@autoanki/core';

import { builtinThemes, ThemeModule } from './builtin-themes.js';

interface Theme {
  name: typeof builtinThemes[number];
}

interface Config {
  assetsBaseUrl: string;
  highlight: {
    lightTheme: Theme;
    darkTheme: Theme;
  };
}

const defaultConfig: Config = {
  assetsBaseUrl: `${import.meta.url}/../../assets/`,
  highlight: {
    lightTheme: {
      name: 'github',
    },
    darkTheme: {
      name: 'github-dark',
    },
  },
};

export class MarkdownContentPlugin implements TransformerPlugin {
  name = '@autoanki/plugin-content-markdown';

  constructor(config?: Partial<Config>) {
    const finalConfig = {
      ...defaultConfig,
      ...config,
    };
    this.loadingHighlightResourcesPromise = Promise.all([
      import(
        new URL(
          finalConfig.highlight.lightTheme.name + '-autoanki-light.js',
          finalConfig.assetsBaseUrl
        ).toString()
      ),
      import(
        new URL(
          finalConfig.highlight.darkTheme.name + '-autoanki-dark.js',
          finalConfig.assetsBaseUrl
        ).toString()
      ),
    ]).then((themeModules: ThemeModule[]) => {
      this.cssFiles.push(
        {
          filename: `highlight/light/${finalConfig.highlight.lightTheme.name}.css`,
          base64Content: themeModules[0].themeCssBase64,
        },
        {
          filename: `highlight/dark/${finalConfig.highlight.darkTheme.name}.css`,
          base64Content: themeModules[1].themeCssBase64,
        }
      );
      this.highlightResourcesLoaded = true;
    });
  }

  private unifiedPipeline = unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeHighlight)
    .use(rehypeKatex)
    .use(rehypeRaw)
    .use(rehypeFormat)
    .use(rehypeStringify, {
      entities: {
        /*
         * By default `rehype-stringify` escapes characters using hex format,
         * but whenever the note field HTML editor on Anki-desktop is opened,
         * it converts the hex format to named references.
         * This may trigger false positive detection of "final content
         * modification", but shouldn't be a problem, since @autoanki/sync
         * tries also to ignore changes that don't impact the actual content
         * (at the expense of additional processing).
         * But let's do this and make the Anki editor happy.
         *
         * Update: nope, still problematic even with this option...
         * Apparently `rehype-stringify` avoids to escape something like '>' to
         * "&gt;" when unnecessary (TIL that it is not always necessary
         * https://stackoverflow.com/questions/3567046/is-gt-ever-necessary),
         * while the Anki editor always escapes.
         *
         * Well, nothing we can do here. Let @autoanki/sync do its job.
         *
         * Still, leave this as it does no harm.
         */
        useNamedReferences: true,
      },
    });

  private loadingHighlightResourcesPromise: Promise<unknown>;

  private highlightResourcesLoaded: boolean = false;

  private cssFiles: AutoankiMediaFile[] = [
    {
      filename: 'katex.css',
      base64Content: katexBundledBase64,
    },
    {
      filename: 'style.css',
      base64Content: styleBundledBase64,
    },
  ];

  async markdownToHtml(md: string): Promise<string> {
    return this.unifiedPipeline
      .process(md)
      .then((vfile) => vfile.value.toString());
  }

  async transform(note: AutoankiNote): Promise<TransformerPluginOutput> {
    if (!this.highlightResourcesLoaded) {
      await this.loadingHighlightResourcesPromise;
    }
    await Promise.all(
      Object.entries(note.fields).map(async ([fieldName, fieldContent]) => {
        note.fields[fieldName] = await this.markdownToHtml(fieldContent);
      })
    );
    return {
      transformedNote: note,
      styleFiles: this.cssFiles,
    } as TransformerPluginOutput;
  }
}

export default {
  transformer: MarkdownContentPlugin,
} as AutoankiPlugin;
