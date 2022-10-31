export { configSchema } from './config.js';
export type { Config, ConfigPluginInstance } from './config.js';
export type {
  AutoankiPlugin,
  SourcePlugin,
  TransformerPlugin,
  SourcePluginParsingOutput,
  TransformerPluginOutput,
} from './plugin.js';
export {
  extractAutoankiNotes,
  groupAutoankiNotesBySourcePluginAndInput,
  writeBackAutoankiNoteUpdates,
  transformAutoankiNote,
  assignIdsToAutoankiNotes,
  AUTOANKI_NOTES_DEFAULT_TAG,
} from './notes.js';
export type { MediaFile } from './media.js';
export type {
  AutoankiNote,
  NoteInput,
  NoteInputs,
  LazyNoteInputs,
  ParsedNote,
} from './notes.js';
