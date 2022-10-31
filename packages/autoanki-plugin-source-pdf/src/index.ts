import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.js';

export default class PdfSource {
  async extractNotes(pdfUrl: URL) {
    // Will be using async/await to load document, pages and misc data.
    const pdf = await pdfjs.getDocument(pdfUrl).promise;
  }
}

let a = new PdfSource();
let url = new URL(
  'file:///home/lijun/Repositories/personal/autoanki/packages/autoanki-plugin-pdf-source/tests/pdfs/mapreduce-osdi04.pdf'
);
a.extractNotes(url);
