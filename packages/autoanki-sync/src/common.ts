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

export const AUTOANKI_TAGS = {
  SOURCE_CONTENT: 'autoanki-source-content',
  FINAL_CONTENT: 'autoanki-final-content',
  METADATA: 'autoanki-metadata',
} as const;
