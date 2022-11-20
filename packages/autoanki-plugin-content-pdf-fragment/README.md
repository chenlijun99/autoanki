# @autoanki/autoanki-plugin-content-pdf-fragment

This plugin injects the necessary JavaScript to dynamically render PDF (fragments) referenced inside Anki notes.

## Caveats

### Rendering some PDFs requires access to the Internet

Rendering of legacy PDF with non-latin characters requires cmaps.

Examples of such PDFs:

- https://www.kurims.kyoto-u.ac.jp/~terui/pssj.pdf

It's a lot of assets to move in the Anki media folder and the PDF rendering engine (PDF.js) expects them to be grouped in a folder, but Anki doesn't support to have folders in the media folder. Thus, we configured the PDF rendering engine such that it downloads these assets from Internet when required, at the cost of making the life of users harder. We thought that caching could mitigate this problem, but unfortunately it appears that Anki's webview doesn't persist the cache across application restarts (which is [confirmed also by other users](https://forums.ankiweb.net/t/how-to-pre-load-the-iframe-html-tags-in-the-back-of-cards/20542/9)).
