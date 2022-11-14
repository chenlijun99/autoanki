import assert from 'node:assert/strict';

import esbuild, { BuildOptions, Plugin } from 'esbuild';
import {
  combineConfigs,
  configBase,
  configBundleWithoutNodeModules,
  configTargetSpecific,
} from '../esbuild.common.mjs';

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
        loader: 'base64',
      };
    });
  },
};

const config: BuildOptions = {
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  plugins: [loadBundledKatexCssPlugin],
  // bundle css of transfomer plugin as base64
  loader: { '.css': 'base64' },
};

esbuild
  .build(
    combineConfigs(
      configBase,
      configBundleWithoutNodeModules(['katex/dist/katex.min.css']),
      configTargetSpecific.esmLib,
      config
    )
  )
  .catch(() => process.exit(1));
