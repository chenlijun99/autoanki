import { buildApplication } from '../esbuild.common.mjs';

buildApplication({
  types: ['nodeApp'],
}).catch(() => process.exit(1));
