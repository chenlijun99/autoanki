import { test, fc } from '@fast-check/jest';

import { urlToFilePath } from './utils.js';

describe('urlToFilePath', () => {
  it('Must work as specified', () => {
    const props = [
      fc.constantFrom('http://', 'file://', ''),
      fc.webPath(),
      fc.webQueryParameters(),
      fc.webFragments(),
    ] as const;
    const examples = [
      ['', '/', '', ''],
      ['', '/hello.png', '', ''],
      ['', '/hello.png', 'a=1&b=2', ''],
      ['', 'hello.png', '?a=1&b=2', ''],
      ['', './hello.png', '?a=1&b=2', 'hello'],
      ['file://', '/hello.png', '?a=1&b=2', ''],
    ];
    fc.assert(
      fc.property(...props, (protocol, path, queryParameters, fragment) => {
        fc.pre(path.length > 0);
        let url = '';
        if (protocol.length > 0) {
          url += protocol;
        }
        url += path;
        if (queryParameters.length > 0) {
          url += `?${queryParameters}`;
        }
        if (fragment.length > 0) {
          url += `#${fragment}`;
        }

        try {
          const urlObj = new URL(url, 'file://');
          fc.pre(urlObj.pathname === path);
        } catch {
          // precondition: must be valid URL
          fc.pre(false);
        }

        const result = urlToFilePath(url);

        const expected =
          protocol.length === 0 || protocol === 'file://'
            ? decodeURI(path)
            : undefined;

        expect(result).toEqual(expected);
      }),
      {
        examples,
      }
    );
  });
});
