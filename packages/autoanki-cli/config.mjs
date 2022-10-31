import {
  writePackageJson,
  combinePackageJsonChunks,
  packageJsonApplication,
  packageJsonUseEsbuild,
  writeTsConfig,
} from '../config-utils.mjs';

await writeTsConfig();
await writePackageJson(
  combinePackageJsonChunks(packageJsonApplication, packageJsonUseEsbuild)
);
