# @autoanki/autoanki-plugin-content-pdf-fragment

This plugin injects the necessary JavaScript to dynamically render PDF (fragments) referenced inside Anki notes.

## Caveats

### Working with some PDFs requires access to the Internet

Rendering of legacy PDF with non-latin characters requires cmaps. It's a lot of assets to move to mvoe in the Anki media folder and the PDF rendering engine (PDF.js) expects them to be grouped in a folder, but Anki doesn't support folders in the media folder.
