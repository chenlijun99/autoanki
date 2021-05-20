import type { MediaFile } from './media';

export type NoteId = number;

export type ActionsToPayloadMap = {
  /**
   * Creates a note using the given deck and model, with the provided field
   * values and tags. Returns the identifier of the created note created on
   * success, and null on failure.
   */
  addNote: {
    6: {
      request: {
        note: Note;
      };
      response: NoteId | null;
    };
  };
  /**
   * Creates multiple notes using the given deck and model, with the provided
   * field values and tags. Returns an array of identifiers of the created
   * notes (notes that could not be created will have a null identifier). Please
   * see the documentation for addNote for an explanation of objects in the
   * notes array.
   */
  addNotes: {
    6: {
      request: {
        notes: Array<Note>;
      };
      response: Array<NoteId | null>;
    };
  };
  /**
   * Accepts an array of objects which define parameters for candidate notes
   * (see addNote) and returns an array of booleans indicating whether or not
   * the parameters at the corresponding index could be used to create a new
   * note.
   */
  canAddNotes: {
    6: {
      request: {
        notes: Array<Note>;
      };
      response: Array<boolean>;
    };
  };
  /**
   * Modify the fields of an exist note. You can also include audio, video, or
   * picture files which will be added to the note with an optional audio,
   * video, or picture property. Please see the documentation for addNote for an
   * explanation of objects in the audio, video, or picture array.
   */
  updateNoteFields: {
    6: {
      request: {
        note: UpdateNote;
      };
      response: null;
    };
  };
  /**
   * Adds tags to notes by note ID.
   */
  addTags: {
    6: {
      request: {
        notes: NoteId[];
        tags: string;
      };
      response: null;
    };
  };
  /**
   * Remove tags from notes by note ID.
   */
  removeTags: {
    6: {
      request: {
        notes: NoteId[];
        tags: string;
      };
      response: null;
    };
  };
  /**
   * Gets the complete list of tags for the current user.
   */
  getTags: {
    6: {
      request: void;
      response: string[];
    };
  };
  /**
   * Clears all the unused tags in the notes for the current user.
   */
  clearUnusedTags: {
    6: {
      request: void;
      response: null;
    };
  };
  /**
   * Replace tags in notes by note ID.
   */
  replaceTags: {
    6: {
      request: {
        notes: NoteId[];
        tag_to_replace: string;
        replace_with_tag: string;
      };
      response: null;
    };
  };
  /**
   * Replace tags in all the notes for the current user.
   */
  replaceTagsInAllNotes: {
    6: {
      request: {
        tag_to_replace: string;
        replace_with_tag: string;
      };
      response: null;
    };
  };
  /**
   * Returns an array of note IDs for a given query. Query syntax is
   * [documented here](https://docs.ankiweb.net/#/searching).
   */
  findNotes: {
    6: {
      request: {
        query: string;
      };
      response: NoteId[];
    };
  };
  /**
   * Returns a list of objects containing for each note ID the note fields,
   * tags, note type and the cards belonging to the note.
   */
  notesInfo: {
    6: {
      request: {
        notes: NoteId[];
      };
      response: NoteInfo[];
    };
  };
  /**
   * Deletes notes with the given ids. If a note has several cards associated
   * with it, all associated cards will be deleted.
   */
  deleteNotes: {
    6: {
      request: {
        notes: NoteId[];
      };
      response: null;
    };
  };
  /**
   * Removes all the empty notes for the current user.
   */
  removeEmptyNotes: {
    6: {
      request: void;
      response: null;
    };
  };
};

export type NoteMediaFile = MediaFile & {
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
    duplicateScope?: 'deckName' | unknown;
    /**
     * The duplicateScopeOptions object can be used to specify some
     * additional settings.
     */
    duplicateScopeOptions?: {
      /**
       * duplicateScopeOptions.deckName will specify
       * which deck to use for checking duplicates in. If undefined or null,
       * the target deck will be used.
       */
      deckName?: string | null;
      /**
       * duplicateScopeOptions.checkChildren
       * will change whether or not duplicate cards are checked in child
       * decks; the default value is false.
       */
      checkChildren?: boolean;
    };
  };
  tags: Array<string>;
  audio?: Array<NoteMediaFile>;
  video?: Array<NoteMediaFile>;
  picture?: Array<NoteMediaFile>;
}

export type NoteInfo = Pick<Note, 'modelName' | 'tags' | 'fields'> & {
  id: NoteId;
};

export type UpdateNote = Omit<Note, 'deckName' | 'modelName'> & { id: NoteId };
