/**
 * @file Media file related anki connect actions
 *
 * See https://github.com/FooSoft/anki-connect/blob/master/actions/media.md
 */

/**
 * See https://stackoverflow.com/questions/48230773/how-to-create-a-partial-like-that-requires-a-single-property-to-be-set/48244432
 */
type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> &
  U[keyof U];

interface PartialMediaFile {
  data: string;
  path: string;
  url: string;
}

export type MediaFile = AtLeastOne<PartialMediaFile> & { filename: string };
