import { test, fc } from '@fast-check/jest';

import {
  computeMediaFileMetadata,
  parseMediaFileMetadataFromFilename,
  ANKI_MAX_FILENAME_LENGTH,
  computeMediaFileMetadataSync,
} from './media.js';

describe('Metadata encoding/decoding into stored filename', () => {
  const arbitraryPluginName = fc.string({ minLength: 1 });
  const arbitraryMediaFile = fc.record({
    filename: fc.fullUnicodeString({ minLength: 1 }),
    base64Content: fc.string(),
  });

  test.prop([arbitraryPluginName, arbitraryMediaFile])(
    'Metadata is properly encoded in the filename and can be retrieved from filename',
    async (pluginName, mediaFile) => {
      const metadata = await computeMediaFileMetadata(pluginName, mediaFile);
      const metadataFromFileName = parseMediaFileMetadataFromFilename(
        metadata.storedFilename
      );
      return expect(metadataFromFileName).toEqual(metadata);
    }
  );

  test.prop([arbitraryPluginName, arbitraryMediaFile])(
    'Encoded filename length is <= than Anki limits',
    async (pluginName, mediaFile) => {
      const metadata = await computeMediaFileMetadata(pluginName, mediaFile);

      expect(metadata.storedFilename.length).toBeLessThanOrEqual(
        ANKI_MAX_FILENAME_LENGTH
      );
    }
  );

  test.prop([arbitraryPluginName, arbitraryMediaFile])(
    'If actual filename has a leading underscore, also the stored name must have one',
    async (pluginName, mediaFile) => {
      if (mediaFile.filename[0] !== '_') {
        // artifically insert underscore
        mediaFile.filename = '_' + mediaFile.filename;
      }
      const metadata = await computeMediaFileMetadata(pluginName, mediaFile);

      expect(metadata.storedFilename[0]).toBe('_');
    }
  );

  test.prop([arbitraryPluginName, arbitraryMediaFile])(
    'Sync and async version produced the same output',
    async (pluginName, mediaFile) => {
      const metadata = await computeMediaFileMetadata(pluginName, mediaFile);
      const metadataSync = computeMediaFileMetadataSync(pluginName, mediaFile);

      expect(metadataSync).toEqual(metadata);
    }
  );
});
