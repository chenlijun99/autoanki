import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import process from 'node:process';

import esbuild, { Plugin, BuildOptions } from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';

import merge from 'lodash-es/merge.js';
import mergeWith from 'lodash-es/mergeWith.js';
import isEqual from 'lodash-es/isEqual.js';
import uniqWith from 'lodash-es/uniqWith.js';

export const prod = process.argv[2] === 'production';

function customizer(objValue: any, srcValue: any) {
  if (Array.isArray(objValue) && Array.isArray(srcValue)) {
    return uniqWith(objValue.concat(srcValue), isEqual);
  }
}

function deepmergeWithDeepUniqueArray(...args: any[]) {
  return mergeWith(...args, customizer);
}

export const combineConfigs = deepmergeWithDeepUniqueArray;

export const configBase: BuildOptions = {
  /*
   * Assuming that esbuild is invoked in the root of each package, this
   * relative path should work.
   * The goal of this is to avoid that esbuild finds `../tsconfig.json`,
   * which contains path mappings that we don't want esbuild to consider,
   * because once it finds these path mappings, `esbuild` will then bundle the
   * source modules rather than the built ones in the `dist/` folder of each
   * package. This is especially problematic if some packages require custom
   * bundling logic (e.g. @autoanki/sync bundles some JS modules as base64).
   */
  tsconfig: '../tsconfig.base.json',
  logLevel: 'info',
  sourcemap: true,
  // enable tree shaking only in production
  treeShaking: prod,
};

export const configBundleWithoutNodeModules = (
  fullySpecifiedAllowList?: string[]
): BuildOptions => {
  return {
    bundle: true,
    plugins: [
      /*
       * esbuild already supports treating all the modules in `node_modules`/
       * as external, via `external: ['./node_modules/*']`
       * (see https://esbuild.github.io/getting-started/#bundling-for-node),
       * but sometimes we want to specifiy an allow list.
       */
      nodeExternalsPlugin(
        fullySpecifiedAllowList !== undefined
          ? {
              allowList: fullySpecifiedAllowList,
            }
          : {}
      ),
    ],
  };
};

export const configTargetSpecific = {
  ankiWebView: {
    minify: prod,
    treeShaking: prod,
    bundle: true,
    target: ['es2020'],
    platform: 'browser',
    format: 'esm',
  } as BuildOptions,
  nodeApp: {
    outfile: 'dist/index.cjs',
    platform: 'node',
    target: ['node14', 'es2020'],
    /*
     * Use CommonJS even though node14 should support ESM.
     *
     * The problem is that there are still dependencies that are written
     * in CJS, but `require()` is not supported when executing node executes
     * an ESM.
     *
     * https://github.com/evanw/esbuild/issues/1921
     */
    format: 'cjs',
    minify: prod,
  } as BuildOptions,
  esmLib: {
    outfile: 'dist/index.js',
    /*
     * This configuration outputs ES6 modules.
     * This should be the mostly used configuration.
     *
     * Expected use case:
     *
     * * In Node.js/Browser applications:
     *   * Whose platform is recent enough and doesn't need transpilation for
     *   ES2020.
     * * Either ES6 modules are supported or the application developer is
     * willing to use a module bundler.
     *
     * The Node.js supported by us should be able to run this out-of-the-box
     */
    platform: 'neutral',
    target: ['node14', 'es2020'],
    /*
     * No need to minify:
     *
     * * If used in Node.js, no need.
     * * If used in browser, the final application will take care of bundling
     * and minifying everything.
     */
    minify: false,
  } as BuildOptions,
} as const;

async function buildBridge(entrypoint?: string): Promise<string> {
  const result = esbuild.buildSync({
    entryPoints: [entrypoint ?? 'src/bridge/index.ts'],
    outfile: 'dist/bridge.js',
    ...configTargetSpecific.ankiWebView,
  });

  assert(result.errors.length === 0);
  const content = await readFile('dist/bridge.js');
  return content.toString();
}

/**
 * Convention over configuration.
 * When using this plugin ensure that:
 *
 * * The entrypoint of the bridge plugin is in `src/bridge/index.ts`.
 * * The import specifier for the bundled plugin is 'bridge/index.bundled.js'.
 */
export const configPluginBundledBridgePluginAsBase64 = (
  entrypoint?: string
) => {
  return {
    name: 'bundle_bridge_plugin',
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
            contents: await buildBridge(entrypoint),
            loader: 'base64',
          };
        }
      );
    },
  } as Plugin;
};

type TargetConfigName = keyof typeof configTargetSpecific;

/**
 * Build an application
 */
export async function buildApplication(config: {
  types: TargetConfigName[];
  extraPlugins?: Plugin[];
}) {
  const defaultConfig: BuildOptions = {
    ...configBase,
    entryPoints: ['src/index.ts'],
    logLevel: 'info',
    sourcemap: true,
    // enable tree shaking only in production
    treeShaking: prod,
    bundle: true,
    plugins: [...(config?.extraPlugins ?? [])],
  };

  return Promise.all(
    Object.entries(configTargetSpecific)
      .filter((conf) => config.types.includes(conf[0] as TargetConfigName))
      .map((conf) => {
        const targetConfig = conf[1];
        return esbuild.build({
          ...defaultConfig,
          ...targetConfig,
        });
      })
  );
}

/**
 * Build a library that necessitates some degree of bundling (e.g. inlining
 * some assets).
 *
 * By default, nothing from node_modules is bundled.
 *
 * For a library that doesn't need bundling, just use SWC to transpile all the
 * TypeScript sources.
 */
export async function buildLibrary(
  config: {
    extraPlugins?: Plugin[];
    nodeModulesImportsAllowList?: string[];
  } = {}
) {
  const defaultConfig: BuildOptions = {
    ...configBase,
    entryPoints: ['src/index.ts'],
    /*
     * Enable bundling, even though generally we want to exclude all the
     * node modules from the bundle. The idea is that for library NPM
     * packages, it's better to defer the final bundling to the application.
     * In order to exclude all the modules that are from `node_modules`,
     * we will use `nodeExternalsPlugin`.
     */
    bundle: true,
    plugins: [
      /*
       * esbuild already supports treating all the modules in `node_modules`/
       * as external, via `external: ['./node_modules/*']`
       * (see https://esbuild.github.io/getting-started/#bundling-for-node),
       * but sometimes we want to specifiy an allow list.
       */
      nodeExternalsPlugin(
        config?.nodeModulesImportsAllowList !== undefined
          ? {
              allowList: config?.nodeModulesImportsAllowList,
            }
          : {}
      ),
      ...(config?.extraPlugins ?? []),
    ],
  };

  return esbuild.build({
    ...defaultConfig,
    ...configTargetSpecific.esmLib,
  });
}
