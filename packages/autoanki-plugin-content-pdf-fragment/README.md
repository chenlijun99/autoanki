# @autoanki/autoanki-plugin-content-pdf-fragment

This plugin injects the necessary JavaScript to dynamically render PDF (fragments) referenced inside Anki notes.

## Usage

You can include PDFs using the HTML5 `object` tag and its `data` attribute.

```html
<object data="path to pdf"></object>
```

### PDF open parameters.

You can also use [PDF open parameters](https://pdfobject.com/pdf/pdf_open_parameters_acro8.pdf#page=5&zoom=100,0,600) to control which portion of the PDF is rendered and the sizing of the PDF fragment.

The following PDF open parameters are supported:

- `page=<pagenum>`: display the PDF at the specified page
- `view=Fit` or `view=FitB`:

  > Display the page, with its contents magnified just enough to fit its bounding box entirely within the window both horizontally and vertically. If the required horizontal and vertical magnification factors are different, use the smaller of the two, centering the bounding box within the window in the other dimension

  NOTE that when using this open parameter, the container must have an explicitly set width and height.

- `view=FitH[,<top>]` or `view=FitBH[,<top>]`

  > Display the page with the vertical coordinate `top` positioned at the top edge of the window and the contents of the page magnified just enough to fit the entire width of its bounding box within the window. A null value for top specifies that the current value of that parameter is to be retained un changed.

  NOTE that when using this open parameter, the container must have an explicitly set width.

- `view=FitV[,<left>]` or `view=FitBV[,<left>]`

  > Display the page designated by page, with the horizontal coordinate `left` positioned at the left edge of the window and the contents of the page magnified just enough to fit the entire height of its bounding box within the window. A null value for left specifies that the current value of that parameter is to be retained unchanged

  NOTE that when using this open parameter, the container must have an explicitly set height.

- `viewrect=left,top,wd,ht`

  > Sets the view rectangle using float or integer values in a coordinate system where 0,0 represents the top left corner of the visible page, regardless of document rotation.

NOTE that `view=Fit*` and `view=FitB*` are handled in the same way. In the [PDF reference](https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/pdfreference1.7old.pdf) `` view=Fit*` should be relative to the window while and `view=FitB* `` should be relative to the bounding box (i.e. the parent container). In our case the PDF is always inside a bounding box within the window.

NOTE also that:

> Coordinate values (such as <left>, <right>, and <width>) are expressed in the default user space coordinate system of the document: 1/72 of an inch measured down and to the right from the upper left corner of the (current) page ([ISOPDF2] 8.3.2.3 "User Space").

Source https://datatracker.ietf.org/doc/html/rfc8118

### Additional data attributes

Additionally, you can also pass the following `data-*` attributes:

- `data-autoanki-pdf-pages`: an numeric range of pages to be rendered. Note that order matters. `data-autoanki-pdf-pages="2-4"` and `data-autoanki-pdf-pages="4-2"` are different. With the first pressing the next button you'll go through the pages 2, 3 and 4, while with the latter you'll go through the pages 4,3,2.

So a complete example could be:

```html
<object
  data="mydocument.pdf#page=2&viewrect=0,0,300,300"
  data-autoanki-pdf-pages="2-5,7"
></object>
```

With this, the fragment (0pt,0pt,300pt,300pt) of the PDF's 2nd page is shown and then you can switch using the toolbar between pages 2-5 and page 7.

## Styling

```css
.autoanki-pdf-fragment {
  /*
   * Your CSS.
   * Style it as  you would style an `img`.
   *
   * Only exceptions,
   *
   * - if you want to use `height: auto;` use  `--autoanki-pdf-fragment-height: auto;` instead.
   * - if you want to use `width: auto;` use  `--autoanki-pdf-fragment-width: auto;` instead.
   */
}
```

Docs may be outdated, for the source of truth see constants in the `CSS_CLASSES` and `CSS_CUSTOM_PROPERTIES` dictionaries in [constants.ts](./src/bridge/constants.ts).

## Design principles

- By default, try to keep the rendered PDF as simple as possible. We rarely need a full-blown PDF reader in our card, using which we can scroll through pages, see the table of contents, the bookmarks, etc. What IMHO we need most often is to render some fragment of a PDF (often even a full page of a book is too much for an Anki card), just as if we had taken a screenshot of that fragment and copied it over Anki. The advantages that this plugin brings on the table are:
  - Spare media folder storage space. Most often having many screenshots of a PDF takes more space than having the full PDF stored in Anki and then having a PDF rendered dynamically show the specified fragment of the PDF.
  - No need to take screenshots manually, thanks to [@autoanki/sync](../autoanki-sync).
    - Sync updates to the PDF via [@autoanki/sync](../autoanki-sync). For example you are a heavy user of PDF annotations. After you update an annotation, just resync and the up-to-date PDF will be copied to Anki and next time the cards will render the PDF fragments with your new annotations.
  - Working with copyrighted materials.

### Consequences of the image analogy

- By default a PDF fragment is rendered at its default size.
- What if a PDF fragment is too wide for its container (i.e. the card's view)?
  - It overflows the container.
  - For some people it may be ok.
  - Otherwise, just like with `<img>`, you may consider to add styles `max-width: 100%;`
    - Using this on `<img>` causes the image to be squished horizontally if it's wider than the parent container.
      - People often use `height: auto;` so that `<img>` so that the browser squishes the image also vertically, so that the aspect ratio of the original image is kept. See https://web.dev/optimize-cls/#modern-best-practice.
    - Using this on the PDF fragment causes the PDF fragment to be horizontally scrollable.
      - You may also use `--autoanki-pdf-fragment-height: auto;` on `.autoanki-pdf-fragment` so that the whole PDF is zoomed out to fit the width of the parent container, ultimately keeping the aspect ratio of the original PDF.

## Caveats

### Rendering some PDFs requires access to the Internet

Rendering of legacy PDF with non-latin characters requires cmaps.

Examples of such PDFs:

- https://www.kurims.kyoto-u.ac.jp/~terui/pssj.pdf

The whole set of cmaps resources is a lot of assets to move in the Anki media folder and the PDF rendering engine (PDF.js) expects them to be grouped in a folder, but Anki doesn't support to have folders in the media folder. Thus, we configured the PDF rendering engine such that it downloads these assets from Internet when required, at the cost of making the life of users harder. We thought that caching could mitigate this problem, but unfortunately it appears that Anki's webview doesn't persist the cache across application restarts (which is [confirmed also by other users](https://forums.ankiweb.net/t/how-to-pre-load-the-iframe-html-tags-in-the-back-of-cards/20542/9)).

### Rendering some annotations requires access to the Internet

For annotations such as "sticky notes", the PDF rendering engine needs to download some SVG icons from the Internet.

## Possible future work

- Allow PDF fragments to be pre-rendered, meaning that what actually ends up in Anki are just images. Then it is truly as if we had taken a screenshot of the PDF fragment.
