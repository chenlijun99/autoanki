import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { SizeMe, SizeMeProps } from 'react-sizeme';

interface PdfFragmentProps {
  pdfUrl: string;
}

export default function PdfFragment(props: PdfFragmentProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);

  const onDocumentLoadSuccess: Document['props']['onLoadSuccess'] = (pdf) => {
    setNumPages(pdf.numPages);
  };

  /**
   * Inspired by https://github.com/wojtekmaj/react-pdf/issues/129#issuecomment-521905189
   * for auto-sizing the PDF to fit the parent div.
   */
  return (
    <SizeMe
      refreshRate={128}
      refreshMode={'debounce'}
      // @ts-ignore
      render={({ size }: SizeMeProps) => (
        <div>
          <Document
            file={props.pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            imageResourcesPath={`https://unpkg.com/pdfjs-dist@${pdfjs.version}/web/images/`}
            options={{
              cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
              cMapPacked: true,
              standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts`,
            }}
          >
            <Page
              renderInteractiveForms={false}
              width={size.width ?? 1}
              pageNumber={pageNumber}
            />
          </Document>
          <p>
            Page {pageNumber} of {numPages}
          </p>
        </div>
      )}
    />
  );
}
