import {
  writePackageJson,
  combinePackageJsonChunks,
  packageJsonSingleEntryLibrary,
  packageJsonUseEsbuild,
  writeTsConfig,
} from '../config-utils.mjs';

await writeTsConfig();
await writePackageJson(
  combinePackageJsonChunks(packageJsonSingleEntryLibrary, packageJsonUseEsbuild)
);
