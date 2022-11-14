/**
 * @file This module contains some utility functions to generate and update
 * shared boilerplate configuration.
 *
 * Why have these functions?
 *
 * * The JavaScript ecosystem is quite a mess and configuring everything
 * nicely is a remarkable endeavour. To tame such complexity we need to:
*   * Keep the config as DRY as possible.
*   * Be able to add comments on some specific configurations, which JSON-based
*   files (e.g. package.json) often don't allow.

 * The idea behind these functions is:
 *
 * * Each package in the monoreop contains a script that invokes the necessary
* functions. E.g. if it uses TypeScript then it calls `writeTsConfig()`.
* * The functions in this module provide some default configs, which have
* higher priority than what read from the config file. What not configured
* by these functions can be freely configured by each single package and the
* functions take care to merge their default config with the remaining configs
* read from the files and only then writing the merged config back.
* * The functions also accept an override to the default configuration. So, the
* priority is: file content < default config from function < override.
 */
import fs from 'node:fs';
import path from 'node:path';

import cloneDeep from 'lodash-es/cloneDeep.js';
import merge from 'lodash-es/merge.js';
import mergeWith from 'lodash-es/mergeWith.js';
import isEqual from 'lodash-es/isEqual.js';
import uniqWith from 'lodash-es/uniqWith.js';
import set from 'lodash-es/set.js';
import get from 'lodash-es/get.js';

function recreateObjectWithPartiallyOrderKeys(obj, sortedKeys) {
  /**
   * From https://stackoverflow.com/a/5525820 we know that properties in
   * JavaScript objects actually have a well-defined order starting from ES2015
   *
   * Therefore, we just recreate an object and insert the properties following
   * `sortedKeys`
   */
  const newObj = {};
  for (const key of sortedKeys) {
    set(newObj, key, get(obj, key));
  }

  /*
   * We then use merge to copy the remaining properties
   */
  return merge(newObj, obj);
}

function customizer(objValue, srcValue) {
  if (Array.isArray(objValue) && Array.isArray(srcValue)) {
    return uniqWith(objValue.concat(srcValue), isEqual);
  }
}

function deepmergeWithDeepUniqueArray(...args) {
  return mergeWith(...args, customizer);
}

async function loadBoilerplateJSONConfigFile(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
  } catch (error) {
    console.log(`Creating ${filePath} because it doesn't exist`, error);
    await fs.promises.writeFile(filePath, '{}');
  }

  const buffer = await fs.promises.readFile(filePath);
  return JSON.parse(buffer.toString());
}

const DEFAULT_PACKAGE_JSON = {
  repository: {
    type: 'git',
    url: 'https://github.com/chenlijun99/autoanki.git',
  },
  license: 'MIT',
  engines: {
    node: '>=16.16.0',
  },
  files: [
    // Our convention is to put everything under dist
    './dist/*',
    /*
     * We choose to include also the source file
     *
     * * For source maps
     * * To allow savvy application developers to directly import the source
     * code, rather than what we transpiled.
     */
    './src/*',
  ],
  scripts: {
    'update-config': 'node config.mjs',
    /*
     * Is run every time the package is packed
     * (most often a package is packed to then be published)
     *
     * See https://docs.npmjs.com/cli/v8/using-npm/scripts
     */
    prepare: 'pnpm run build:prod',
    /*
     * Remove tsconfig.tsbuildinfo to ensure that tsc re-emits files when `incremental` is enabled
     */
    clean: 'rimraf ./dist/ ./tsconfig.build.tsbuildinfo',
  },
};

const npmPropertiesDesiredOrder = [
  'name',
  'version',
  'description',
  'keywords',
  'author',
  'repository',
  'license',
  'engines',
  'type',
  'bin',
  'main',
  'module',
  'types',
  'exports',
  'files',
  'peerDependencies',
  'dependencies',
  'devDependencies',
  'scripts',
];

export const packageJsonApplication = {
  /*
   * By default treat .js files as ES modules.
   * See https://nodejs.org/api/packages.html#packagejson-and-file-extensions
   */
  type: 'module',
  scripts: {
    /*
     * For library packages, perform type-checking and emit declaration
     * and declaration map in dist/
     */
    typecheck: 'tsc --project tsconfig.build.json --noEmit',
    'prebuild:dev': 'pnpm run clean',
    'prebuild:prod': 'pnpm run clean && pnpm run typecheck',
  },
};

export const packageJsonLibrary = {
  /*
   * By default treat .js files as ES modules.
   * See https://nodejs.org/api/packages.html#packagejson-and-file-extensions
   */
  type: 'module',
  scripts: {
    /*
     * For library packages, perform type-checking and emit declaration
     * and declaration map in dist/
     */
    typegen:
      'tsc --project tsconfig.build.json --emitDeclarationOnly --declaration --declarationDir dist/ --declarationMap',
    'prebuild:dev': 'pnpm run clean',
    'prebuild:prod': 'pnpm run clean && pnpm run typegen',
  },
};

export const packageJsonSingleEntryLibrary = {
  ...packageJsonLibrary,
  /*
   * CJS fall-back for older versions of Node.js that don't support
   * module resolution based on `exports`.
   *
   * We don't support those old Node.js, nor CJS.
   */
  main: undefined,
  /*
   * This field is mostly used by bundler.
   * Useful for those that have not added support for package.json `exports.`
   *
   * See:
   *
   * * https://stackoverflow.com/questions/42708484/what-is-the-module-package-json-field-for
   * * https://esbuild.github.io/api/#main-fields
   */
  module: './dist/index.js',
  /*
   * Fall-back for older versions of TypeScript (<4.8),
   * which don't support type resolution based on package.json `exports`.
   *
   * We don't support those old TypeScript.
   */
  types: undefined,
  exports: {
    '.': {
      // Entry-point for `import "my-package"` in ESM
      import: {
        // Where TypeScript will look.
        types: './dist/index.d.ts',
        // Where Node.js will look.
        default: './dist/index.js',
      },
      // We don't support CJS
      require: undefined,
    },
  },
};

export const packageJsonUseEsbuild = {
  scripts: {
    /*
     * For the main esbuild logic, see esbuild.common.mts
     */
    'build:dev': 'ts-node -T esbuild.config.mts',
    'build:prod': 'ts-node -T esbuild.config.mts production',
  },
};

export const packageJsonUseSWC = {
  scripts: {
    'build:dev': 'swc --config-file ../swcrc ./src -d dist/ --source-maps',
    'build:prod': 'swc --config-file ../swcrc ./src -d dist/ --source-maps',
  },
};

export const combinePackageJsonChunks = deepmergeWithDeepUniqueArray;

/**
 * Reads the package.json file of the CWD, updates some fields and writes
 * it back.
 */
export async function writePackageJson(extra) {
  const defaults = {
    repository: {
      directory: process.cwd().split(path.sep).slice(-2).join(path.sep),
    },
  };

  const filePath = path.join(process.cwd(), 'package.json');
  const packageJson = await loadBoilerplateJSONConfigFile(filePath);
  const merged = deepmergeWithDeepUniqueArray(
    cloneDeep(packageJson),
    DEFAULT_PACKAGE_JSON,
    defaults,
    extra
  );
  if (!isEqual(packageJson, merged)) {
    const partiallyOrdered = recreateObjectWithPartiallyOrderKeys(
      merged,
      npmPropertiesDesiredOrder
    );
    await fs.promises.writeFile(
      filePath,
      JSON.stringify(partiallyOrdered, undefined, 2)
    );
  }
}

const DEFAULT_TSCONFIG_JSON = {
  extends: '../tsconfig.base.json',
  /*
   * Note `exclude: ['node_modules']` is useless
   * See https://www.typescriptlang.org/tsconfig#type-exclude
   */
  include: ['src/**/*.ts'],
  exclude: ['src/**/*.spec.ts'],
};

export async function writeTsConfig() {
  const filePath = path.join(process.cwd(), 'tsconfig.build.json');
  const tsconfigJson = await loadBoilerplateJSONConfigFile(filePath);
  const merged = deepmergeWithDeepUniqueArray(
    cloneDeep(tsconfigJson),
    DEFAULT_TSCONFIG_JSON
  );
  if (!isEqual(merged, tsconfigJson)) {
    await fs.promises.writeFile(filePath, JSON.stringify(merged, undefined, 2));
  }
}
