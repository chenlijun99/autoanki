import {
  writePackageJson,
  combinePackageJsonChunks,
  packageJsonSingleEntryLibrary,
  packageJsonUseSWC,
  writeTsConfig,
} from '../config-utils.mjs';

await writeTsConfig();
await writePackageJson(
  combinePackageJsonChunks(packageJsonSingleEntryLibrary, packageJsonUseSWC)
);
