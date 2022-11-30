/**
 * @file Media files related logic
 */
import { z } from 'zod';
import assert from '@autoanki/utils/assert.js';
import { hashContent } from '@autoanki/utils/hash.js';
import { hashContentSync } from '@autoanki/utils/hash-sync.js';

/**
 * See https://docs.ankiweb.net/templates/styling.html#installing-fonts
 */
const ANKI_DONT_REFERENCE_COUNT_PREFIX = '_';
export const AUTOANKI_MEDIA_PREFIX = 'autoanki' as const;

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

export const autoankiMediaFileMetadataSchema = z
  .object({
    /**
     * The complete filename as it is stored in Anki
     */
    storedFilename: z.string(),
    /**
     * Digest of the media file
     */
    digest: z.string(),
  })
  .strict();

/**
 * Metadata of an Autoanki media file.
 *
 * It is fully encoded inside the media file's filename stored in Anki.
 */
export type AutoankiMediaFileMetadata = z.infer<
  typeof autoankiMediaFileMetadataSchema
>;

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
export function parseMediaFileMetadataFromFilename(
  filename: string
): AutoankiMediaFileMetadata | undefined {
  const decoded = decodeURIComponent(filename);
  const match = filenameMetadataPrefixRegex.exec(decoded);
  if (match) {
    return {
      storedFilename: filename,
      digest: match[2],
    };
  }
}

function computeMediaFileMetadataHelper(
  fromPluginName: string,
  mediaFile: RawAutoankiMediaFile,
  mediaFileDigest: string
): AutoankiMediaFileMetadata {
  assert(fromPluginName.length > 0);
  assert(mediaFile.filename.length > 0);

  let hasSpecialPrefix = false;
  if (mediaFile.filename[0] === ANKI_DONT_REFERENCE_COUNT_PREFIX) {
    hasSpecialPrefix = true;
  }

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
    }${AUTOANKI_MEDIA_PREFIX}_${mediaFileDigest}_${truncatedActualFilename}`
  );

  assert(
    encodedFilename.length <= ANKI_MAX_FILENAME_LENGTH,
    `"${encodedFilename}"'s length (${encodedFilename.length}) exceeds ${ANKI_MAX_FILENAME_LENGTH}'`
  );
  return {
    storedFilename: encodedFilename,
    digest: mediaFileDigest,
  };
}

export function computeMediaFileMetadataSync(
  fromPluginName: string,
  mediaFile: RawAutoankiMediaFile
): AutoankiMediaFileMetadata {
  return computeMediaFileMetadataHelper(
    fromPluginName,
    mediaFile,
    hashContentSync(mediaFile.base64Content)
  );
}

export async function computeMediaFileMetadata(
  fromPluginName: string,
  mediaFile: RawAutoankiMediaFile
): Promise<AutoankiMediaFileMetadata> {
  return computeMediaFileMetadataHelper(
    fromPluginName,
    mediaFile,
    await hashContent(mediaFile.base64Content)
  );
}

export async function computeAutoankiMediaFileFromRaw(
  fromPluginName: string,
  mediaFile: RawAutoankiMediaFile
): Promise<AutoankiMediaFile> {
  return {
    ...mediaFile,
    metadata: await computeMediaFileMetadata(fromPluginName, mediaFile),
  };
}

export function computeAutoankiMediaFileFromRawSync(
  fromPluginName: string,
  mediaFile: RawAutoankiMediaFile
): AutoankiMediaFile {
  return {
    ...mediaFile,
    metadata: computeMediaFileMetadataSync(fromPluginName, mediaFile),
  };
}

export const rawAutoankiMediaFileSchema = z
  .object({
    filename: z.string(),
    base64Content: z.string(),
    mime: z.string().optional(),
  })
  .strict();
export type RawAutoankiMediaFile = z.infer<typeof rawAutoankiMediaFileSchema>;

export const autoankiMediaFileSchema = rawAutoankiMediaFileSchema
  .extend({
    metadata: autoankiMediaFileMetadataSchema,
  })
  .strict();

export type AutoankiMediaFile = z.infer<typeof autoankiMediaFileSchema>;

export const autoankiScriptMediaFileSchema = autoankiMediaFileSchema
  .extend({
    scriptArgs: z.unknown(),
  })
  .strict();

export type AutoankiScriptMediaFile = z.infer<
  typeof autoankiScriptMediaFileSchema
>;
