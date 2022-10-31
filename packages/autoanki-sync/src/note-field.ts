/**
 * @file This module handles the bidirectional conversion of note fields
 * between Autoanki notes and Anki notes.
 *
 * Given an Autoanki note and given the original content and the final content
 * of a note field, we have the following goals:
 *
 * * Only the final content of the Autoanki note is shown on the Anki note.
 * * The user should be able to modify the original content of the Ankinote
 * directly Anki in a relatively easy manner.
 * * There is enough metadata in the Anki note notefield that can allow us to
 * detect edits to the Anki note performed directly inside Anki by the user.
 */

import { XMLParser } from 'fast-xml-parser';
import { z, ZodError } from 'zod';
import { escape, unescape } from 'html-escaper';

import type { AutoankiNote } from '@autoanki/core';
import webcrypto from '@autoanki/utils/webcrypto.js';
import assert from '@autoanki/utils/assert.js';

const { subtle } = webcrypto;

import { AutoankiNoteFromAnkiError } from './common.js';

const AUTOANKI_TAGS = {
  SOURCE_CONTENT: 'autoanki-source-content',
  FINAL_CONTENT: 'autoanki-final-content',
  METADATA: 'autoanki-metadata',
} as const;

export async function hashContent(content: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(content);
  const hashBuffer = await subtle.digest('SHA-1', msgUint8);
  const hashArray = [...new Uint8Array(hashBuffer)];
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(''); // convert bytes to hex string
  return hashHex;
}

/**
 * Given an Autoanki note and the final content and the source content of a
 * field, emit the corresponding Anki note.
 */
export async function getAnkiNoteField(
  note: AutoankiNote,
  finalContent: string,
  sourceContent: string
): Promise<string> {
  assert(note.autoanki.uuid !== undefined);

  return `<${AUTOANKI_TAGS.SOURCE_CONTENT} hidden>
${escape(sourceContent)}
</${AUTOANKI_TAGS.SOURCE_CONTENT}>

<${AUTOANKI_TAGS.FINAL_CONTENT}>
${finalContent}
</${AUTOANKI_TAGS.FINAL_CONTENT}>

<${AUTOANKI_TAGS.METADATA}
 data-autoanki-uuid="${note.autoanki.uuid}"
 data-autoanki-note-type="${note.modelName}"
 data-autoanki-tags="${note.tags}"
 data-autoanki-source-content-hash="${await hashContent(sourceContent)}"
 data-autoanki-final-content-hash="${await hashContent(finalContent)}"
 hidden>
</${AUTOANKI_TAGS.METADATA}>`;
}

const autoankiNoteFieldSchema = z.object({
  [AUTOANKI_TAGS.SOURCE_CONTENT]: z
    .object({
      '@_attributes': z.object({}),
      '#text': z.string(),
    })
    .strict(),
  [AUTOANKI_TAGS.FINAL_CONTENT]: z
    .object({
      '#text': z.string(),
    })
    .strict(),
  [AUTOANKI_TAGS.METADATA]: z.object({
    '@_attributes': z.object({
      'data-autoanki-uuid': z.string(),
      'data-autoanki-note-type': z.string(),
      'data-autoanki-tags': z.string(),
      'data-autoanki-source-content-hash': z.string(),
      'data-autoanki-final-content-hash': z.string(),
    }),
  }),
});

export interface AutoankiNoteFieldMetadata {
  /**
   * The content
   */
  content: string;
  /**
   * The hash computed when the note was created/updated and stored inside
   * the HTML of the note in Anki.
   */
  storedHash: string;
  /**
   * The new hash computed based on the retrieved content.
   * If different from storedHash, it menas that the user edited the field.
   */
  computedHash: string;
  /**
   * Result of `computedHash !== storedHash`
   */
  fieldChanged: boolean;
}

export interface AutoankiNoteFieldFromAnki {
  /**
   * The raw content of the Anki note field
   */
  raw: string;
  /**
   * Autoanki source content data hiddenly stored in the Anki note field
   */
  sourceContent: AutoankiNoteFieldMetadata;
  /**
   * Autoanki final content data of this note field
   */
  finalContent: AutoankiNoteFieldMetadata;
  /**
   * The autoanki uuid hiddenly stored in the Anki note field
   */
  uuid: string;
  /**
   * The model name hiddenly stored in the Anki note field
   */
  modelName: string;
  /**
   * The space-separated note tags hiddenly stored in the Anki note field
   */
  tags: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  alwaysCreateTextNode: true,
  attributesGroupName: '@_attributes',
  attributeNamePrefix: '',
  allowBooleanAttributes: true,
  stopNodes: [
    `*.${AUTOANKI_TAGS.SOURCE_CONTENT}`,
    `*.${AUTOANKI_TAGS.FINAL_CONTENT}`,
    `*.${AUTOANKI_TAGS.METADATA}`,
  ],
});

function getOriginalContent(contentFromHTML: string): string {
  /*
   * Depending on how the content is inserted in the HTML in the function
   * `getAnkiNoteField`, the XML parser may give us some additional characters
   * to the original content, which we need to remove, in order to get the
   * original content.
   *
   * * Remove the initial and final "\n".
   */
  return contentFromHTML.slice(1, -1);
}

/**
 * Given an Anki note field's content, parse it and derive the corresponding
 * Autoanki note field.
 */
export async function getAutoankiNoteField(
  fieldName: string,
  ankiNoteFieldContent: string
): Promise<AutoankiNoteFieldFromAnki> {
  let field: z.infer<typeof autoankiNoteFieldSchema>;
  {
    let xml: unknown;
    try {
      xml = parser.parse(ankiNoteFieldContent);
    } catch (error) {
      if (error instanceof Error) {
        throw new AutoankiNoteFromAnkiError(
          `Field "${fieldName}"'s content

"${ankiNoteFieldContent}"

is invalid HTML

Reason: ${error.message}`
        );
      } else {
        throw new AutoankiNoteFromAnkiError('Unknown reason');
      }
    }
    try {
      field = autoankiNoteFieldSchema.parse(xml);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AutoankiNoteFromAnkiError(
          `Field ${fieldName}'s content

"${ankiNoteFieldContent}"

parsed as

\`\`\`
${JSON.stringify(xml, undefined, 1)}
\`\`\`

doesn't meet Autoanki's expectation.
It's likely corrupted.

Reason: ${error.toString()}`
        );
      } else {
        throw new AutoankiNoteFromAnkiError('Unknown reason');
      }
    }
  }

  const sourceContent: AutoankiNoteFieldMetadata = {
    storedHash:
      field[AUTOANKI_TAGS.METADATA]['@_attributes'][
        'data-autoanki-source-content-hash'
      ],
    content: getOriginalContent(
      unescape(field[AUTOANKI_TAGS.SOURCE_CONTENT]['#text'])
    ),
    computedHash: '',
    fieldChanged: false,
  };
  sourceContent.computedHash = await hashContent(sourceContent.content);
  sourceContent.fieldChanged =
    sourceContent.computedHash !== sourceContent.storedHash;

  const finalContent: AutoankiNoteFieldMetadata = {
    storedHash:
      field[AUTOANKI_TAGS.METADATA]['@_attributes'][
        'data-autoanki-final-content-hash'
      ],
    content: getOriginalContent(field[AUTOANKI_TAGS.FINAL_CONTENT]['#text']),
    computedHash: '',
    fieldChanged: false,
  };
  finalContent.computedHash = await hashContent(finalContent.content);
  finalContent.fieldChanged =
    finalContent.computedHash !== finalContent.storedHash;

  return {
    raw: ankiNoteFieldContent,
    sourceContent,
    finalContent,
    uuid: field[AUTOANKI_TAGS.METADATA]['@_attributes']['data-autoanki-uuid'],
    modelName:
      field[AUTOANKI_TAGS.METADATA]['@_attributes']['data-autoanki-note-type'],
    tags: field[AUTOANKI_TAGS.METADATA]['@_attributes']['data-autoanki-tags'],
  } as AutoankiNoteFieldFromAnki;
}

export async function hasFieldContentChanged(
  content: string,
  field: AutoankiNoteFieldMetadata
): Promise<boolean> {
  return (await hashContent(content)) !== field.storedHash;
}
