import { CSSProperties } from 'react';

import type { Meta, StoryObj } from '@storybook/react';

import PdfViewer from './index.js';

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
    pages: undefined,
  },
  argTypes: {
    pages: {},
  },
} as Meta<typeof PdfViewer>;

type Story = StoryObj<typeof PdfViewer>;

export const SinglePage: Story = {
  args: {},
};

export const PageOpenParameter: Story = {
  args: {
    pdfUrl: DEFAULT_PDF + '#page=2&zoom=100',
  },
};

export const WithToolbar: Story = {
  args: {
    enableToolbar: true,
  },
};

export const ToolbarIsSticky: Story = {
  render: (props) => {
    return (
      <div style={{ height: '500px' }}>
        <PdfViewer {...props} />
      </div>
    );
  },
  args: {
    enableToolbar: true,
  },
};

export const SubsetOfPages: Story = {
  args: {
    pages: [2, 3, 5, 14],
    enableToolbar: true,
  },
};

export const InsideACard: Story = {
  render: (props) => {
    const cardStyle: CSSProperties = {
      height: '80vh',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
    };
    const pdfReaderStyle: CSSProperties = {
      // dunno why, but necessary so that PdfViewer doesn't exceed its parent's height
      minHeight: 0,
      width: '80%',
      margin: '0 auto',
    };

    return (
      <>
        <section style={cardStyle}>
          <h3>Question at page 1</h3>
          <PdfViewer
            {...props}
            pdfUrl={DEFAULT_PDF + '#page=1&zoom=100'}
            style={pdfReaderStyle}
          />
        </section>
        <hr style={{ margin: '32px 0' }} />
        <section style={cardStyle}>
          <h3>Answer at page 2 and 5</h3>
          <PdfViewer
            {...props}
            enableToolbar={true}
            pages={[2, 5]}
            pdfUrl={DEFAULT_PDF + '#page=2&zoom=120'}
            style={pdfReaderStyle}
          />
        </section>
      </>
    );
  },
};
