#!/usr/bin/env node
import { runNpmScriptOnChangedPackages, spawn } from './utils';

(async () => {
  const testedPackages = await runNpmScriptOnChangedPackages('test:coverage');
  if (testedPackages.length > 0) {
    // Apparently, codecov doesn't support flags with the '@' character.
    const flags = testedPackages
      .map((p) => p.name.replace('@autoanki/', ''))
      .join(',');
    const exitCode = await spawn(
      'bash',
      ['-c', `bash <(curl -s https://codecov.io/bash) -Z -F ${flags}`],
      {
        stdio: 'inherit',
      }
    );
    if (exitCode !== 0) {
      throw new Error('Codecov upload failed');
    }
  } else {
    console.warn("No package's tests have been executed");
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
