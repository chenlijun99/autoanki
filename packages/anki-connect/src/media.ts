/**
 * @file Media file related anki connect actions
 *
 * See https://github.com/FooSoft/anki-connect/blob/master/actions/media.md
 */

/**
 * Data type of a Anki media file
 *
 * NOTE: at least one property between `data`, `path` and `url` is required.
 *
 * For more information, see
 * https://foosoft.net/projects/anki-connect/index.html#media-actions
 */
export interface MediaFile {
  /**
   * The file name of the media file
   */
  filename: string;
  /**
   * The skipHash field can be optionally provided to skip the inclusion of
   * files with an MD5 hash that matches the provided value. This is useful
   * for avoiding the saving of error pages and stub files, e.g. when
   * fetching the media file via an URL.
   */
  skipHash?: string;
  /**
   * Any existing file with the same name is deleted by default. Set
   * deleteExisting to false to prevent that by letting Anki give the new file
   * a non-conflicting name (e.g. by appending the hash of the file to the file
   * name).
   */
  deleteExisting?: boolean;
  /**
   * base64-encoded contents of the media file
   */
  data?: string;
  /**
   * If this is specified and `data` is not specified, Anki-connect will load
   * the media file content from the specified path in the local filesystem.
   */
  path?: string;
  /**
   * If this is specified and `data` and `path` are not specified, Anki-connect
   * will download the media file content from the specified URL.
   */
  url?: string;
}

export type ActionsToPayloadMap = {
  /**
   * Stores a file with the specified base64-encoded contents inside the media
   * folder
   *
   * Alternatively you can specify a absolute file path, or a url from where
   * the file shell be downloaded. If more than one of data, path and url are
   * provided, the data field will be used first, then path, and finally url.
   * To prevent Anki from removing files not used by any cards (e.g. for
   * configuration files), prefix the filename with an underscore.
   *
   * These files are still synchronized to AnkiWeb. Any existing file with the
   * same name is deleted by default. Set deleteExisting to false to prevent
   * that by letting Anki give the new file a non-conflicting name.
   */
  storeMediaFile: {
    6: {
      request: MediaFile;
      response: string;
    };
  };
  /**
   * Retrieves the base64-encoded contents of the specified file, returning
   * false if the file does not exist.
   */
  retrieveMediaFile: {
    6: {
      request: {
        filename: string;
      };
      response: string | false;
    };
  };
  /**
   * Gets the names of media files matched the pattern. Returning all names by
   * default.
   */
  getMediaFilesNames: {
    6: {
      request: {
        pattern: string;
      };
      response: string[];
    };
  };
  /**
   * Deletes the specified file inside the media folder.
   */
  deleteMediaFile: {
    6: {
      request: {
        filename: string;
      };
      response: null;
    };
  };
};
