import ReactDOM from 'react-dom/client';

import { pdfjs } from 'react-pdf';
import rangeParser from 'parse-numeric-range';

import type {
  AnkiBridgeModule,
  AnkiBridgePlugin,
  AnkiBridgePluginApi,
} from '@autoanki/anki-bridge';

import PdfFragment, { PdfFragmentProps } from './pdf-fragment/index.js';
import { DOMConstants } from '@autoanki/plugin-content-local-media-extractor/api/constants.js';

export interface PluginArgs {
  pdfFilesToRender: string[];
  pdfjsWorkerSrc: string;
}

const pdfFragmentPropsToDataAttributesMap: Record<
  keyof Pick<PdfFragmentProps, 'enableToolbar' | 'pages'>,
  string
> = {
  enableToolbar: 'data-autoanki-pdf-enable-toolbar',
  pages: 'data-autoanki-pdf-pages',
} as const;

const CLASS_NAME = 'autoanki-pdf-fragment-root';

function basename(str: string, sep: string): string {
  return str.slice(str.lastIndexOf(sep) + 1);
}

class PdfRenderPlugin implements AnkiBridgePlugin {
  private reactRoots: Map<Element, ReactDOM.Root> = new Map();

  constructor(private api: AnkiBridgePluginApi, _: any, args: PluginArgs) {
    pdfjs.GlobalWorkerOptions.workerSrc = api.misc.getMediaFileUrlForXHR(
      encodeURI(args.pdfjsWorkerSrc)
    );
  }

  private unmountExisting() {
    for (const [element, root] of this.reactRoots) {
      root.unmount();
    }
  }

  onDestroy(): void {
    this.unmountExisting();
  }

  onCardChange(cardEl: Element, args: PluginArgs): void {
    this.unmountExisting();
    cardEl.querySelectorAll<HTMLObjectElement>('object').forEach((objEl) => {
      if (objEl.declare) {
        return;
      }
      const dataAttributeContent = objEl.getAttribute('data');
      if (!dataAttributeContent) {
        return;
      }

      const dataUrl =
        this.api.misc.encodeObjectDataUrlIfNecessary(dataAttributeContent);
      const dataUrlDecoded = decodeURI(dataUrl);
      if (args.pdfFilesToRender.includes(dataUrlDecoded)) {
        console.log('Rendering', objEl);
        const hash =
          objEl.getAttribute(DOMConstants.dataAttributeOriginalHash) ?? '';
        const query =
          objEl.getAttribute(DOMConstants.dataAttributeOriginalQueryString) ??
          '';

        const div = document.createElement('div');
        div.classList.add(CLASS_NAME);
        objEl.replaceWith(div);
        const root = ReactDOM.createRoot(div);
        this.reactRoots.set(div, root);

        let pages: PdfFragmentProps['pages'] = undefined;
        {
          const p = objEl.getAttribute(
            pdfFragmentPropsToDataAttributesMap.pages
          );
          if (p) {
            const ranges = rangeParser(p);
            if (ranges.length > 0) {
              pages = ranges;
            }
          }
        }

        const props: PdfFragmentProps = {
          pdfUrl: this.api.misc.getMediaFileUrlForXHR(dataUrl) + query + hash,
          enableToolbar:
            objEl.getAttribute(
              pdfFragmentPropsToDataAttributesMap.enableToolbar
            ) === 'true' || (pages?.length ?? 0) > 1,
          pages,
        };
        root.render(<PdfFragment {...props} />);
      }
    });
  }
}

export default PdfRenderPlugin as AnkiBridgeModule;
