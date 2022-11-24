import { useEffect, useRef, useState, useMemo, CSSProperties } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { SizeMe, SizeMeProps } from 'react-sizeme';

import { Card, css } from '@mui/material';

import { CSS_CLASSES } from '../constants.js';
import Theme from './theme.js';
import Toolbar from './toolbar.js';
import ZoomControl from './zoom-control.js';
import PageControl from './page-control.js';

interface PdfFragmentProps {
  pdfUrl: string;
  enableToolbar?: boolean;
  pages?: number[];
  style?: CSSProperties;
}

const pdfDocumentStyle = css({
  '.react-pdf__Page': {
    // horizontally center the page in the PDF document
    margin: 'auto',
    width: 'fit-content',
  },
  /**
   * Use CSS for "cover-up" the fact that text layer is a bit misaligned.
   *
   * Adapted from https://github.com/wojtekmaj/react-pdf/issues/100#issuecomment-345124649
   */
  '.react-pdf__Page__textContent.textLayer span': {
    opacity: 0.4,
  },
  '.react-pdf__Page__textContent.textLayer span::selection': {
    backgroundColor: '#bccbff',
  },
});

export default function PdfFragment(props: PdfFragmentProps) {
  const [numPages, setNumPages] = useState<number>();

  const [pageNumber, setPageNumber] = useState<number>(
    props.pages ? props.pages[0] : 1
  );
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    const params = new URLSearchParams(new URL(props.pdfUrl).hash.slice(1));
    const page = params.get('page');
    if (page) {
      const value = Number.parseInt(page);
      if (value !== Number.NaN) {
        setPageNumber(value);
      }
    }

    const newScale = params.get('zoom');
    if (newScale) {
      const value = Number.parseInt(newScale);
      if (value !== Number.NaN) {
        setScale(value / 100);
      }
    }
  }, [props.pdfUrl]);

  const pdfUrl = useMemo(() => {
    // From https://stackoverflow.com/a/2541083
    return props.pdfUrl.split(/[#?]/)[0];
  }, [props.pdfUrl]);

  const onDocumentLoadSuccess: Document['props']['onLoadSuccess'] = (pdf) => {
    setNumPages(pdf.numPages);
  };

  const containerRef = useRef(null);

  return (
    <>
      {/*
      Don't include this. It's too "invasive" and "opinionated" for Anki.
      What I mean is that e.g. it forces the margin on the body tag.
      This may be very strange for Anki users who are used to this.
      <CssBaseline />
      */}
      <div
        className={CSS_CLASSES.PDF_CONTAINER}
        style={props.style}
        ref={containerRef}
      >
        <Theme>
          {/**
           * Inspired by https://github.com/wojtekmaj/react-pdf/issues/129#issuecomment-521905189
           * for auto-sizing the PDF to fit the parent div.
           */
          /* @ts-ignore */}
          <SizeMe
            refreshRate={128}
            refreshMode={'debounce'}
            // @ts-ignore
            render={({ size }: SizeMeProps) => (
              <Card
                elevation={3}
                style={{ overflow: 'auto', height: '100%', width: '100%' }}
                ref={containerRef}
              >
                {props.enableToolbar ? (
                  <Toolbar scrollContainer={containerRef.current}>
                    <div
                      css={{
                        /*
                         * Center `PageControl` using css.
                         * See https://stackoverflow.com/questions/32378953/keep-the-middle-item-centered-when-side-items-have-different-widths
                         */
                        display: 'flex',
                        width: '100%',
                        '& > *:first-child': {
                          flex: 1,
                          display: 'flex',
                          justifyContent: 'flex-start',
                        },
                        '& > *:last-child': {
                          flex: 1,
                          display: 'flex',
                          justifyContent: 'flex-end',
                        },
                      }}
                    >
                      <div />
                      <PageControl
                        page={pageNumber}
                        numPages={numPages}
                        allowedPages={props.pages}
                        onPageChanged={(newPageNumber) =>
                          setPageNumber(newPageNumber)
                        }
                      />
                      <ZoomControl
                        zoom={scale * 100}
                        onZoomChanged={(newZoom) => setScale(newZoom / 100)}
                      />
                    </div>
                  </Toolbar>
                ) : undefined}
                <div css={pdfDocumentStyle}>
                  <Document
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    imageResourcesPath={`https://unpkg.com/pdfjs-dist@${pdfjs.version}/web/images/`}
                    options={{
                      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                      cMapPacked: true,
                      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts`,
                    }}
                  >
                    <Page
                      scale={scale}
                      renderInteractiveForms={false}
                      pageNumber={pageNumber}
                      width={size.width ?? undefined}
                      height={size.height ?? undefined}
                    />
                  </Document>
                </div>
              </Card>
            )}
          />
        </Theme>
      </div>
    </>
  );
}
