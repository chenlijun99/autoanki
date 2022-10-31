import assert from 'node:assert/strict';

import esbuild, { Plugin } from 'esbuild';
import { buildLibrary } from '../esbuild.common.mjs';

/**
 * Bundled the CSS of Katex (including all the fonts) and returns the bundled
 * CSS as string.
 */
async function buildKatexCss(katexCssEntrypoint: string): Promise<string> {
  const result = esbuild.buildSync({
    entryPoints: [katexCssEntrypoint],
    logLevel: 'info',
    minify: true,
    treeShaking: true,
    bundle: true,
    loader: {
      /* Bundle katex fonts inside the css file */
      '.ttf': 'base64',
      '.woff': 'base64',
      '.woff2': 'base64',
    },
    write: false,
  });
  assert(result.errors.length === 0);
  assert(result.outputFiles.length === 1);
  return result.outputFiles[0].text;
}

const loadBundledKatexCssPlugin: Plugin = {
  name: 'bundle_katex_css',
  setup(build) {
    build.onLoad({ filter: /katex\/dist\/katex\.min\.css$/ }, async (args) => {
      return {
        contents: await buildKatexCss(args.path),
        loader: 'text',
      };
    });
  },
};

buildLibrary({
  extraPlugins: [loadBundledKatexCssPlugin],
  nodeModulesImportsAllowList: [
    'katex/dist/katex.min.css',
    'highlight.js/styles/github.css',
  ],
}).catch(() => process.exit(1));
