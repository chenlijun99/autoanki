/**
 * @file Read Joplin's manifest.json and update the version field to make it
 * match with the version in package.json.
 *
 * This script must be called by yarn or npm, since it uses
 * `process.env.npm_package_version`.
 */

const fs = require('fs');
const path = require('path');
const manifest = require('../src/manifest.json');

manifest.version = process.env.npm_package_version;
fs.writeFileSync(
  path.resolve(__dirname, '../src/manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`
);
