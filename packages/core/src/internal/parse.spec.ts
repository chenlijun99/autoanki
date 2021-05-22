import outdent from 'outdent';

import {
  parse,
  writeMetadata,
  NoteParseConfig,
  NoteMetadata,
  COMMON_PLACEHOLDERS,
} from './parse';

interface NoteParseTestConfig extends NoteParseConfig {
  noteStartDelimiterBuilder: (noteType: string) => string;
  noteEndDelimiterBuilder: () => string;
  fieldStartDelimiterBuilder: (fieldType: string) => string;
  fieldEndDelimiterBuilder: () => string;
  metadataBuilder: (metadata: NoteMetadata) => string;
}

const parserTestConfigs: NoteParseTestConfig[] = [
  {
    lexemes: {
      noteDelimiter: {
        start: `${COMMON_PLACEHOLDERS.startOfLine}---${COMMON_PLACEHOLDERS.noteType}${COMMON_PLACEHOLDERS.newline}`,
        end: `${COMMON_PLACEHOLDERS.startOfLine}---${COMMON_PLACEHOLDERS.newline}`,
      },
      fieldDelimiter: {
        start: `${COMMON_PLACEHOLDERS.startOfLine}~~${COMMON_PLACEHOLDERS.fieldName}${COMMON_PLACEHOLDERS.newline}`,
        end: `${COMMON_PLACEHOLDERS.startOfLine}~~${COMMON_PLACEHOLDERS.newline}`,
      },
      metadataDelimiter: {
        start: '<',
        end: '>',
      },
    },
    fieldStartDelimiterBuilder: (field) => `~~${field}`,
    fieldEndDelimiterBuilder: () => `~~`,
    noteStartDelimiterBuilder: (noteType) => `---${noteType}`,
    noteEndDelimiterBuilder: () => `---`,
    metadataBuilder: (metadata) => `<${JSON.stringify(metadata)}>`,
  },
  {
    lexemes: {
      noteDelimiter: {
        start: `${COMMON_PLACEHOLDERS.startOfLine}<note type="${COMMON_PLACEHOLDERS.noteType}">${COMMON_PLACEHOLDERS.newline}`,
        end: `${COMMON_PLACEHOLDERS.startOfLine}</note>${COMMON_PLACEHOLDERS.newline}`,
      },
      fieldDelimiter: {
        start: `${COMMON_PLACEHOLDERS.startOfLine}<field name="${COMMON_PLACEHOLDERS.fieldName}">${COMMON_PLACEHOLDERS.newline}`,
        end: `${COMMON_PLACEHOLDERS.startOfLine}</field>${COMMON_PLACEHOLDERS.newline}`,
      },
      metadataDelimiter: {
        start: '<!--',
        end: '-->',
      },
    },
    fieldStartDelimiterBuilder: (field) => `<field name="${field}">`,
    fieldEndDelimiterBuilder: () => `</field>`,
    noteStartDelimiterBuilder: (noteType) => `<note type="${noteType}">`,
    noteEndDelimiterBuilder: () => `</note>`,
    metadataBuilder: (metadata) => `<!--${JSON.stringify(metadata)}-->`,
  },
];

interface TestCase {
  /**
   * Short description of the test case
   */
  description: string;
  /**
   * Test case text input
   */
  input: string;
}
function testCaseToStr(testCase: TestCase): string {
  return `Test case: ${testCase.description}\nInput text:\n${testCase.input}`;
}

describe.each(parserTestConfigs)('note parsing', (config) => {
  it.each<TestCase>([
    {
      description: '',
      input: outdent`
        ${config.noteStartDelimiterBuilder('Basic')}
        ${config.fieldStartDelimiterBuilder('Front')}
        1 + 1 = ?
        ${config.fieldEndDelimiterBuilder()}
        ${config.fieldStartDelimiterBuilder('Back')}
        1 + 1 = 2
        ${config.fieldEndDelimiterBuilder()}
        ${config.noteEndDelimiterBuilder()}
      `,
    },
    {
      description: 'test with some random new lines',
      input: outdent`
        ${config.noteStartDelimiterBuilder('Basic')}

        ${config.fieldStartDelimiterBuilder('Front')}

        1 + 1 = ?

        ${config.fieldEndDelimiterBuilder()}

        ${config.fieldStartDelimiterBuilder('Back')}
        1 + 1 = 2

        ${config.fieldEndDelimiterBuilder()}

        ${config.noteEndDelimiterBuilder()}
      `,
    },
    {
      description: 'note with metadata',
      input: outdent`
        ${config.noteStartDelimiterBuilder('Basic')}

        ${config.metadataBuilder({ id: 123, dontAdd: true, deleted: true })}

        ${config.fieldStartDelimiterBuilder('Front')}

        1 + 1 = ?

        ${config.fieldEndDelimiterBuilder()}

        ${config.fieldStartDelimiterBuilder('Back')}
        1 + 1 = 2

        ${config.fieldEndDelimiterBuilder()}

        ${config.noteEndDelimiterBuilder()}
      `,
    },
    {
      description: 'multiple notes',
      input: outdent`
        ${config.noteStartDelimiterBuilder('Basic')}

        ${config.metadataBuilder({ id: 123, dontAdd: true, deleted: true })}

        ${config.fieldStartDelimiterBuilder('Front')}

        1 + 1 = ?

        ${config.fieldEndDelimiterBuilder()}

        ${config.fieldStartDelimiterBuilder('Back')}
        1 + 1 = 2

        ${config.fieldEndDelimiterBuilder()}

        ${config.noteEndDelimiterBuilder()}

        ${config.noteStartDelimiterBuilder('Basic and reversed')}

        ${config.fieldStartDelimiterBuilder('Front')}

        1 + 1 = ?

        ${config.fieldEndDelimiterBuilder()}

        ${config.fieldStartDelimiterBuilder('Back')}
        1 + 1 = 2

        ${config.fieldEndDelimiterBuilder()}

        ${config.noteEndDelimiterBuilder()}
      `,
    },
  ])('should parse notes', async (test) => {
    expect(
      (await parse(test.input, config)).map((note) => {
        // we don't care about this field
        // @ts-ignore
        delete note.internalParsingMetadata;
        return note;
      })
    ).toMatchSnapshot(testCaseToStr(test));
  });

  describe('errors', () => {
    const invalidTexts: TestCase[] = [
      {
        description: 'empty note',
        input: outdent`
          ${config.noteStartDelimiterBuilder('Basic')}
          ${config.noteEndDelimiterBuilder()}
        `,
      },
      {
        description: 'unexpected start delimiter - missing end delimiter',
        input: outdent`
          ${config.noteStartDelimiterBuilder('Basic')}
          ${config.noteStartDelimiterBuilder('Basic')}
        `,
      },
      {
        description: 'unexpected end delimiter - missing start delimiter',
        input: outdent`
          ${config.noteEndDelimiterBuilder()}
        `,
      },
      {
        description: '',
        input: outdent`
          ${config.noteStartDelimiterBuilder('Basic')}
          ${config.fieldStartDelimiterBuilder('Front')}
          ${config.fieldEndDelimiterBuilder()}
          ${config.fieldStartDelimiterBuilder('Front')}
          ${config.fieldEndDelimiterBuilder()}
          ${config.noteEndDelimiterBuilder()}
        `,
      },
    ];
    it.each(invalidTexts)('should throw on invalid text', async (test) => {
      await expect(
        parse(test.input, config)
      ).rejects.toThrowErrorMatchingSnapshot(testCaseToStr(test));
    });
  });
});

describe.each(parserTestConfigs)('metadata insertion', (config) => {
  it.each([
    {
      description: 'single note with no note metadata',
      input: outdent`
    ${config.noteStartDelimiterBuilder('Basic')}
    ${config.fieldStartDelimiterBuilder('Front')}
    1 + 1 = ?
    ${config.fieldEndDelimiterBuilder()}
    ${config.fieldStartDelimiterBuilder('Back')}
    1 + 1 = 2
    ${config.fieldEndDelimiterBuilder()}
    ${config.noteEndDelimiterBuilder()}
    `,
    },
    {
      description: 'multiple notes with no note metadata',
      input: outdent`
    ${config.noteStartDelimiterBuilder('Basic')}
    ${config.fieldStartDelimiterBuilder('Front')}
    1 + 1 = ?
    ${config.fieldEndDelimiterBuilder()}
    ${config.fieldStartDelimiterBuilder('Back')}
    1 + 1 = 2
    ${config.fieldEndDelimiterBuilder()}
    ${config.noteEndDelimiterBuilder()}

    ${config.noteStartDelimiterBuilder('Basic')}
    ${config.fieldStartDelimiterBuilder('Front')}
    1 + 1 = ?
    ${config.fieldEndDelimiterBuilder()}
    ${config.fieldStartDelimiterBuilder('Back')}
    1 + 1 = 2
    ${config.fieldEndDelimiterBuilder()}
    ${config.noteEndDelimiterBuilder()}
    `,
    },
    {
      description:
        'test multiple notes with non-note text content between notes',
      input: outdent`
    This text doesn't belong any note

    ${config.noteStartDelimiterBuilder('Basic')}
    ${config.fieldStartDelimiterBuilder('Front')}
    1 + 1 = ?
    ${config.fieldEndDelimiterBuilder()}
    ${config.fieldStartDelimiterBuilder('Back')}
    1 + 1 = 2
    ${config.fieldEndDelimiterBuilder()}
    ${config.noteEndDelimiterBuilder()}

    This text doesn't belong any note

    ${config.noteStartDelimiterBuilder('Basic')}
    ${config.fieldStartDelimiterBuilder('Front')}
    1 + 1 = ?
    ${config.fieldEndDelimiterBuilder()}
    ${config.fieldStartDelimiterBuilder('Back')}
    1 + 1 = 2
    ${config.fieldEndDelimiterBuilder()}
    ${config.noteEndDelimiterBuilder()}

    This text doesn't belong any note
    `,
    },
    {
      description:
        'multiple notes, some with existing metadata, some with no metadata',
      input: outdent`
        ${config.noteStartDelimiterBuilder('Basic')}
        ${config.metadataBuilder({ id: 0 })}
        ${config.fieldStartDelimiterBuilder('Front')}
        1 + 1 = ?
        ${config.fieldEndDelimiterBuilder()}
        ${config.fieldStartDelimiterBuilder('Back')}
        1 + 1 = 2
        ${config.fieldEndDelimiterBuilder()}
        ${config.noteEndDelimiterBuilder()}

        ${config.noteStartDelimiterBuilder('Basic')}
        ${config.fieldStartDelimiterBuilder('Front')}
        1 + 1 = ?
        ${config.fieldEndDelimiterBuilder()}
        ${config.fieldStartDelimiterBuilder('Back')}
        1 + 1 = 2
        ${config.fieldEndDelimiterBuilder()}
        ${config.noteEndDelimiterBuilder()}

        ${config.noteStartDelimiterBuilder('Basic')}
        ${config.metadataBuilder({ id: 1 })}
        ${config.fieldStartDelimiterBuilder('Front')}
        1 + 1 = ?
        ${config.fieldEndDelimiterBuilder()}
        ${config.fieldStartDelimiterBuilder('Back')}
        1 + 1 = 2
        ${config.fieldEndDelimiterBuilder()}
        ${config.noteEndDelimiterBuilder()}
        `,
    },
  ])(
    'should insert the metadata right after the note start delimiter',
    async (test) => {
      const notes = await parse(test.input, config);
      const expectedMetadata: NoteMetadata[] = [];
      notes.forEach((note, i) => {
        if (Object.keys(note.metadata).length === 0) {
          /*
           * if the metadata is empty, assign some metadata, to test the
           * metadata insertion
           */
          note.metadata = {
            id: i,
            dontAdd: true,
          };
        }
        expectedMetadata.push(note.metadata);
      });
      const modifiedText = await writeMetadata(test.input, notes);

      // parse to modifiedText. The parsed matadata should equal to expected one
      expect(
        (await parse(modifiedText, config)).map((note) => note.metadata)
      ).toStrictEqual(expectedMetadata);

      expect(modifiedText).toMatchSnapshot(testCaseToStr(test));
    }
  );

  it.each([
    {
      description: 'single note',
      input: outdent`
        ${config.noteStartDelimiterBuilder('Basic')}
        ${config.metadataBuilder({ id: 0 })}
        ${config.fieldStartDelimiterBuilder('Front')}
        1 + 1 = ?
        ${config.fieldEndDelimiterBuilder()}
        ${config.fieldStartDelimiterBuilder('Back')}
        1 + 1 = 2
        ${config.fieldEndDelimiterBuilder()}
        ${config.noteEndDelimiterBuilder()}
      `,
    },
    {
      description:
        'multiple notes, some with existing metadata, some with no metadata',
      input: outdent`
        ${config.noteStartDelimiterBuilder('Basic')}
        ${config.metadataBuilder({ id: 0 })}
        ${config.fieldStartDelimiterBuilder('Front')}
        1 + 1 = ?
        ${config.fieldEndDelimiterBuilder()}
        ${config.fieldStartDelimiterBuilder('Back')}
        1 + 1 = 2
        ${config.fieldEndDelimiterBuilder()}
        ${config.noteEndDelimiterBuilder()}

        ${config.noteStartDelimiterBuilder('Basic')}
        ${config.fieldStartDelimiterBuilder('Front')}
        1 + 1 = ?
        ${config.fieldEndDelimiterBuilder()}
        ${config.fieldStartDelimiterBuilder('Back')}
        1 + 1 = 2
        ${config.fieldEndDelimiterBuilder()}
        ${config.noteEndDelimiterBuilder()}

        ${config.noteStartDelimiterBuilder('Basic')}
        ${config.metadataBuilder({ id: 1 })}
        ${config.fieldStartDelimiterBuilder('Front')}
        1 + 1 = ?
        ${config.fieldEndDelimiterBuilder()}
        ${config.fieldStartDelimiterBuilder('Back')}
        1 + 1 = 2
        ${config.fieldEndDelimiterBuilder()}
        ${config.noteEndDelimiterBuilder()}
        `,
    },
  ])(
    'should update the metadata, wherever it is inside the note block',
    async (test) => {
      const notes = await parse(test.input, config);
      const expectedMetadata: NoteMetadata[] = [];
      notes.forEach((note, i) => {
        note.metadata = {
          id: i,
          dontAdd: true,
        };
        expectedMetadata.push(note.metadata);
      });
      const modifiedText = await writeMetadata(test.input, notes);

      // parse to modifiedText. The parsed matadata should equal to expected one
      expect(
        (await parse(modifiedText, config)).map((note) => note.metadata)
      ).toStrictEqual(expectedMetadata);

      expect(modifiedText).toMatchSnapshot(testCaseToStr(test));
    }
  );
});
