export const CSS_CLASSES = {
  /**
   * The class applied to the PDF fragment. Style it as you would with `<img>`
   *
   * E.g.
   *
   * ```css
   * .autoanki-pdf-fragment {
   *   // your styles
   * }
   * ```
   */
  PDF_FRAGMENT: 'autoanki-pdf-fragment',
} as const;

export const CSS_CUSTOM_PROPERTIES = {
  /**
   * Set `--autoanki-pdf-fragment-height: auto` so that the PDF fragment
   * is rescaled to fit the current assigned width.
   *
   * It similar to `height: auto;` on a `<img>` tag.
   */
  HEIGHT: '--autoanki-pdf-fragment-height',
  /**
   * Set `--autoanki-pdf-fragment-width: auto` so that the PDF fragment
   * is rescaled to fit the current assigned height.
   *
   * It similar to `width: auto;` on a `<img>` tag.
   */
  WIDTH: '--autoanki-pdf-fragment-width',
} as const;
