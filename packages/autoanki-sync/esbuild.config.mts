import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

import esbuild, { BuildOptions, Plugin } from 'esbuild';
import {
  combineConfigs,
  configBase,
  configBundleWithoutNodeModules,
  configTargetSpecific,
} from '../esbuild.common.mjs';

async function buildAutoankiBridge(): Promise<string> {
  const result = esbuild.buildSync({
    entryPoints: ['src/bridge/index.ts'],
    outfile: 'dist/bridge.js',
    ...configTargetSpecific.ankiWebViewScript,
  });

  assert(result.errors.length === 0);
  const content = await readFile('dist/bridge.js');
  return content.toString();
}

export const pluginBundleAutoankiBridgeAsBase64 = {
  name: 'bundle_autoanki_bridge',
  setup(build) {
    build.onResolve({ filter: /bridge\/index\.bundled\.js$/ }, (args) => {
      return {
        path: args.path,
        namespace: 'bridge',
      };
    });
    build.onLoad(
      { filter: /bridge\/index\.bundled\.js$/, namespace: 'bridge' },
      async (args) => {
        return {
          contents: await buildAutoankiBridge(),
          loader: 'base64',
        };
      }
    );
  },
};

const config: BuildOptions = {
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  plugins: [pluginBundleAutoankiBridgeAsBase64],
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
