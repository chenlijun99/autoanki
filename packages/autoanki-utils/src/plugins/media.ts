/*
 * Anki doesn't expect media file URL to contain query string and/or hash.
 * It basically escapes the whole URL.
 *
 * These constants serve as single point of reference for:
 *
 * * Plugins that rewrite URLs inside HTML: these plugins should store the query
 * string and hash separately inside the data attributes defined here.
 * * Plugins that are interested in the query string and hash of URLs:
 * these plugins should check the value of the data attributes defined here.
 *
 * Probably an architecturally cleaner approach would be to let plugins work
 * with normal URLs and only add a final transformer plugin (e.g. the one in
 * @autoanki/sync) that converts URLs inside the HTML. But, that would mean
 * that that final plugin has to parse the HTML and do this kind of
 * conversion for each Autoanki note.
 * So, we decide to just let each plugin that manipulates or reads URLs
 * deal with this.
 */
export const MEDIA_URL_DATA_ATTRIBUTES = {
  queryString: 'data-autoanki-url-query-string',
  hash: 'data-autoanki-url-hash',
} as const;
