import { readFile } from 'node:fs/promises';

import esbuild, { BuildOptions, Plugin } from 'esbuild';
import {
  prod,
  combineConfigs,
  configBase,
  configBundleWithoutNodeModules,
  configPluginBundledBridgePluginAsBase64,
  configTargetSpecific,
} from '../esbuild.common.mjs';

export const pluginLoadPdfWorkerAsBase64 = {
  name: 'loadPdfJsWorkerAsBase64',
  setup(build) {
    build.onResolve({ filter: /bridge\/pdf\.worker\.bundled\.js$/ }, (args) => {
      return {
        path: args.path,
        namespace: 'bridge',
      };
    });
    build.onLoad(
      { filter: /bridge\/pdf\.worker\.bundled\.js$/, namespace: 'bridge' },
      async (args) => {
        return {
          contents: await readFile(
            `node_modules/pdfjs-dist/legacy/build/pdf.worker${
              prod ? '.min' : ''
            }.js`
          ),
          loader: 'base64',
        };
      }
    );
  },
};

const config: BuildOptions = {
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  // load css of react-pdf as base64
  loader: { '.css': 'base64' },
  plugins: [
    pluginLoadPdfWorkerAsBase64,
    configPluginBundledBridgePluginAsBase64('src/bridge/index.tsx'),
  ],
  jsx: 'automatic',
  /*
   * So that emotion.js works
   * See https://github.com/emotion-js/emotion/issues/2474
   */
  jsxImportSource: '@emotion/react',
};

esbuild
  .build(
    combineConfigs(
      configBase,
      configBundleWithoutNodeModules([
        'react-pdf/dist/esm/Page/TextLayer.css',
        'react-pdf/dist/esm/Page/AnnotationLayer.css',
      ]),
      configTargetSpecific.esmLib,
      config
    )
  )
  .catch(() => process.exit(1));
