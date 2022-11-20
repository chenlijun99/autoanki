import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

interface PdfFragmentProps {
  pdfUrl: string;
}

export default function PdfFragment(props: PdfFragmentProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);

  const onDocumentLoadSuccess: Document['props']['onLoadSuccess'] = (pdf) => {
    setNumPages(pdf.numPages);
  };

  return (
    <div>
      <Document
        file={props.pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        options={{
          cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts`,
        }}
      >
        <Page pageNumber={pageNumber} />
      </Document>
      <p>
        Page {pageNumber} of {numPages}
      </p>
    </div>
  );
}
