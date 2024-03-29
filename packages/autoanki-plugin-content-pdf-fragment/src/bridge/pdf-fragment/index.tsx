import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  CSSProperties,
} from 'react';

import { Document, Page, pdfjs, PDFPageProxy } from 'react-pdf';
import { useMeasure } from 'react-use';

import {
  Card,
  css,
  LinearProgress,
  Box,
  Fade,
  ScopedCssBaseline,
} from '@mui/material';

import { CSS_CLASSES, CSS_CUSTOM_PROPERTIES } from '../constants.js';
import Theme from './theme.js';
import Toolbar from './toolbar.js';
import ZoomControl from './zoom-control.js';
import PageControl from './page-control.js';

export interface PdfFragmentProps {
  /**
   * The URL of the PDF. Can contain PDF open parameters.
   */
  pdfUrl: string;
  /**
   * Whether to show the toolbar
   */
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
  /*
   * When the PDF is rotated, the annotation layer is not rotated.
   * Not sure whether it is a feature or bug of react-pdf.
   * Anyway, when the PDF is rotated, the `data-main-rotation` attribute on the
   * annotation layer element is updated. Based on the attribute's value PDF.js
   * as used in Firefox applies the following styles.
   */
  '.react-pdf__Page__annotations.annotationLayer': {
    '&[data-main-rotation="90"]': {
      transform: 'rotate(90deg) translateY(-100%)',
    },
    '&[data-main-rotation="180"]': {
      transform: 'rotate(180deg) translate(-100%, -100%)',
    },
    '&[data-main-rotation="270"]': {
      transform: 'rotate(270deg) translateX(-100%)',
    },
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
    const num = Number.parseInt(item, 10);
    if (Number.isNaN(num)) {
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
        in
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

type PdfFragmentSize = {
  width: number;
  height: number;
};

type OpenParameters = {
  page?: number;
  zoom?: number;
  view?: PdfView;
  viewRect?: PdfRect;
};

function parseOpenParameters(url: string): OpenParameters {
  const params = new URLSearchParams(new URL(url).hash.slice(1));
  const ret: OpenParameters = {};

  const page = params.get('page');
  if (page) {
    const value = Number.parseInt(page, 10);
    if (!Number.isNaN(value)) {
      ret.page = value;
    }
  }

  const zoom = params.get('zoom');
  if (zoom) {
    const value = Number.parseInt(zoom, 10);
    if (!Number.isNaN(value)) {
      ret.zoom = value;
    }
  }

  const view: PdfView | undefined =
    (params.get('view') as PdfView) ?? undefined;
  if (
    typeof view === 'string' &&
    !(PdfViews as readonly string[]).includes(view)
  ) {
    ret.view = view;
  }

  const viewrect = params.get('viewrect');
  ret.viewRect =
    typeof viewrect === 'string' ? parsePdfViewRect(viewrect) : undefined;
  return ret;
}

export default function PdfFragment(props: PdfFragmentProps) {
  /**
   * Extract open parameters from the URL of the PDF.
   */
  const openParameters = useMemo(() => {
    return parseOpenParameters(props.pdfUrl);
  }, [props.pdfUrl]);

  const [numPages, setNumPages] = useState<number>();

  const firstPage = props.pages ? props.pages[0] : openParameters.page ?? 1;

  const [renderingPending, setRenderingPending] = useState<boolean>(true);

  const [currentPageNumber, setCurrentPageNumber] = useState<number>(firstPage);
  const updateCurrentPageNumber = useCallback(
    (page: number) => {
      if (currentPageNumber !== page) {
        setCurrentPageNumber(page);
        setRenderingPending(true);
      }
    },
    [currentPageNumber]
  );

  const [scale, setScale] = useState<number>(1);
  const [userSetScale, setUserSetScale] = useState<number | undefined>();

  const [prevOpenParameters, setPrevOpenParameters] = useState(openParameters);
  if (openParameters !== prevOpenParameters) {
    setPrevOpenParameters(openParameters);

    if (
      openParameters.page &&
      openParameters.page !== prevOpenParameters.page
    ) {
      updateCurrentPageNumber(openParameters.page);
    }
    if (
      openParameters.zoom &&
      openParameters.zoom !== prevOpenParameters.zoom
    ) {
      setScale(openParameters.zoom / 100);
      setUserSetScale(openParameters.zoom / 100);
    }
  }

  const currentPageRect =
    firstPage === currentPageNumber ? openParameters.viewRect : undefined;

  const [currentPage, setCurrentPage] = useState<PDFPageProxy>();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onPageLoadSuccess = useCallback(
    ((page) => {
      setCurrentPage(page);
    }) as NonNullable<Page['props']['onLoadSuccess']>,
    []
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onRenderSuccess = useCallback(
    (() => {
      setRenderingPending(false);
    }) as NonNullable<Page['props']['onRenderSuccess']>,
    []
  );

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

  const pdfFragmentRef = useRef<HTMLDivElement | null>(null);

  const currentPdfFragmentSize: PdfFragmentSize | undefined = useMemo(() => {
    if (currentPageRect || currentPage) {
      const width = (currentPageRect?.width ??
        (currentPage && currentPage.view[2] - currentPage.view[0])) as number;
      /*
       * TODO: should we consider the toolbar height as part of the PDF fragment?
       */
      const height = (currentPageRect?.height ??
        (currentPage && currentPage.view[3] - currentPage.view[1])) as number;
      let rotateSwapsAxis = false;

      // handle PDF default rotation
      if (currentPage?.rotate) {
        rotateSwapsAxis = (currentPage.rotate / 90) % 2 !== 0;
      }
      return {
        width: rotateSwapsAxis ? height : width,
        height: rotateSwapsAxis ? width : height,
      };
    }
  }, [currentPage, currentPageRect]);

  const userDesiredSize: PdfFragmentSize | undefined = useMemo(() => {
    if (currentPdfFragmentSize && userSetScale) {
      return {
        width: currentPdfFragmentSize.width * userSetScale,
        height: currentPdfFragmentSize.height * userSetScale,
      };
    }
    return currentPdfFragmentSize;
  }, [currentPdfFragmentSize, userSetScale]);

  /**
   * Handle view fitting the parent container
   */
  const [divWithContainerSizeRef, containerSize] = useMeasure();
  useEffect(() => {
    if (openParameters.view && currentPdfFragmentSize) {
      const xScaling = containerSize.width / currentPdfFragmentSize.width;
      const yScaling = containerSize.height / currentPdfFragmentSize.height;

      if (openParameters.view === 'FitH' || openParameters.view === 'FitBH') {
        setScale(xScaling);
      }
      if (openParameters.view === 'FitV' || openParameters.view === 'FitBV') {
        setScale(yScaling);
      }
      if (openParameters.view === 'Fit' || openParameters.view === 'FitB') {
        setScale(Math.min(xScaling, yScaling));
      }
    }
  }, [openParameters.view, containerSize, currentPdfFragmentSize]);

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
      const heightValue = getComputedStyle(pdfFragmentDiv)
        .getPropertyValue(CSS_CUSTOM_PROPERTIES.HEIGHT)
        .trim();
      const widthValue = getComputedStyle(pdfFragmentDiv)
        .getPropertyValue(CSS_CUSTOM_PROPERTIES.WIDTH)
        .trim();

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
  }, [pdfFragmentRef, pdfFragmentDivRefSetterForMeasure]);
  useEffect(() => {
    if (
      !!pdfAutoscaleAxis &&
      pdfFragmentDivSize.width &&
      currentPdfFragmentSize &&
      /*
       * Only start autoscaling when the PDF rendering has finished
       */
      !renderingPending
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
  }, [
    pdfAutoscaleAxis,
    pdfFragmentDivSize,
    currentPdfFragmentSize,
    renderingPending,
  ]);

  /**
   * Handle viewrect
   *
   * Why use callback ref + useState instead of just useRef?
   * Well, we need to run the effect when the div is rendered.
   * But we can't put ref.current in the useEffect dependency array.
   *
   * See https://stackoverflow.com/a/60476525
   * and https://tkdodo.eu/blog/avoiding-use-effect-with-callback-refs
   */
  const [clipContainerDiv, setClipContainerDiv] = useState<
    HTMLDivElement | undefined
  >();
  const clipContainerRef = useCallback((node: HTMLDivElement) => {
    setClipContainerDiv(node);
  }, []);

  useEffect(() => {
    if (clipContainerDiv && !renderingPending) {
      const div = clipContainerDiv;
      if (currentPageRect) {
        div.style.height = `${currentPageRect.height * scale}px`;
        div.style.width = `${currentPageRect.width * scale}px`;
        div.style.overflow = 'hidden';
        div.scrollTo(currentPageRect.x * scale, currentPageRect.y * scale);
      } else {
        // set default style
        div.style.height = `auto`;
        div.style.width = `auto`;
        div.style.overflow = 'visible';
      }
    }
  }, [currentPageRect, scale, clipContainerDiv, renderingPending]);

  const SizedLoader = useCallback(() => {
    /*
     * We assume all the pages of a PDF have the same size.
     * If this assumption is true, sizing the loader with `currentPdfFragmentSize`
     * let's us avoid layout shift when loading new pages.
     */
    return (
      <Loader
        width={currentPdfFragmentSize?.width ?? props.width}
        height={currentPdfFragmentSize?.width ?? props.height}
      />
    );
  }, [props.width, props.height, currentPdfFragmentSize]);

  return (
    <ScopedCssBaseline>
      <Theme>
        {/*
         * This div should occupy the same space of its parent
         */}
        <ConditionalWrapper
          condition={openParameters.view !== undefined}
          // TODO: revisit this eslint disable
          // eslint-disable-next-line react/no-unstable-nested-components
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
                  ? userDesiredSize?.width ?? 'fit-content'
                  : 'fit-content',
              height:
                pdfAutoscaleAxis === 'width'
                  ? userDesiredSize?.height ?? 'fit-content'
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
                  // This toolbar contains Material-UI components that open
                  // menus wich lock scrolling and which add some padding
                  // to account for the scrollbar.
                  // However, for some reason, the padding is applied also
                  // to this element (observed in Chrome, but not in Firefox).
                  // The latter padding causes layout-shift in the toolbar.
                  // See also https://github.com/mui/material-ui/issues/17353
                  paddingRight: '0 !important',
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
                    /*
                     * Why not use first-child? To suppress warning from
                     * emotion.js.
                     *
                     * > The pseudo class ":first-child" is potentially unsafe
                     * > when doing server-side rendering.
                     * > Try changing it to ":first-of-type".
                     */
                    '& > div:first-of-type': {
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
                    page={currentPageNumber}
                    numPages={numPages}
                    allowedPages={props.pages}
                    onPageChanged={(newPageNumber) =>
                      updateCurrentPageNumber(newPageNumber)
                    }
                  />
                  <ZoomControl
                    zoom={scale * 100}
                    onZoomChanged={(newZoom) => {
                      setScale(newZoom / 100);
                      setUserSetScale(newZoom / 100);
                    }}
                  />
                </div>
              </Toolbar>
            ) : undefined}
            <div css={pdfDocumentStyle}>
              <Document
                loading={<SizedLoader />}
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                imageResourcesPath={`https://unpkg.com/pdfjs-dist@${pdfjs.version}/web/images/`}
                options={{
                  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                  cMapPacked: true,
                  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts`,
                }}
              >
                <div
                  className="pdf-fragment-view-rect-container"
                  ref={clipContainerRef}
                >
                  <Page
                    loading={<SizedLoader />}
                    scale={scale}
                    onLoadSuccess={onPageLoadSuccess}
                    onRenderSuccess={onRenderSuccess}
                    renderInteractiveForms={false}
                    pageNumber={currentPageNumber}
                  />
                </div>
              </Document>
            </div>
          </Card>
        </ConditionalWrapper>
      </Theme>
    </ScopedCssBaseline>
  );
}
