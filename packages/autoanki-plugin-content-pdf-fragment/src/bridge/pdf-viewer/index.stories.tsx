import { css } from '@mui/material';

import type { Meta, StoryObj } from '@storybook/react';

import PdfFragment, { PdfFragmentProps } from './index.js';
import { CSS_CUSTOM_PROPERTIES } from '../constants.js';

import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

const Pdfs = {
  'Research Article (https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf)':
    'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',
  'Slides (https://stg-tud.github.io/ctbd/2017/CTBD_02_intro.pdf)':
    'https://stg-tud.github.io/ctbd/2017/CTBD_02_intro.pdf',
};

interface StoryProps extends Omit<PdfFragmentProps, 'pdfUrl'> {
  pdfFileUrl: string;
  openParameters?: string;
}

function StoryPdfFragment(props: StoryProps) {
  const { openParameters, pdfFileUrl, ...forwarded } = props;
  const pdfUrl = pdfFileUrl + (openParameters ?? '');
  return (
    <>
      <div style={{ marginBottom: '16px' }}>
        Actual props:{' '}
        {JSON.stringify(
          {
            ...forwarded,
            pdfUrl,
          },
          undefined,
          2
        )}
      </div>
      <PdfFragment {...forwarded} pdfUrl={pdfUrl} />
    </>
  );
}

export default {
  component: StoryPdfFragment,
  title: 'PDF fragment',
  args: {
    pdfFileUrl: Object.values(Pdfs)[0],
  },
  argTypes: {
    pdfFileUrl: {
      options: Pdfs,
      control: { type: 'select' },
    },
    pages: {
      control: { type: 'array' },
    },
  },
} as Meta<typeof StoryPdfFragment>;

type Story = StoryObj<typeof StoryPdfFragment>;

export const SinglePage: Story = {
  args: {},
};

export const WithToolbar: Story = {
  args: {
    enableToolbar: true,
  },
};

export const ToolbarIsSticky: Story = {
  render: (props) => {
    return <StoryPdfFragment css={{ height: '500px' }} {...props} />;
  },
  args: {
    enableToolbar: true,
  },
};

export const SubsetOfPages: Story = {
  args: {
    pages: [2, 3, 5, 14, 6, 7],
    enableToolbar: true,
  },
};

export const PageOpenParameter: Story = {
  args: {
    enableToolbar: true,
  },
  argTypes: {
    openParameters: {
      control: { type: 'text' },
    },
  },
};

export const ExplicitSizeToAvoidLayoutShift: Story = {
  render: (props) => {
    return (
      <>
        <StoryPdfFragment {...props} />
      </>
    );
  },
  args: {
    width: 612,
    height: 792,
  },
};

export const AutomaticHeight: Story = {
  render: (props) => {
    return (
      <>
        <StoryPdfFragment
          css={{ maxWidth: '100%', [CSS_CUSTOM_PROPERTIES.HEIGHT]: 'auto' }}
          {...props}
        />
      </>
    );
  },
};

export const AutomaticWidth: Story = {
  render: (props) => {
    return (
      <>
        <StoryPdfFragment
          css={{ maxHeight: '100vh', [CSS_CUSTOM_PROPERTIES.WIDTH]: 'auto' }}
          {...props}
        />
      </>
    );
  },
};

export const InsideACard: Story = {
  render: (props) => {
    const cardStyle = css({
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      '.autoanki-pdf-fragment': {
        /*
         * Typical styles used in Anki cards
         */
        // Don't overflow width
        maxWidth: '100%',
        // Scale the PDF to fit the width
        [CSS_CUSTOM_PROPERTIES.HEIGHT]: 'auto',
        // Center PDF fragment horizontally
        margin: '0 auto',
      },
    });

    return (
      <>
        <section css={cardStyle}>
          <h3>Question at page 1</h3>
          <StoryPdfFragment {...props} openParameters="#page=1" />
        </section>
        <hr style={{ margin: '32px 0' }} />
        <section css={cardStyle}>
          <h3>Answer at page 2 and 5</h3>
          <StoryPdfFragment
            {...props}
            enableToolbar={true}
            pages={[2, 5]}
            openParameters="#page=2&zoom=120"
          />
        </section>
      </>
    );
  },
};
