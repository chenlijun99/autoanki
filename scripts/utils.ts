import { promisify } from 'util';
import fs from 'fs';
import child_process from 'child_process';
/* eslint-disable import/no-extraneous-dependencies */
import glob from 'glob';
import path from 'path';

const exec = promisify(child_process.exec);
export function spawn(
  ...args: Parameters<typeof child_process['spawn']>
): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const child = child_process.spawn(...args);
    child.on('close', (code) => {
      // Should probably be 'exit', not 'close'
      resolve(code);
    });
    child.on('error', (err) => {
      reject(err);
    });
  });
}

interface Package {
  packageJson: any;
  packageDir: string;
  name: string;
}

function getPackage(packageDir: string): Package {
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', packageDir, 'package.json'), {
      encoding: 'utf-8',
    })
  );
  return {
    packageJson,
    name: packageJson.name,
    packageDir: path.normalize(packageDir),
  };
}

function isInPackageDir(filePath: string): boolean {
  return !!filePath.match('packages/.+?/');
}
function getPackageDir(filePath: string): string {
  return filePath.match('packages/.+?/')![0];
}

function isInRootWorkspaceDir(filePath: string): boolean {
  return !filePath.match('packages/*');
}

export async function getChangedPackages(): Promise<Package[]> {
  const { stdout } = await exec('git diff --name-only HEAD HEAD~1');

  const modifiedPaths = stdout.split('\n');
  const packageMap: Record<Package['packageDir'], Package> = {};
  for (let i = 0; i < modifiedPaths.length; i += 1) {
    if (isInRootWorkspaceDir(modifiedPaths[i])) {
      /*
       * if some file in the root workspace has been modified, assume that all
       * packages are affected
       */
      const packages = glob.sync('packages/*', {
        cwd: path.resolve(__dirname, '../'),
      });
      return packages.map(getPackage);
    }

    if (isInPackageDir(modifiedPaths[i])) {
      const packageDir = getPackageDir(modifiedPaths[i]);
      if (!packageMap[packageDir]) {
        packageMap[packageDir] = getPackage(packageDir);
      }
    }
  }

  return Object.values(packageMap);
}

/**
 * Run npm script defined in the package.json file of each changed package
 *
 * @async
 * @param {string} scriptName - the name of the npm script to be run
 * @return {Promise<Package[]>} the packages for which the script has be run
 */
export async function runNpmScriptOnChangedPackages(
  scriptName: string
): Promise<Package[]> {
  const packages = await getChangedPackages();
  const runPackages: Package[] = [];
  if (packages.length > 0) {
    let scopes = '';
    packages.forEach((p) => {
      if (p.packageJson.scripts[scriptName]) {
        runPackages.push(p);
        scopes += `--scope ${p.name} `;
      } else {
        console.warn(`Package ${p.name} doesn't have the ${scriptName} script`);
      }
    });
    if (scopes !== '') {
      await spawn('yarn', `lerna run ${scopes} ${scriptName}`.split(/\s+/), {
        stdio: 'inherit',
      });
    }
  }
  return runPackages;
}
