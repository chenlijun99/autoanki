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

export enum ConcernedSide {
  NoSide = 0,
  Source = 1,
  Anki = 1 << 1,
}
