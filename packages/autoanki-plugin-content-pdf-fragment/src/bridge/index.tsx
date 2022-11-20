import ReactDOM from 'react-dom/client';

import type { AnkiBridgeModule, AnkiBridgePlugin } from '@autoanki/anki-bridge';

import PdfFragment from './pdf-fragment.js';
import { pdfjs } from 'react-pdf';

export interface PluginArgs {
  pdfFilesToRender: string[];
  pdfjsWorkerSrc: string;
}

const CLASS_NAME = 'autoanki-pdf-fragment-root';

class PdfRenderPlugin implements AnkiBridgePlugin {
  private reactRoots: Map<Element, ReactDOM.Root> = new Map();

  constructor(_: any, args: PluginArgs) {
    pdfjs.GlobalWorkerOptions.workerSrc = encodeURI(args.pdfjsWorkerSrc);
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
      const pathname = decodeURI(
        // remove first "/"
        new URL(objEl.data).pathname.slice(1)
      );
      if (!objEl.declare && args.pdfFilesToRender.includes(pathname)) {
        console.log('Rendering', objEl);
        const div = document.createElement('div');
        div.classList.add(CLASS_NAME);
        objEl.replaceWith(div);
        const root = ReactDOM.createRoot(div);
        this.reactRoots.set(div, root);
        root.render(<PdfFragment pdfUrl={objEl.data} />);
      }
    });
  }
}

export default PdfRenderPlugin as AnkiBridgeModule;
