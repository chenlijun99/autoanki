import { parse, NoteParseConfig } from './parse';

interface NoteParseTestConfig extends NoteParseConfig {
  noteStartDelimiterBuilder: (noteType: string) => string;
  noteEndDelimiterBuilder: () => string;
  fieldStartDelimiterBuilder: (fieldType: string) => string;
  fieldEndDelimiterBuilder: () => string;
}

const parserTestConfigs: NoteParseTestConfig[] = [
  {
    fieldStartDelimiter: '~~(.+)\\b',
    fieldEndDelimiter: '~~\\s',
    noteStartDelimiter: '---(.+)\\b',
    noteEndDelimiter: '---(\\s|$)',
    fieldStartDelimiterBuilder: (field) => `~~${field}\n`,
    fieldEndDelimiterBuilder: () => `~~\n`,
    noteStartDelimiterBuilder: (field) => `---${field}\n`,
    noteEndDelimiterBuilder: () => `---\n`,
  },
];

describe.each(parserTestConfigs)('note parsing', (config) => {
  it('should parse one note', async () => {
    const text = `
    ${config.noteStartDelimiterBuilder('Basic')}\
    ${config.fieldStartDelimiterBuilder('Front')}\
    1 + 1 = ?\
    ${config.fieldEndDelimiterBuilder()}\
    ${config.fieldStartDelimiterBuilder('Back')}\
    1 + 1 = 2\
    ${config.fieldEndDelimiterBuilder()}\
    ${config.noteEndDelimiterBuilder()}
    `;
    expect(await parse(text, config)).toMatchSnapshot();
  });

  it('should parse multiple notes', async () => {
    const text = `
    ${config.noteStartDelimiterBuilder('Basic')}\
    ${config.fieldStartDelimiterBuilder('Front')}\
    1 + 1 = ?\
    ${config.fieldEndDelimiterBuilder()}\
    ${config.fieldStartDelimiterBuilder('Back')}\
    1 + 1 = 2\
    ${config.fieldEndDelimiterBuilder()}\
    ${config.noteEndDelimiterBuilder()}
    `;
    expect(await parse(text + text + text, config)).toMatchSnapshot();
  });

  describe('errors', () => {
    const invalidTexts: string[] = [
      `
      ${config.noteStartDelimiterBuilder('Basic')}
      ${config.noteEndDelimiterBuilder()}
      `,
      `
      ${config.noteStartDelimiterBuilder('Basic')}
      ${config.noteStartDelimiterBuilder('Basic')}
      `,
      `
      ${config.noteEndDelimiterBuilder()}
      `,
    ];
    it.each(invalidTexts)('should throw on invalid text', async (text) => {
      await expect(parse(text, config)).rejects.toThrowErrorMatchingSnapshot();
    });
  });
});
