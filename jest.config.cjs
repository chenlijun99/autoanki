const path = require('node:path');
const { pathsToModuleNameMapper } = require('ts-jest');
const requireJSON5 = require('require-json5');
// In the following statement, replace `./tsconfig` with the path to your `tsconfig` file
// which contains the path mapping (ie the `compilerOptions.paths` option):
const { compilerOptions } = requireJSON5('./packages/tsconfig.json');

const tsconfigPathMaps = pathsToModuleNameMapper(compilerOptions.paths, {
  prefix: '<rootDir>/packages/',
});
delete tsconfigPathMaps['^@autoanki/utils/(.*)$'];

function projectConfig(packageName) {
  return {
    displayName: packageName,
    extensionsToTreatAsEsm: ['.ts'],
    modulePaths: ['<rootDir>/packages/'],
    moduleNameMapper: {
      ...tsconfigPathMaps,
      '^@autoanki/utils/webcrypto\\.js$':
        '<rootDir>/packages//autoanki-utils/src/webcrypto.node',
      '^@autoanki/utils/hash-sync\\.js$':
        '<rootDir>/packages//autoanki-utils/src/hash-sync.node',
      '^@autoanki/utils/(.*)\\.js$':
        '<rootDir>/packages//autoanki-utils/src/$1',
      '^#webcrypto\\.js$':
        '<rootDir>/packages//autoanki-utils/src/webcrypto.node',
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    transform: {
      // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
      // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
      '^.+\\.tsx?$': [
        'ts-jest',
        {
          tsconfig: '<rootDir>/packages/tsconfig.json',
          useESM: true,
          isolatedModules: true,
        },
      ],
    },
    testEnvironment: 'node',
    testMatch: [
      `<rootDir>/packages/${packageName}/**/?(*.)+(spec|test).[t]s?(x)`,
    ],
  };
}

/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  projects: [
    projectConfig('autoanki-sync'),
    projectConfig('autoanki-core'),
    projectConfig('autoanki-utils'),
    projectConfig('autoanki-plugin-content-local-media-extractor'),
  ],
};
