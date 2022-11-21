# Contribution guide

## Notes

- Pay attention to use a version of `pdfjs-dist` that is compatible with the `pdfjs-dist` used by `react-pdf`.
  - We also add `pdfjs-dist` as dependency because we need to bundle, load as base64 and finally transfer to `pdf.worker.js` media file to Anki.
  - Due to limitations in `pnpm`, we can't access the `pdfjs-dist` used by `react-pdf`.
