#!/usr/bin/env node
import { runNpmScriptOnChangedPackages } from './utils';

(async () => {
  const builtPackages = await runNpmScriptOnChangedPackages('build');
  if (builtPackages.length === 0) {
    console.warn('No package needed to be built');
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
