import {
  AnkiConnectService,
  NoteTypes,
  ModelTypes,
} from '@autoanki/anki-connect';

/**
 * Note parsing configuration
 */
export interface NoteParseConfig {
  /**
   * Start delimiter of an Anki note in a text file
   *
   * The capture group
   */
  noteStartDelimiter: string;
  /**
   * End delimiter of an Anki note in a text file.
   *
   * Why is it required? Because we don't assume that all the content of the
   * text file needs to become Anki notes.
   */
  noteEndDelimiter: string;
  /**
   * Field start delimiter
   *
   * The capture group
   */
  fieldStartDelimiter: string;
  /**
   * Field end delimiter
   *
   * Why is it required? Because we don't assume that all the content of the
   * note in the given text file needs to be an note field in Anki.
   */
  fieldEndDelimiter: string;
}

export interface Note {
  /**
   * Anki note id
   */
  id?: NoteTypes.NoteId;
  /**
   * Parsed Anki note type
   */
  noteType: string;
  /**
   * Parsed Anki note fields
   */
  fields: Record<string, string>;
  /**
   * Index at which the Anki note starts in the text string
   */
  startIndex: number;
  /**
   * Index at which the Anki note ends in the text string
   */
  endIndex: number;
}

enum DelimiterType {
  NOTE_START,
  NOTE_END,
  FIELD_START,
  FIELD_END,
}

function matchAllDelimiters(text: string, regex: string, type: DelimiterType) {
  return Array.from(text.matchAll(new RegExp(regex, 'g'))).map((match) => {
    return {
      type,
      match,
    };
  });
}

const newLineRegex = String.raw`(\r\n|\r|\n|$)`;

/**
 * TODO Use a serious parser
 */
export async function parse(
  text: string,
  config: NoteParseConfig
): Promise<Note[]> {
  const delimiters = [
    ...matchAllDelimiters(
      text,
      `${config.noteStartDelimiter}${newLineRegex}`,
      DelimiterType.NOTE_START
    ),
    ...matchAllDelimiters(
      text,
      `${config.noteEndDelimiter}${newLineRegex}`,
      DelimiterType.NOTE_END
    ),
    ...matchAllDelimiters(
      text,
      `${config.fieldStartDelimiter}${newLineRegex}`,
      DelimiterType.FIELD_START
    ),
    ...matchAllDelimiters(
      text,
      `${config.fieldEndDelimiter}${newLineRegex}`,
      DelimiterType.FIELD_END
    ),
  ];

  // sort delimiters by index
  delimiters.sort((lhs, rhs) => {
    return lhs.match.index! - rhs.match.index!;
  });

  // scan the sorted delimiters
  const notes: Note[] = [];
  for (let i = 0; i < delimiters.length; ) {
    if (delimiters[i].type !== DelimiterType.NOTE_START) {
      throw new Error('Expected note start delimiter');
    }
    const note: Note = {
      noteType: '',
      fields: {},
      startIndex: delimiters[i].match.index!,
      endIndex: 0,
    };
    note.noteType = delimiters[i].match[1];
    let j = i + 1;
    for (; j < delimiters.length; j += 1) {
      if (delimiters[j].type === DelimiterType.NOTE_START) {
        throw new Error('Unexpected note start delimiter');
      }
      if (delimiters[j].type === DelimiterType.NOTE_END) {
        break;
      }

      if (delimiters[j].type === DelimiterType.FIELD_START) {
        if (delimiters[j + 1].type !== DelimiterType.FIELD_END) {
          throw new Error('Expected field end delimiter');
        }
        const fieldName = delimiters[j].match[1];
        if (note.fields[fieldName] !== undefined) {
          throw new Error(`Duplicate field: ${fieldName}`);
        }
        note.fields[fieldName] = text.slice(
          delimiters[j].match.index! + delimiters[j].match[0].length,
          delimiters[j + 1].match.index
        );
        j += 1;
      }
    }
    if (delimiters[j].type !== DelimiterType.NOTE_END) {
      throw new Error('Expected end delimiter');
    }
    if (Object.keys(note.fields).length === 0) {
      throw new Error('Empty note');
    }
    i = j + 1;
    const endDelimiter = delimiters[j];
    note.endIndex =
      endDelimiter.match.index! + endDelimiter.match[0].length - 1;
    notes.push(note);
  }

  return notes;
}

export async function checkSemanticErrors(
  service: AnkiConnectService,
  notes: Note[]
): Promise<Error[] | undefined> {
  const errors: Error[] = [];
  const cache: Record<ModelTypes.ModelName, ModelTypes.FieldName[]> = {};
  const models = await service.invoke('modelNames', 6);
  notes.forEach(async (note) => {
    if (!cache[note.noteType]) {
      if (models.indexOf(note.noteType) < 0) {
        errors.push(new Error(`Note type ${note.noteType} doesn't exist`));
        return;
      }

      cache[note.noteType] = await service.invoke('modelFieldNames', 6, {
        modelName: note.noteType,
      });
    }

    Object.keys(note.fields).forEach((field) => {
      if (cache[note.noteType].indexOf(field) < 0) {
        errors.push(
          new Error(
            `Field ${field} doesn't exist on note type ${note.noteType}`
          )
        );
      }
    });
  });

  return errors.length === 0 ? undefined : errors;
}
