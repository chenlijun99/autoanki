# @autoanki/autoanki-plugin-content-pdf-fragment

This plugin injects the necessary JavaScript to dynamically render PDF (fragments) referenced inside Anki notes.

## Usage

You can include PDFs using the HTML5 `object` tag and its `data` attribute.

```html
<object data="path to pdf"></object>
```

You can also use PDF open parameters to control which portion of the PDF is rendered.

The following PDF open parameters are supported:

- `page`

Additionally, you can also pass the following `data-*` attributes:

- `data-autoanki-pdf-pages`: an numeric range of pages to be rendered.

So a complete example could be:

```html
<object data="mydocument.pdf#page=2" data-autoanki-pdf-pages="2-5,7"></object>
```

With this, the PDF is initially rendered at page 2 and then you can switch using the toolbar to between pages 2-5 and page 7.

## Design principles

- By default, try to keep the rendered PDF as simple as possible. We rarely need a full-blown PDF reader in our card, using which we can scroll through pages, see the table of contents, the bookmarks, etc. What IMHO we need most often is to render some fragment of a PDF (often even a full page of a book is too much for an Anki card), just as if we had taken a screenshot of that fragment and copied it over Anki. The advantages that this plugin brings on the table are:
  - Spare media folder storage space. Most often having many screenshots of a PDF takes more space than having the full PDF stored in Anki and then having a PDF rendered dynamically show the specified fragment of the PDF
  - Sync updates to the PDF via [@autoanki/sync](../autoanki-sync).
    - For example you are a heavy user of PDF annotations. After you update an annotation, just resync and the up-to-date PDF will be copied to Anki and next time the cards will render the PDF fragments with your new annotations.
  - Working with copyrighted materials.

## Styling

- See constants in the `CSS_CLASSES` dictionary in [constants.ts](./src/bridge/constants.ts).

## Caveats

### Rendering some annotations requires access to the Internet

For annotations such as "sticky notes", the PDF rendering engine needs to download some SVG icons from the Internet.

### Rendering some PDFs requires access to the Internet

Rendering of legacy PDF with non-latin characters requires cmaps.

Examples of such PDFs:

- https://www.kurims.kyoto-u.ac.jp/~terui/pssj.pdf

It's a lot of assets to move in the Anki media folder and the PDF rendering engine (PDF.js) expects them to be grouped in a folder, but Anki doesn't support to have folders in the media folder. Thus, we configured the PDF rendering engine such that it downloads these assets from Internet when required, at the cost of making the life of users harder. We thought that caching could mitigate this problem, but unfortunately it appears that Anki's webview doesn't persist the cache across application restarts (which is [confirmed also by other users](https://forums.ankiweb.net/t/how-to-pre-load-the-iframe-html-tags-in-the-back-of-cards/20542/9)).

## Possible future work

- Allow PDF fragments to be pre-rendered, meaning that what actually ends up in Anki are just images. Then it is truly as if we had taken a screenshot of the PDF fragment.
