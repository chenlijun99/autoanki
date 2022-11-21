import type { Meta, StoryObj } from '@storybook/react';

import PdfViewer from './pdf-fragment.js';

import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

const DEFAULT_PDF =
  'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf';

export default {
  component: PdfViewer,
  args: {
    pdfUrl: DEFAULT_PDF,
  },
} as Meta<typeof PdfViewer>;

type Story = StoryObj<typeof PdfViewer>;

export const SinglePage: Story = {
  args: {},
};

export const PageOpenParameter: Story = {
  args: {
    pdfUrl: DEFAULT_PDF + '#page=2',
  },
};
