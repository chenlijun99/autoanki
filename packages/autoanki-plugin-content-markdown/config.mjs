import {
  writePackageJson,
  combinePackageJsonChunks,
  packageJsonSingleEntryLibrary,
  packageJsonUseEsbuild,
  writeTsConfig,
} from '../config-utils.mjs';

const packageJson = {
  scripts: {
    'assets-gen': 'ts-node builtin-themes-build.mts',
    'postbuild:prod': 'pnpm run assets-gen',
  },
};

await writeTsConfig();
await writePackageJson(
  combinePackageJsonChunks(
    packageJsonSingleEntryLibrary,
    packageJsonUseEsbuild,
    packageJson
  )
);
