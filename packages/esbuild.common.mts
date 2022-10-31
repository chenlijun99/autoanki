import esbuild, { Plugin, BuildOptions } from 'esbuild';
import process from 'node:process';
import { nodeExternalsPlugin } from 'esbuild-node-externals';

const prod = process.argv[2] === 'production';

const targetConfigs = {
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
type TargetConfigName = keyof typeof targetConfigs;

/**
 * Build an application
 */
export async function buildApplication(config: {
  types: TargetConfigName[];
  extraPlugins?: Plugin[];
}) {
  const defaultConfig: BuildOptions = {
    entryPoints: ['src/index.ts'],
    logLevel: 'info',
    sourcemap: true,
    // enable tree shaking only in production
    treeShaking: prod,
    bundle: true,
    plugins: [...(config?.extraPlugins ?? [])],
  };

  return Promise.all(
    Object.entries(targetConfigs)
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
    entryPoints: ['src/index.ts'],
    logLevel: 'info',
    sourcemap: true,
    // enable tree shaking only in production
    treeShaking: prod,
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
    ...targetConfigs.esmLib,
  });
}
