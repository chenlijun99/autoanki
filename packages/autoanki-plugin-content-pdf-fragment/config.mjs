import {
  writePackageJson,
  packageJsonSingleEntryLibrary,
  packageJsonUseEsbuild,
  combinePackageJsonChunks,
  writeTsConfig,
} from '../config-utils.mjs';

await writeTsConfig();

await writePackageJson(
  combinePackageJsonChunks(packageJsonSingleEntryLibrary, packageJsonUseEsbuild)
);
