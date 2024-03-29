export { configSchema } from './config.js';
export type { Config, ConfigPluginInstance } from './config.js';

export type {
  AutoankiPlugin,
  AutoankiPluginApi,
  SourcePlugin,
  TransformerPlugin,
  SourcePluginParsingOutput,
  TransformerPluginOutput,
} from './plugin.js';
export { getPluginName, isPlugin } from './plugin.js';

export {
  extractAutoankiNotes,
  groupAutoankiNotesBySourcePluginAndInput,
  writeBackAutoankiNoteUpdates,
  transformAutoankiNote,
  assignIdsToAutoankiNotes,
  AUTOANKI_NOTES_DEFAULT_TAG,
} from './notes.js';
export type {
  AutoankiNote,
  NoteInput,
  NoteInputs,
  LazyNoteInputs,
  ParsedNote,
} from './notes.js';

export {
  computeMediaFileMetadataSync,
  computeMediaFileMetadata,
  computeAutoankiMediaFileFromRaw,
  computeAutoankiMediaFileFromRawSync,
  parseMediaFileMetadataFromFilename,
  AUTOANKI_MEDIA_PREFIX,
} from './media.js';
export type {
  RawAutoankiMediaFile,
  AutoankiMediaFile,
  AutoankiMediaFileMetadata,
  AutoankiScriptMediaFile,
} from './media.js';

export { setLogger, consoleLogger } from './logger.js';
export type { RootLogger, Logger } from './logger.js';
