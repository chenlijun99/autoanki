import type { MediaFile } from './media';

export type ActionsToPayloadMap = {
  addNote: {
    6: {
      request: {
        note: Note;
      };
      response: number | null;
    };
  };
  addNotes: {
    6: {
      request: {
        notes: Array<Note>;
      };
      response: Array<number | null>;
    };
  };
  updateNoteFields: {
    6: {
      request: {
        note: UpdateNote;
      };
      response: null;
    };
  };
};

type NoteMediaFile = MediaFile & {
  /**
   * The skipHash field can be optionally provided to skip the inclusion of
   * files with an MD5 hash that matches the provided value. This is useful
   * for avoiding the saving of error pages and stub files.
   */
  skipHash: string;
  /**
   * The fields member
   * is a list of fields that should play audio or video, or show a
   * picture when the card is displayed in Anki
   */
  fields: Array<string>;
};

export interface Note {
  deckName: string;
  modelName: string;
  fields: Record<string, string>;
  options: {
    allowDuplicate: boolean;
    /**
     * The duplicateScope member inside options can be used to specify the
     * scope for which duplicates are checked
     * A value of "deckName" will only check for duplicates in the target
     * d eck; any other value will check the entire collection
     */
    duplicateScope: string;
    /**
     * The duplicateScopeOptions object can be used to specify some
     * additional settings.
     */
    duplicateScopeOptions: {
      /**
       * duplicateScopeOptions.deckName will specify
       * which deck to use for checking duplicates in. If undefined or null,
       * the target deck will be used.
       */
      deckName: string;
      /**
       * duplicateScopeOptions.checkChildren
       * will change whether or not duplicate cards are checked in child
       * decks; the default value is false.
       */
      checkChildren: boolean;
    };
  };
  tags: Array<string>;
  audio?: Array<NoteMediaFile>;
  video?: Array<NoteMediaFile>;
  picture?: Array<NoteMediaFile>;
}

export type UpdateNote = Omit<Note, 'deckName' | 'modelName'> & { id: number };
