import outdent from 'outdent';

import { parse, NoteParseConfig } from './parse';

interface NoteParseTestConfig extends NoteParseConfig {
  noteStartDelimiterBuilder: (noteType: string) => string;
  noteEndDelimiterBuilder: () => string;
  fieldStartDelimiterBuilder: (fieldType: string) => string;
  fieldEndDelimiterBuilder: () => string;
}

const parserTestConfigs: NoteParseTestConfig[] = [
  {
    fieldStartDelimiter: '~~(.+)',
    fieldEndDelimiter: '~~',
    noteStartDelimiter: '---(.+)',
    noteEndDelimiter: '---',
    fieldStartDelimiterBuilder: (field) => `~~${field}`,
    fieldEndDelimiterBuilder: () => `~~`,
    noteStartDelimiterBuilder: (noteType) => `---${noteType}`,
    noteEndDelimiterBuilder: () => `---`,
  },
  {
    fieldStartDelimiter: '<field name="(.+)">',
    fieldEndDelimiter: '</field>',
    noteStartDelimiter: '<note type="(.+)">',
    noteEndDelimiter: '</note>',
    fieldStartDelimiterBuilder: (field) => `<field name="${field}">`,
    fieldEndDelimiterBuilder: () => `</field>`,
    noteStartDelimiterBuilder: (noteType) => `<note type="${noteType}">`,
    noteEndDelimiterBuilder: () => `</note>`,
  },
];

describe.each(parserTestConfigs)('note parsing', (config) => {
  it.each([
    outdent`
    ${config.noteStartDelimiterBuilder('Basic')}
    ${config.fieldStartDelimiterBuilder('Front')}
    1 + 1 = ?
    ${config.fieldEndDelimiterBuilder()}
    ${config.fieldStartDelimiterBuilder('Back')}
    1 + 1 = 2
    ${config.fieldEndDelimiterBuilder()}
    ${config.noteEndDelimiterBuilder()}
    `,

    // test with some random new lines
    outdent`

    ${config.noteStartDelimiterBuilder('Basic')}

    ${config.fieldStartDelimiterBuilder('Front')}

    1 + 1 = ?

    ${config.fieldEndDelimiterBuilder()}

    ${config.fieldStartDelimiterBuilder('Back')}
    1 + 1 = 2

    ${config.fieldEndDelimiterBuilder()}

    ${config.noteEndDelimiterBuilder()}
    `,
  ])('should parse one note', async (text) => {
    expect(await parse(text, config)).toMatchSnapshot(`Input text:\n${text}`);
  });

  it('should parse multiple notes', async () => {
    const text = outdent`
    ${config.noteStartDelimiterBuilder('Basic')}
    ${config.fieldStartDelimiterBuilder('Front')}
    1 + 1 = ?
    ${config.fieldEndDelimiterBuilder()}
    ${config.fieldStartDelimiterBuilder('Back')}
    1 + 1 = 2
    ${config.fieldEndDelimiterBuilder()}
    ${config.noteEndDelimiterBuilder()}
    `;
    const input = outdent`
    ${text}
    ${text}
    ${text}
    `;
    expect(await parse(input, config)).toMatchSnapshot(`Input text:\n${input}`);
  });

  describe('errors', () => {
    const invalidTexts: string[] = [
      outdent`
      ${config.noteStartDelimiterBuilder('Basic')}
      ${config.noteEndDelimiterBuilder()}
      `,
      outdent`
      ${config.noteStartDelimiterBuilder('Basic')}
      ${config.noteStartDelimiterBuilder('Basic')}
      `,
      outdent`
      ${config.noteEndDelimiterBuilder()}
      `,
      outdent`
      ${config.noteStartDelimiterBuilder('Basic')}
      ${config.fieldStartDelimiterBuilder('Front')}
      ${config.fieldEndDelimiterBuilder()}
      ${config.fieldStartDelimiterBuilder('Front')}
      ${config.fieldEndDelimiterBuilder()}
      ${config.noteEndDelimiterBuilder()}
      `,
    ];
    it.each(invalidTexts)('should throw on invalid text', async (text) => {
      await expect(parse(text, config)).rejects.toThrowErrorMatchingSnapshot(
        `Input text:\n${text}`
      );
    });
  });
});
