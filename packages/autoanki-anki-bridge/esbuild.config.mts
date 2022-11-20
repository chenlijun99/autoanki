import esbuild, { BuildOptions } from 'esbuild';
import {
  combineConfigs,
  configBase,
  configBundleWithoutNodeModules,
  configTargetSpecific,
} from '../esbuild.common.mjs';

const config: BuildOptions = {
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
};

esbuild
  .build(
    combineConfigs(
      configBase,
      configBundleWithoutNodeModules(),
      configTargetSpecific.ankiWebView,
      config
    )
  )
  .catch(() => process.exit(1));
