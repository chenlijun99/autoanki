import { test, fc } from '@fast-check/jest';

import { hashContentSync as nodeHashSync } from './hash-sync.node.js';
import { hashContentSync as defaultHashSync } from './hash-sync.default.js';
import { hashContent } from './hash.js';

describe('Hash functions', () => {
  test.prop([fc.string()])(
    'All the hash functions must produce the same digest',
    async (content) => {
      const nodeHashSyncDigest = nodeHashSync(content);
      const defaultHashSyncDigest = defaultHashSync(content);
      const asyncHashSyncDigest = await hashContent(content);

      expect(nodeHashSyncDigest).toEqual(defaultHashSyncDigest);
      expect(nodeHashSyncDigest).toEqual(asyncHashSyncDigest);
    }
  );
});
