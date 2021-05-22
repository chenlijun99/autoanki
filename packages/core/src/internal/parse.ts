/* eslint-disable prefer-template */
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
  metadataDelimiter: [string, string];
}

export interface NoteMetadata {
  /**
   * Anki note id
   */
  id?: NoteTypes.NoteId;
  dontAdd?: boolean;
  deleted?: boolean;
}

export interface Note {
  /**
   * Parsed Anki note type
   */
  noteType: string;
  /**
   * Parsed Anki note fields
   */
  fields: Record<string, string>;
  /**
   * Parsed note metadata
   */
  metadata: NoteMetadata;
  /**
   * Index at which the Anki note starts in the text string
   */
  startIndex: number;
  /**
   * Index at which the Anki note ends in the text string (inclusive)
   */
  endIndex: number;
  /**
   * Internal use only
   */
  internalParsingMetadata: {
    /**
     * The parsing config with which the note was parsed
     */
    parsingConfig: NoteParseConfig;
    noteStartDelimiterIndexes: [number, number];
    noteEndDelimiterIndexes: [number, number];
    metadataDelimiterIndexes: [[number, number], [number, number]];
  };
}

enum DelimiterType {
  NOTE_START,
  NOTE_END,
  FIELD_START,
  FIELD_END,
  METADATA_START,
  METADATA_END,
}

/**
 * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
 */
function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
function getDelimiterRegexStr(delimiter: string, type: DelimiterType): string {
  switch (type) {
    case DelimiterType.METADATA_START:
      return delimiter;
    default:
      return `${delimiter}${newLineRegex}`;
  }
}

/**
 * Given a regex match, return the index range of the matched text
 *
 * @param {RegExpMatchArray} match - regex match
 * @return {[number ,number]} index range. Type: "[)".
 */
function getMatchIndexes(match: RegExpMatchArray): [number, number] {
  return [match.index!, match.index! + match[0].length];
}

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
      getDelimiterRegexStr(config.noteStartDelimiter, DelimiterType.NOTE_START),
      DelimiterType.NOTE_START
    ),
    ...matchAllDelimiters(
      text,
      getDelimiterRegexStr(config.noteEndDelimiter, DelimiterType.NOTE_END),
      DelimiterType.NOTE_END
    ),
    ...matchAllDelimiters(
      text,
      getDelimiterRegexStr(
        config.fieldStartDelimiter,
        DelimiterType.FIELD_START
      ),
      DelimiterType.FIELD_START
    ),
    ...matchAllDelimiters(
      text,
      getDelimiterRegexStr(config.fieldEndDelimiter, DelimiterType.FIELD_END),
      DelimiterType.FIELD_END
    ),
    ...matchAllDelimiters(
      text,
      getDelimiterRegexStr(
        escapeRegExp(config.metadataDelimiter[0]),
        DelimiterType.METADATA_START
      ),
      DelimiterType.METADATA_START
    ),
    ...matchAllDelimiters(
      text,
      getDelimiterRegexStr(
        escapeRegExp(config.metadataDelimiter[1]),
        DelimiterType.METADATA_END
      ),
      DelimiterType.METADATA_END
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
      metadata: {},
      fields: {},
      startIndex: delimiters[i].match.index!,
      endIndex: 0,
      internalParsingMetadata: {
        parsingConfig: config,
        noteStartDelimiterIndexes: getMatchIndexes(delimiters[i].match),
        noteEndDelimiterIndexes: [-1, -1],
        metadataDelimiterIndexes: [
          [-1, -1],
          [-1, -1],
        ],
      },
    };
    note.noteType = delimiters[i].match[1];
    let j = i + 1;
    for (; j < delimiters.length; j += 1) {
      if (delimiters[j].type === DelimiterType.NOTE_START) {
        throw new Error('Unexpected note start delimiter');
      }
      if (delimiters[j].type === DelimiterType.FIELD_END) {
        throw new Error('Unexpected field end delimiter');
      }
      if (delimiters[j].type === DelimiterType.METADATA_END) {
        throw new Error('Unexpected metadata end delimiter');
      }
      if (delimiters[j].type === DelimiterType.NOTE_END) {
        note.internalParsingMetadata.noteEndDelimiterIndexes = getMatchIndexes(
          delimiters[j].match
        );
        break;
      }

      if (delimiters[j].type === DelimiterType.METADATA_START) {
        if (delimiters[j + 1].type !== DelimiterType.METADATA_END) {
          throw new Error('Expected metadata end delimiter');
        }
        note.internalParsingMetadata.metadataDelimiterIndexes = [
          getMatchIndexes(delimiters[j].match),
          getMatchIndexes(delimiters[j + 1].match),
        ];
        const metadataStart =
          delimiters[j].match.index! + delimiters[j].match[0].length;
        const metadataEnd = delimiters[j + 1].match.index!;
        note.metadata = JSON.parse(text.slice(metadataStart, metadataEnd));
        j += 1;
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

/**
 * Check the consistency of the given notes
 *
 * @async
 * @param {AnkiConnectService} service
 * @param {Note[]} notes the notes to be checked
 * @return {Promise<Error[] | undefined>}
 */
export async function checkConsistency(
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

/**
 * Write/Update the metadata of the notes in the given text
 *
 * @async
 * @param {string} text the original text
 * @param {Note[]} notesWithMetadata notes parsed from text with the
 * new metadata
 * @return {Promise<string>} a promise of the modified text
 */
export async function writeMetadata(
  text: string,
  notesWithMetadata: Note[]
): Promise<string> {
  if (notesWithMetadata.length === 0) {
    throw new Error('At least one note is expected');
  }
  let finalText = text.slice(0, notesWithMetadata[0].startIndex);

  notesWithMetadata.forEach((note, index, notes) => {
    const noteText = text.slice(note.startIndex, note.endIndex + 1);

    let updatedNoteText = '';

    if (note.internalParsingMetadata.metadataDelimiterIndexes[0][0] !== -1) {
      /*
       * if the metadata block already exists in the original text, simply replace it
       */
      updatedNoteText = noteText.replace(
        new RegExp(
          `(${getDelimiterRegexStr(
            note.internalParsingMetadata.parsingConfig.metadataDelimiter[0],
            DelimiterType.METADATA_START
          )}).*?(${getDelimiterRegexStr(
            note.internalParsingMetadata.parsingConfig.metadataDelimiter[1],
            DelimiterType.METADATA_END
          )})`
        ),
        `$1${JSON.stringify(note.metadata)}$2`
      );
    } else {
      /*
       * if the metadata block doesn't exist in the original text,
       * append it after the note start delimiter
       */
      updatedNoteText =
        text.slice(
          note.startIndex,
          note.internalParsingMetadata.noteStartDelimiterIndexes[1]
        ) +
        `${
          note.internalParsingMetadata.parsingConfig.metadataDelimiter[0]
        }${JSON.stringify(note.metadata)}${
          note.internalParsingMetadata.parsingConfig.metadataDelimiter[1]
        }\n` +
        text.slice(
          note.internalParsingMetadata.noteStartDelimiterIndexes[1],
          note.endIndex + 1
        );
    }

    finalText += updatedNoteText;

    /*
     * include potential text between this note and the next note
     */
    if (index !== notes.length - 1) {
      finalText += text.slice(note.endIndex + 1, notes[index + 1].startIndex);
    } else {
      finalText += text.slice(note.endIndex + 1, text.length);
    }
  });

  return finalText;
}
