import {
  writePackageJson,
  packageJsonSingleEntryLibrary,
  packageJsonUseSWC,
  combinePackageJsonChunks,
  writeTsConfig,
} from '../config-utils.mjs';

await writeTsConfig();

await writePackageJson(
  combinePackageJsonChunks(packageJsonSingleEntryLibrary, packageJsonUseSWC)
);
