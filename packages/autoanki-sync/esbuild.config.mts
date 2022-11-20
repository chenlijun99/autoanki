import esbuild, { BuildOptions, Plugin } from 'esbuild';
import {
  prod,
  combineConfigs,
  configBase,
  configBundleWithoutNodeModules,
  configTargetSpecific,
  configPluginBundledBridgePluginAsBase64,
} from '../esbuild.common.mjs';

const config: BuildOptions = {
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  plugins: [configPluginBundledBridgePluginAsBase64()],
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
