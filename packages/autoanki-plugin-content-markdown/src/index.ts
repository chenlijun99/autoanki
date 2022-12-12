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

import { z } from 'zod';

import katexBundledBase64 from 'katex/dist/katex.min.css';
import type {
  AutoankiNote,
  AutoankiPlugin,
  TransformerPlugin,
  TransformerPluginOutput,
  AutoankiMediaFile,
  RawAutoankiMediaFile,
  AutoankiPluginApi,
} from '@autoanki/core';

import styleBundledBase64 from './style.css';

import { builtinThemes, ThemeModule } from './builtin-themes.js';

const builtinThemesSchema = z.enum(builtinThemes);

const pluginConfigThemeSchema = z
  .object({
    name: builtinThemesSchema,
  })
  .strict();

const pluginConfigSchema = z
  .object({
    assetsBaseUrl: z.string(),
    highlight: z
      .object({
        lightTheme: pluginConfigThemeSchema,
        darkTheme: pluginConfigThemeSchema,
      })
      .strict(),
  })
  .strict();

type Config = z.infer<typeof pluginConfigSchema>;

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

const rawCssFiles: RawAutoankiMediaFile[] = [
  {
    filename: 'katex.css',
    base64Content: katexBundledBase64,
  },
  {
    filename: 'style.css',
    base64Content: styleBundledBase64,
  },
];

export class MarkdownContentPlugin implements TransformerPlugin {
  static pluginName = '@autoanki/plugin-content-markdown';

  constructor(private coreApi: AutoankiPluginApi, config?: Partial<Config>) {
    let finalConfig = defaultConfig;
    if (config) {
      finalConfig = {
        ...defaultConfig,
        ...pluginConfigSchema.parse(config),
      };
    }
    this.cssFilesPromise = Promise.all([
      Promise.all(
        rawCssFiles.map((file) =>
          this.coreApi.media.computeAutoankiMediaFileFromRaw(file)
        )
      ),
      this.getHighlightMediaFile(
        finalConfig.highlight.lightTheme.name,
        'light',
        finalConfig.assetsBaseUrl
      ),
      this.getHighlightMediaFile(
        finalConfig.highlight.darkTheme.name,
        'dark',
        finalConfig.assetsBaseUrl
      ),
    ] as const).then(([predefinedFiles, lightTheme, darkTheme]) => {
      this.cssFiles = predefinedFiles.concat([lightTheme, darkTheme]);
      this.cssFilesLoaded = true;
    });
  }

  private async getHighlightMediaFile(
    themeName: string,
    themeType: 'light' | 'dark',
    baseUrl: string
  ): Promise<AutoankiMediaFile> {
    const loaded: ThemeModule = await import(
      new URL(themeName + `-autoanki-${themeType}.js`, baseUrl).toString()
    );
    return this.coreApi.media.computeAutoankiMediaFileFromRaw({
      filename: `highlight/${themeType}/${themeName}.css`,
      base64Content: loaded.themeCssBase64,
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

  private cssFilesPromise: Promise<unknown>;

  private cssFilesLoaded: boolean = false;

  private cssFiles: AutoankiMediaFile[] = [];

  async markdownToHtml(md: string): Promise<string> {
    return this.unifiedPipeline
      .process(md)
      .then((vfile) => vfile.value.toString());
  }

  async transform(note: AutoankiNote): Promise<TransformerPluginOutput> {
    if (!this.cssFilesLoaded) {
      await this.cssFilesPromise;
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
