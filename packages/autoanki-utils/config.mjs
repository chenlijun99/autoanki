import {
  writePackageJson,
  combinePackageJsonChunks,
  packageJsonLibrary,
  packageJsonUseSWC,
  writeTsConfig,
} from '../config-utils.mjs';

await writeTsConfig();
await writePackageJson(
  combinePackageJsonChunks(packageJsonLibrary, packageJsonUseSWC)
);
