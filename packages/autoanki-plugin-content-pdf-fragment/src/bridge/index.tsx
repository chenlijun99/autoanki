import ReactDOM from 'react-dom/client';

import type {
  AnkiBridgeModule,
  AnkiBridgePlugin,
  AnkiBridgePluginApi,
} from '@autoanki/anki-bridge';

import PdfFragment from './pdf-fragment.js';
import { pdfjs } from 'react-pdf';

export interface PluginArgs {
  pdfFilesToRender: string[];
  pdfjsWorkerSrc: string;
}

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
        const div = document.createElement('div');
        div.classList.add(CLASS_NAME);
        objEl.replaceWith(div);
        const root = ReactDOM.createRoot(div);
        this.reactRoots.set(div, root);
        root.render(
          <PdfFragment pdfUrl={this.api.misc.getMediaFileUrlForXHR(dataUrl)} />
        );
      }
    });
  }
}

export default PdfRenderPlugin as AnkiBridgeModule;
