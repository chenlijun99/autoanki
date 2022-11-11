import type { AutoankiMediaFile } from '@autoanki/core';
import assert from '@autoanki/utils/assert.js';

import { hashContent } from './hash.js';

/**
 * See https://docs.ankiweb.net/templates/styling.html#installing-fonts
 */
const ANKI_DONT_REFERENCE_COUNT_PREFIX = '_';
const AUTOANKI_MEDIA_PREFIX = 'autoanki' as const;

export const ANKI_MAX_FILENAME_LENGTH = 120 as const;

const ACTUAL_FILENAME_MAX_LENGTH =
  ANKI_MAX_FILENAME_LENGTH -
  // sha-1
  40 -
  // delimiter
  1 -
  AUTOANKI_MEDIA_PREFIX.length -
  // delimiter
  1 -
  // Initial underscore, which may be included if actual filename starts with underscore
  1;

/**
 * Metadata of an Autoanki media file.
 *
 * It is fully encoded inside the media file's filename stored in Anki.
 */
export interface MediaFileMetadata {
  /**
   * The complete filename as it is stored in Anki
   */
  storedFilename: string;
  /**
   * The true filename of the media file, comprised of name of plugin from
   * which the media originated + filename of the media itself.
   *
   * It shouldn't be useful in any way for Autoanki...
   * It may also be truncated due to filename length limit imposed by Anki.
   * See https://github.com/ankitects/anki/blob/68fa661b532ef965e72357c2876636271f01fa67/rslib/src/media/files.rs#L24-L28
   *
   * But anyway, keeping the (even truncated) actual filename is useful for the
   * user to have an idea of media file.
   */
  truncatedActualFilename: string;
  /**
   * Digest of the media file
   */
  digest: string;
}

/**
 * Truncate the filename trying to keep the extension and at least one
 * character of basename.
 */
function truncateActualFilename(filename: string): string {
  const encodedLength = encodeURIComponent(filename).length;
  let toBeStripped = 0;
  if (encodedLength > ACTUAL_FILENAME_MAX_LENGTH) {
    toBeStripped = encodedLength - ACTUAL_FILENAME_MAX_LENGTH;
  }
  const basenameLength = filename.lastIndexOf('.');
  if (basenameLength - 1 >= toBeStripped) {
    return (
      filename.slice(0, basenameLength - toBeStripped) +
      filename.slice(basenameLength)
    );
  }
  return filename.slice(0, -toBeStripped);
}

/**
 * From https://stackoverflow.com/a/17109094
 */
function stripUnmatchedSurrogates(str: string): string {
  return str.replace(/[\u{D800}-\u{DFFF}]/gu, '');
}

var filenameMetadataPrefixRegex = new RegExp(
  `^_?(${AUTOANKI_MEDIA_PREFIX})_([0-9a-fA-F]{40})_(.*)$`
);

/**
 * Returns undefined if the filename is not valid
 */
export function parseMediaFileMetadataDataFromFilename(
  filename: string
): MediaFileMetadata | undefined {
  const decoded = decodeURIComponent(filename);
  const match = filenameMetadataPrefixRegex.exec(decoded);
  if (match) {
    return {
      storedFilename: filename,
      digest: match[2],
      truncatedActualFilename: match[3],
    };
  }
}

export async function computeMediaFileMetadataFromMediaFile(
  fromPluginName: string,
  mediaFile: AutoankiMediaFile
): Promise<MediaFileMetadata> {
  assert(fromPluginName.length > 0);
  assert(mediaFile.filename.length > 0);

  let hasSpecialPrefix = false;
  if (mediaFile.filename[0] === ANKI_DONT_REFERENCE_COUNT_PREFIX) {
    hasSpecialPrefix = true;
  }

  const digest = await hashContent(mediaFile.base64Content);

  // strip from input plugin name and filename
  let truncatedActualFilename = stripUnmatchedSurrogates(
    `${fromPluginName}_${mediaFile.filename}`
  );
  // truncate
  truncatedActualFilename = truncateActualFilename(truncatedActualFilename);
  // The truncation could have introduced other unmatched surrogate. Strip again.
  truncatedActualFilename = stripUnmatchedSurrogates(truncatedActualFilename);

  const encodedFilename = encodeURIComponent(
    `${
      hasSpecialPrefix ? ANKI_DONT_REFERENCE_COUNT_PREFIX : ''
    }${AUTOANKI_MEDIA_PREFIX}_${digest}_${truncatedActualFilename}`
  );

  assert(
    encodedFilename.length <= ANKI_MAX_FILENAME_LENGTH,
    `"${encodedFilename}"'s length (${encodedFilename.length}) exceeds ${ANKI_MAX_FILENAME_LENGTH}'`
  );
  return {
    storedFilename: encodedFilename,
    truncatedActualFilename,
    digest,
  };
}
