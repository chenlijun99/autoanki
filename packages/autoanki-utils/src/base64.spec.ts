import { test, fc } from '@fast-check/jest';

import * as NodeBase64 from './base64.node.js';
import * as DefaultBase64 from './base64.default.js';

describe('Base 64', () => {
  test.prop([fc.oneof(fc.string(), fc.fullUnicodeString())])(
    'All the base 64 functions must have the same behaviour',
    (str) => {
      const nodeBase64 = NodeBase64.stringToBase64(str);
      const defaultBase64 = DefaultBase64.stringToBase64(str);

      expect(nodeBase64).toEqual(defaultBase64);
      expect(NodeBase64.base64ToString(nodeBase64)).toEqual(str);
      expect(DefaultBase64.base64ToString(defaultBase64)).toEqual(str);
    }
  );
});
