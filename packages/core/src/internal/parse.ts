import { NoteTypes } from '@autoanki/anki-connect';

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
  id?: NoteTypes.NoteId;
  noteType: string;
  fields: Record<string, string>;
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

/**
 * Use a serious parser
 */
export async function parse(
  text: string,
  config: NoteParseConfig
): Promise<Note[]> {
  const delimiters = [
    ...matchAllDelimiters(
      text,
      config.noteStartDelimiter,
      DelimiterType.NOTE_START
    ),
    ...matchAllDelimiters(
      text,
      config.noteEndDelimiter,
      DelimiterType.NOTE_END
    ),
    ...matchAllDelimiters(
      text,
      config.fieldStartDelimiter,
      DelimiterType.FIELD_START
    ),
    ...matchAllDelimiters(
      text,
      config.fieldEndDelimiter,
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
        note.fields[delimiters[j].match[1]] = text
          .slice(
            delimiters[j].match.index! + delimiters[j].match[0].length,
            delimiters[j + 1].match.index
          )
          .trim();
        j += 1;
      }
    }
    if (delimiters[j].type !== DelimiterType.NOTE_END) {
      throw new Error('Expected end delimiter');
    }
    if (Object.keys(note.fields).length === 0) {
      throw new Error('Empty note');
    }
    i += j + 1;
    notes.push(note);
  }

  return notes;
}
