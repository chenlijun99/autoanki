export const DOMConstants = {
  /*
   * Anki doesn't expect media file URL to contain query string and/or hash.
   * It basically escapes the whole URL.
   *
   * Therefore, while extracting the local media file, this plugin saves
   * the original query and hash string in the following attributes.
   */
  dataAttributeOriginalQueryString:
    'data-autoanki-plugin-content-local-media-extractor-original-query-string',
  dataAttributeOriginalHash:
    'data-autoanki-plugin-content-local-media-extractor-original-hash',
} as const;
