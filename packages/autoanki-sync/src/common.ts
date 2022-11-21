/**
 * This error is thrown when there is any problem during the conversion of
 * retrieve Anki note to Autoanki note.
 */
export class AutoankiNoteFromAnkiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class AutoankiSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export enum ConcernedSide {
  NoSide = 0,
  Source = 1,
  Anki = 1 << 1,
}

export const AUTOANKI_HTML_CONSTANTS = {
  SOURCE_CONTENT_TAG: 'autoanki-source-content',
  FINAL_CONTENT_TAG: 'autoanki-final-content',
  METADATA_TAG: 'autoanki-metadata',
  METADATA_SCRIPT_ARGS_DATA_ATTRIBUTE: 'autoanki-script-args',
} as const;
