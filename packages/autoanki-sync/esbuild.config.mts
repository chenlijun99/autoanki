import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import esbuild, { BuildOptions, Plugin } from 'esbuild';
import {
  prod,
  combineConfigs,
  configBase,
  configBundleWithoutNodeModules,
  configTargetSpecific,
} from '../esbuild.common.mjs';

/**
 * Bundled the CSS of Katex (including all the fonts) and returns the bundled
 * CSS as string.
 */
async function buildBridge(): Promise<string> {
  const result = esbuild.buildSync({
    entryPoints: ['src/anki-bridge/index.ts'],
    logLevel: 'info',
    minify: prod,
    treeShaking: true,
    bundle: true,
    outfile: 'dist/anki-bridge.js',
    target: ['es2015'],
    platform: 'browser',
  });

  assert(result.errors.length === 0);
  const content = await readFile('dist/anki-bridge.js');
  return content.toString();
}

const loadBundledBridgeScriptsAsBase64: Plugin = {
  name: 'bundle_anki_bridge',
  setup(build) {
    build.onResolve({ filter: /anki-bridge-bundled-base64\.js$/ }, (args) => {
      return {
        path: args.path,
        namespace: 'bridge',
      };
    });
    build.onLoad({ filter: /.*/, namespace: 'bridge' }, async (args) => {
      return {
        contents: await buildBridge(),
        loader: 'base64',
      };
    });
  },
};

const config: BuildOptions = {
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  plugins: [loadBundledBridgeScriptsAsBase64],
  // bundle css of transfomer plugin as base64
  loader: { '.css': 'base64' },
};

esbuild
  .build(
    combineConfigs(
      configBase,
      configBundleWithoutNodeModules(),
      configTargetSpecific.esmLib,
      config
    )
  )
  .catch(() => process.exit(1));
