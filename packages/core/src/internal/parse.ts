/* eslint-disable prefer-template */
import {
  AnkiConnectService,
  NoteTypes,
  ModelTypes,
} from '@autoanki/anki-connect';

class ParserError extends Error {
  constructor(...args: ConstructorParameters<typeof Error>) {
    super(...args);
    this.name = 'AutoankiCoreParserError';
  }
}

interface Delimiter {
  /**
   * Start delimiter
   */
  start: string;
  /**
   * End delimiter
   *
   * Why is it required? E.g. can't notes be separated just by the start delimiter?
   * Because we don't assume that all the content of the text file needs to
   * become Anki notes.
   */
  end: string;
}

/**
 * Note parsing configuration
 */
export interface NoteParseConfig {
  lexemes: {
    /**
     * Note delimiters
     */
    noteDelimiter: Delimiter;
    /**
     * Note field delimiters
     */
    fieldDelimiter: Delimiter;
    /**
     * Note-specific inline metadata section delimiters
     */
    metadataDelimiter: Delimiter;
  };
}

export const COMMON_PLACEHOLDERS = {
  newline: '<newline>',
  startOfLine: '<startOfLine>',
  noteType: '<noteType>',
  fieldName: '<fieldName>',
} as const;
type CommonPlaceholders = typeof COMMON_PLACEHOLDERS;
type CommonPlaceholderValue = CommonPlaceholders[keyof CommonPlaceholders];

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

interface PlaceholderAllowPolicy {
  placeholder: CommonPlaceholderValue;
  minOccurences: number;
  maxOccurences: number;
  customValidator?: () => ParserError | undefined;
}

type PlaceholderWhiltelist = Partial<
  Record<DelimiterType, PlaceholderAllowPolicy[]>
> & {
  all: PlaceholderAllowPolicy[];
};

const PLACEHOLDER_WHITELST: PlaceholderWhiltelist = {
  all: [
    {
      placeholder: COMMON_PLACEHOLDERS.newline,
      minOccurences: -Infinity,
      maxOccurences: +Infinity,
    },
    {
      placeholder: COMMON_PLACEHOLDERS.startOfLine,
      minOccurences: -Infinity,
      maxOccurences: +Infinity,
    },
  ],
  [DelimiterType.NOTE_START]: [
    {
      placeholder: COMMON_PLACEHOLDERS.noteType,
      minOccurences: 1,
      maxOccurences: 1,
    },
  ],
  [DelimiterType.FIELD_START]: [
    {
      placeholder: COMMON_PLACEHOLDERS.fieldName,
      minOccurences: 1,
      maxOccurences: 1,
    },
  ],
};

function isPlaceholderUsageInLexemeCompliant(
  lexeme: string,
  entry: keyof PlaceholderWhiltelist,
  placeholder: CommonPlaceholderValue
): ParserError | undefined {
  const matches = Array.from(lexeme.matchAll(new RegExp(placeholder, 'g')));
  const whiteList = PLACEHOLDER_WHITELST[entry] ?? [];
  const policy = whiteList.find(
    (allowed) => allowed.placeholder === placeholder
  );
  if (policy) {
    if (
      !(
        policy.minOccurences <= matches.length &&
        matches.length <= policy.maxOccurences
      )
    ) {
      return new ParserError(`Invalid usage of placeholder ${placeholder}`);
    }
  } else if (matches.length !== 0) {
    return new ParserError(`Invalid usage of placeholder ${placeholder}`);
  }
  return undefined;
}

const newLineRegex = String.raw`(\r\n|\r|\n|$)`;
/**
 * Convert user defined delimiter to regex
 *
 * @param delimiter - user defined delimiter
 * @param type - type of the delimiter
 * @return regex that can be used to match the delimiter token
 */
function getDelimiterRegexStr(delimiter: string, type: DelimiterType): RegExp {
  let regex = escapeRegExp(delimiter);

  Object.values(COMMON_PLACEHOLDERS).forEach((placeholder) => {
    let error = isPlaceholderUsageInLexemeCompliant(
      delimiter,
      type,
      placeholder
    );
    if (error) {
      error = isPlaceholderUsageInLexemeCompliant(
        delimiter,
        'all',
        placeholder
      );
    }
    if (error) {
      throw error;
    }
  });

  regex = regex.replace(COMMON_PLACEHOLDERS.newline, newLineRegex);
  regex = regex.replace(COMMON_PLACEHOLDERS.startOfLine, '^');
  if (type === DelimiterType.NOTE_START) {
    regex = regex.replace(COMMON_PLACEHOLDERS.noteType, '(.+)');
  }
  if (type === DelimiterType.FIELD_START) {
    regex = regex.replace(COMMON_PLACEHOLDERS.fieldName, '(.+)');
  }
  return new RegExp(regex, 'gm');
}

function matchAllDelimiters(text: string, regex: RegExp, type: DelimiterType) {
  return Array.from(text.matchAll(regex)).map((match) => {
    return {
      type,
      match,
    };
  });
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
 * Validate the parser configuration
 */
export function validateParserConfig(config: NoteParseConfig): ParserError[] {
  return [];
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
      getDelimiterRegexStr(
        config.lexemes.noteDelimiter.start,
        DelimiterType.NOTE_START
      ),
      DelimiterType.NOTE_START
    ),
    ...matchAllDelimiters(
      text,
      getDelimiterRegexStr(
        config.lexemes.noteDelimiter.end,
        DelimiterType.NOTE_END
      ),
      DelimiterType.NOTE_END
    ),
    ...matchAllDelimiters(
      text,
      getDelimiterRegexStr(
        config.lexemes.fieldDelimiter.start,
        DelimiterType.FIELD_START
      ),
      DelimiterType.FIELD_START
    ),
    ...matchAllDelimiters(
      text,
      getDelimiterRegexStr(
        config.lexemes.fieldDelimiter.end,
        DelimiterType.FIELD_END
      ),
      DelimiterType.FIELD_END
    ),
    ...matchAllDelimiters(
      text,
      getDelimiterRegexStr(
        config.lexemes.metadataDelimiter.start,
        DelimiterType.METADATA_START
      ),
      DelimiterType.METADATA_START
    ),
    ...matchAllDelimiters(
      text,
      getDelimiterRegexStr(
        config.lexemes.metadataDelimiter.end,
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
          `(${
            getDelimiterRegexStr(
              note.internalParsingMetadata.parsingConfig.lexemes
                .metadataDelimiter.start,
              DelimiterType.METADATA_START
            ).source
          }).*?(${
            getDelimiterRegexStr(
              note.internalParsingMetadata.parsingConfig.lexemes
                .metadataDelimiter.end,
              DelimiterType.METADATA_END
            ).source
          })`
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
          note.internalParsingMetadata.parsingConfig.lexemes.metadataDelimiter
            .start
        }${JSON.stringify(note.metadata)}${
          note.internalParsingMetadata.parsingConfig.lexemes.metadataDelimiter
            .end
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
