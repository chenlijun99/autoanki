import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildAndWriteBuiltinThemes } from './builtin-themes.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const assetsPath = path.join(__dirname, 'assets/');

buildAndWriteBuiltinThemes(assetsPath);
