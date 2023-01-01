import { PropsWithChildren } from 'react';

import createCache from '@emotion/cache';
import type { StylisElement } from '@emotion/cache';
import { prefixer } from 'stylis';
import { CacheProvider } from '@emotion/react';

const PREFIX = '.autoanki-pdf-fragment-root ';

const plugin = (element: StylisElement) => {
  if (element.type === 'rule' && element.root?.type !== '@keyframes') {
    /*
     * This stylis plugin prepends the given PREFIX to each selector
     * to increase its specificity.
     * I use the class name of the element in which the React app is contained.
     * The original selector is also kept, so that popup components which
     * append DOM elements directly inside body (thus are not children of
     * the React app root) can still have their CSS corretly applied.
     */
    element.props = (
      Array.isArray(element.props) ? element.props : [element.props]
    ).flatMap((prop) => {
      return [`${PREFIX}${prop}`, prop];
    });
  }
};

const myCache = createCache.default({
  key: 'autoanki-plugin-content-pdf-fragment',
  stylisPlugins: [plugin, prefixer],
});

export function CssPrefixer({ children }: PropsWithChildren) {
  return <CacheProvider value={myCache}>{children}</CacheProvider>;
}
