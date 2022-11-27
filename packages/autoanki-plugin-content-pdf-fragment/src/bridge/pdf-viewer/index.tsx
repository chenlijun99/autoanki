import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  CSSProperties,
} from 'react';

import { Document, Page, pdfjs, PDFPageProxy } from 'react-pdf';
import { useMeasure } from 'react-use';

import { Card, css, LinearProgress, Box, Fade } from '@mui/material';

import { CSS_CLASSES, CSS_CUSTOM_PROPERTIES } from '../constants.js';
import Theme from './theme.js';
import Toolbar from './toolbar.js';
import ZoomControl from './zoom-control.js';
import PageControl from './page-control.js';

export interface PdfFragmentProps {
  pdfUrl: string;
  enableToolbar?: boolean;
  /**
   * The instrinsict width of the PDF fragment what will be shown.
   * Use this to avoid layout-shift when the PDF fragment loads.
   */
  width?: number;
  /**
   * The instrinsict height of the PDF fragment what will be shown.
   * Use this to avoid layout-shift when the PDF fragment loads.
   */
  height?: number;
  /**
   * Ordered list of pages that should be shown
   */
  pages?: number[];
  style?: CSSProperties;
  className?: string;
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

/**
 * Source: https://blog.hackages.io/conditionally-wrap-an-element-in-react-a8b9a47fab2
 */
interface Props extends React.PropsWithChildren {
  condition: boolean;
  wrapper: React.FC<React.PropsWithChildren>;
}
const ConditionalWrapper: React.FC<Props> = ({
  condition,
  wrapper,
  children,
}) => {
  return condition ? wrapper({ children }) : <>{children}</>;
};

const PdfViews = ['Fit', 'FitB', 'FitH', 'FitBH', 'FitV', 'FitBV'] as const;
type PdfView = typeof PdfViews[number];

interface PdfRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function parsePdfViewRect(viewRect: string): PdfRect | undefined {
  const items = viewRect.split(',');
  if (items.length !== 4) {
    return;
  }
  const coerced = [];
  for (const item of items) {
    const num = Number.parseInt(item);
    if (num === Number.NaN) {
      return;
    }
    coerced.push(num);
  }

  return {
    x: coerced[0],
    y: coerced[1],
    width: coerced[2],
    height: coerced[3],
  };
}

interface LoaderProps {
  width?: number;
  height?: number;
}

function Loader(props: LoaderProps) {
  return (
    <Box sx={{ width: props.width ?? '100%', height: props.height }}>
      <Fade
        in={true}
        style={{
          // delay appearance of loader by 500ms
          transitionDelay: '500ms',
        }}
        unmountOnExit
      >
        <LinearProgress />
      </Fade>
    </Box>
  );
}

export default function PdfFragment(props: PdfFragmentProps) {
  const [numPages, setNumPages] = useState<number>();

  const [pageNumber, setPageNumber] = useState<number>(
    props.pages ? props.pages[0] : 1
  );
  const [scale, setScale] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<PDFPageProxy>();
  const [pdfView, setPdfView] = useState<PdfView>();
  const [pdfRect, setPdfRect] = useState<PdfRect>();

  /**
   * Extract open parameters from the URL of the PDF
   */
  useEffect(() => {
    const params = new URLSearchParams(new URL(props.pdfUrl).hash.slice(1));
    const page = params.get('page');
    if (page) {
      const value = Number.parseInt(page);
      if (value !== Number.NaN) {
        setPageNumber(value);
      }
    } else {
      setPageNumber(1);
    }

    const newScale = params.get('zoom');
    if (newScale) {
      const value = Number.parseInt(newScale);
      if (value !== Number.NaN) {
        setScale(value / 100);
      }
    } else {
      setScale(1);
    }

    const newPdfView = params.get('view');
    if (
      typeof newPdfView === 'string' &&
      (PdfViews as readonly string[]).includes(newPdfView)
    ) {
      setPdfView(newPdfView as PdfView);
    } else {
      setPdfView(undefined);
    }

    const newPdfRectStr = params.get('viewrect');
    const newPdfRect =
      typeof newPdfRectStr === 'string'
        ? parsePdfViewRect(newPdfRectStr)
        : undefined;
    if (newPdfRect !== undefined && pdfRect !== undefined) {
      if (
        newPdfRect.x !== pdfRect.x ||
        newPdfRect.y !== pdfRect.y ||
        newPdfRect.width !== pdfRect.width ||
        newPdfRect.height !== pdfRect.height
      ) {
        setPdfRect(newPdfRect);
      }
    } else {
      setPdfRect(newPdfRect);
    }
  }, [props.pdfUrl]);

  /*
   * The pdf URL without the hash portion
   */
  const pdfUrl = useMemo(() => {
    /*
     * Strip URL fragment from URL.
     * From https://stackoverflow.com/a/2541083
     */
    return props.pdfUrl.split(/[#?]/)[0];
  }, [props.pdfUrl]);

  const onDocumentLoadSuccess: Document['props']['onLoadSuccess'] = (pdf) => {
    setNumPages(pdf.numPages);
  };

  const onPageLoadSuccess: Page['props']['onLoadSuccess'] = (page) => {
    setCurrentPage(page);
  };

  const pdfFragmentRef = useRef<HTMLDivElement | null>(null);

  const currentPdfFragmentSize:
    | {
        width: number;
        height: number;
      }
    | undefined = useMemo(() => {
    if (pdfRect || currentPage) {
      return {
        width: (pdfRect?.width ??
          (currentPage && currentPage.view[2] - currentPage.view[0])) as number,
        /*
         * TODO: should we consider the toolbar height as part of the PDF fragment?
         */
        height: (pdfRect?.height ??
          (currentPage && currentPage.view[3] - currentPage.view[1])) as number,
      };
    }
  }, [currentPage, pdfRect]);

  /**
   * Handle view fitting the parent container
   */
  const [divWithContainerSizeRef, containerSize] = useMeasure();
  useEffect(() => {
    if (pdfView && currentPdfFragmentSize) {
      let xScaling = containerSize.width / currentPdfFragmentSize.width;
      let yScaling = containerSize.height / currentPdfFragmentSize.height;

      if (pdfView === 'FitH' || pdfView === 'FitBH') {
        setScale(xScaling);
      }
      if (pdfView === 'FitV' || pdfView === 'FitBV') {
        setScale(yScaling);
      }
      if (pdfView === 'Fit' || pdfView === 'FitB') {
        setScale(Math.min(xScaling, yScaling));
      }
    }
  }, [pdfView, containerSize, currentPdfFragmentSize]);

  /*
   * Handle automatic PDF scaling
   */
  const [pdfAutoscaleAxis, setPdfAutoscaleAxis] = useState<
    'height' | 'width' | undefined
  >();
  const [pdfFragmentDivRefSetterForMeasure, pdfFragmentDivSize] = useMeasure();
  useEffect(() => {
    if (pdfFragmentRef.current) {
      const pdfFragmentDiv = pdfFragmentRef.current;
      const heightValue = getComputedStyle(pdfFragmentDiv).getPropertyValue(
        CSS_CUSTOM_PROPERTIES.HEIGHT
      );
      const widthValue = getComputedStyle(pdfFragmentDiv).getPropertyValue(
        CSS_CUSTOM_PROPERTIES.WIDTH
      );

      let enabled = false;
      if (heightValue === 'auto' && widthValue === 'auto') {
        console.warn(
          `Only one between "${CSS_CUSTOM_PROPERTIES.HEIGHT}" and "${CSS_CUSTOM_PROPERTIES.WIDTH}" can be set to "auto"`
        );
        setPdfAutoscaleAxis(undefined);
      } else if (heightValue === 'auto') {
        setPdfAutoscaleAxis('height');
        enabled = true;
      } else if (widthValue === 'auto') {
        setPdfAutoscaleAxis('width');
        enabled = true;
      } else {
        setPdfAutoscaleAxis(undefined);
      }

      /*
       * If autoscaling is enabled, set the ref for useMeasure, so that
       * we start the ResizeObserver on pdfFragmentRef.
       * If disabled, set the ref to undefined, so that the ResizeObserver is
       * stopped.
       */
      if (enabled) {
        pdfFragmentDivRefSetterForMeasure(pdfFragmentRef.current);
      } else {
        /*
         * See https://github.com/streamich/react-use/pull/1451
         */
        // @ts-ignore
        pdfFragmentDivRefSetterForMeasure(undefined);
      }
    }
  }, [pdfFragmentRef]);
  useEffect(() => {
    if (
      !!pdfAutoscaleAxis &&
      pdfFragmentDivSize.width &&
      currentPdfFragmentSize
    ) {
      let scaling: number = 1;
      if (pdfAutoscaleAxis === 'height') {
        scaling = pdfFragmentDivSize.width / currentPdfFragmentSize.width;
      }
      if (pdfAutoscaleAxis === 'width') {
        scaling = pdfFragmentDivSize.height / currentPdfFragmentSize.height;
      }
      setScale(scaling);
    }
  }, [pdfAutoscaleAxis, pdfFragmentDivSize, currentPdfFragmentSize]);

  /**
   * Handle viewrect
   */
  const clipContainerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (pdfRect && clipContainerRef.current) {
      const div = clipContainerRef.current;
      div.style.height = `${pdfRect.height * scale}px`;
      div.style.width = `${pdfRect.width * scale}px`;
      div.style.overflow = 'hidden';
      div.scrollTo(pdfRect.x * scale, pdfRect.y * scale);
    }
  }, [currentPage, pdfRect, scale]);

  return (
    <>
      {
        /*
         * Don't include this. It's too "invasive" and "opinionated" for Anki.
         * What I mean is that e.g. it forces the margin on the body tag.
         * This may be very strange for Anki users who are used to this.
         */
        // <CssBaseline />
      }
      <Theme>
        {/*
         * This div should occupy the same space of its parent
         */}
        <ConditionalWrapper
          condition={pdfView !== undefined}
          wrapper={({ children }) => (
            <div
              /* @ts-ignore */
              ref={divWithContainerSizeRef}
              style={{ width: '100%', height: '100%' }}
            >
              {children}
            </div>
          )}
        >
          <Card
            className={CSS_CLASSES.PDF_FRAGMENT + ' ' + (props.className ?? '')}
            elevation={3}
            css={{
              /*
               * Default style that can be overidden via CSS
               *
               * What's the logic behind this code?
               *
               * By default just set width and height to `fit-content`, so that
               * the card fits the content of the PDF page.
               * However, if autoscale on one axis is enabled, by default
               * we explicitly set the size of the opposite axis to the
               * original size of the PDF fragment that is being shown.
               *
               * At first thought `fit-content` and explicitly setting
               * the size should be the same, but actually there are the
               * following reasons for using each of them in different cases:
               *
               * * Explicitly setting the size doesn't take into account the
               * size of scrollbars. So e.g. if width is set explicitly to 500px but
               * the vertical axis has been constrained and requires a scrollbar,
               * the vertical scrollbar takes some space and leads to a horizontal
               * scrollbar, since now the card content width would be, let's say,
               * 496px (if the scroolbar is 4px wide).
               * That's why we use `fit-content` when not auto scaling.
               * When autoscaling it's not a problem, since autoscaling by design
               * avoids scrollbars to appear.
               * * We achieve autoscaling by tuning the PDF's scaling.
               * But actually when using scaling, `fit-content` and the explicit
               * size of the fragment are no more equivalent
               * (even ignoring to story about the scrollbar).
               * `fit-content` just keeps the scaled content, while setting
               * the explicit size let's the card have the unscaled size,
               * unless constrained by other styles such as `max-width`,
               * `min-width`, etc.
               * E.g. with `fit-content`, once we descale the PDF it doesn't
               * grow back, because for autoscaling we monitor the size of this
               * element. but with `fit-content`, once the PDF is descaled
               * it just keeps that size.
               *
               * Obviously, this is just the default style and users
               * can override it (e.g. to set fixed width and/or height) with
               * custom CSS.
               */
              width:
                pdfAutoscaleAxis === 'height'
                  ? currentPdfFragmentSize?.width ?? 'fit-content'
                  : 'fit-content',
              height:
                pdfAutoscaleAxis === 'width'
                  ? currentPdfFragmentSize?.height ?? 'fit-content'
                  : 'fit-content',
            }}
            style={{
              // If overflow, then make the PDF fragment scrollable.
              overflow: 'auto',
              ...props.style,
            }}
            ref={pdfFragmentRef}
          >
            {props.enableToolbar ? (
              <Toolbar
                css={{
                  position: 'sticky',
                  // I don't know why, but it is necessary for the toolbar
                  // to be sticky also on horizontal scroll
                  left: 0,
                }}
                scrollContainer={pdfFragmentRef.current}
              >
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
                loading={<Loader width={props.width} height={props.height} />}
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                imageResourcesPath={`https://unpkg.com/pdfjs-dist@${pdfjs.version}/web/images/`}
                options={{
                  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                  cMapPacked: true,
                  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts`,
                }}
              >
                <ConditionalWrapper
                  condition={pdfRect !== undefined}
                  wrapper={({ children }) => (
                    <div ref={clipContainerRef}>{children}</div>
                  )}
                >
                  <Page
                    loading={
                      <Loader width={props.width} height={props.height} />
                    }
                    scale={scale}
                    onLoadSuccess={onPageLoadSuccess}
                    renderInteractiveForms={false}
                    pageNumber={pageNumber}
                  />
                </ConditionalWrapper>
              </Document>
            </div>
          </Card>
        </ConditionalWrapper>
      </Theme>
    </>
  );
}