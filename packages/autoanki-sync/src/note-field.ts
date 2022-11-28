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
import assert from '@autoanki/utils/assert.js';
import { hashContent } from '@autoanki/utils/hash.js';

import {
  AutoankiNoteFromAnkiError,
  AUTOANKI_HTML_CONSTANTS,
} from './common.js';

function getMediaTags(note: AutoankiNote): string {
  const styleTags = note.styleFiles.map((styleFile) => {
    /*
     * Create the object tag so that Anki finds the reference to the media file
     *
     * Create the style tag with the @import so that it is immediately
     * available when the note renders.
     * NOTE that <style>'s effect is global, no matter where the <style> is
     * in the document.
     * NOTE that the same <style> tag with the same imports is included
     * for multiple note-fields, but AFAIK repeated inclusion of the same
     * stylesheet should be OK. After all, CSS is declarative.
     * NOTE also that (apparently, did check the spec, just verified
     * empirically) the nice thing about this approach is that when
     * the <style> is removed (because e.g. another note is rendered),
     * also the `@import`ed stylesheet is removed. This way we don't risk
     * style clash among notes.
     * NOTE one final benefit of this approach is that the styles are visible
     * also in the Anki-deskop note editor. Now, this is generally useless,
     * because users should not use the note editor for Autoanki notes, but
     * still something nice to have.
     */
    return `
<object data="${
      styleFile.metadata.storedFilename
    }" type="text/css" declare></object>
<style>
@import "${encodeURIComponent(styleFile.metadata.storedFilename)}"
</style>
`;
  });

  const scriptTags = note.scriptFiles.map((file) => {
    return `<object
data="${file.metadata.storedFilename}"
type="application/javascript"
${
  file.scriptArgs === undefined
    ? ''
    : `data-${
        AUTOANKI_HTML_CONSTANTS.METADATA_SCRIPT_ARGS_DATA_ATTRIBUTE
      }='${JSON.stringify(file.scriptArgs)}'`
}
declare></object>`;
  });

  /*
   * Probably most media wouldn't need to have this "artificial" <object>
   * reference, as they would be already referenced using the standard HTML5
   * tags (<img>, <audio>, etc.). But plugin authors may decide to include
   * esoteric media that they then render via JavaScript.
   */
  const miscTags = note.mediaFiles.map((file) => {
    return `<object data="${file.metadata.storedFilename}" declare></object>`;
  });
  return [styleTags, scriptTags, miscTags].flat().join('\n');
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

  const [sourceContentDigest, finalContentDigest] = await Promise.all([
    hashContent(sourceContent),
    hashContent(finalContent),
  ]);
  /*
   * NOTE: we're setting contenteditable="false" on the final content tag
   * so that it is not ediable even if it is inside the Anki's note editor.
   * This should prevent normal users from accidentally making changes
   * to the final content of a note.
   *
   * NOTE: we intentionally don't insert spaces or new lines between
   * open tag and closing tag of AUTOANKI_HTML_CONSTANTS.SOURCE_CONTENT_TAG .
   * Same for AUTOANKI_HTML_CONSTANTS.FINAL_CONTENT_TAG.
   * This way, we're sure that the XML parser gives us exactly
   * our content and doesn't have initial and final spaces or new lines.
   * We can also be sure that Anki will render the content as is and not
   * have additional spaces and newlines that it may render.
   */
  return `<${AUTOANKI_HTML_CONSTANTS.SOURCE_CONTENT_TAG}>${escape(
    sourceContent
  )}</${AUTOANKI_HTML_CONSTANTS.SOURCE_CONTENT_TAG}>

<${AUTOANKI_HTML_CONSTANTS.METADATA_TAG}
 data-autoanki-uuid="${note.autoanki.uuid}"
 data-autoanki-note-type="${note.modelName}"
 data-autoanki-tags="${note.tags}"
 data-autoanki-source-content-hash="${sourceContentDigest}"
 data-autoanki-final-content-hash="${finalContentDigest}">
 ${getMediaTags(note)}
</${AUTOANKI_HTML_CONSTANTS.METADATA_TAG}>

<${
    AUTOANKI_HTML_CONSTANTS.FINAL_CONTENT_TAG
  } contenteditable="false">${finalContent}</${
    AUTOANKI_HTML_CONSTANTS.FINAL_CONTENT_TAG
  }>`;
}

const autoankiNoteFieldSchema = z.object({
  [AUTOANKI_HTML_CONSTANTS.SOURCE_CONTENT_TAG]: z
    .object({
      // can contain whatever attributes
      '@_attributes': z.object({}).optional(),
      '#text': z.string(),
    })
    .strict(),
  [AUTOANKI_HTML_CONSTANTS.FINAL_CONTENT_TAG]: z.object({
    // can contain whatever attributes
    '@_attributes': z.object({}).optional(),
    '#text': z.string(),
  }),
  [AUTOANKI_HTML_CONSTANTS.METADATA_TAG]: z.object({
    object: z.array(
      z.object({
        '@_attributes': z.object({
          data: z.string(),
          type: z.string().optional(),
        }),
      })
    ),
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
   * Script media files
   */
  scriptMediaFiles: string[];
  /**
   * Style media files
   */
  styleMediaFiles: string[];
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
    `*.${AUTOANKI_HTML_CONSTANTS.SOURCE_CONTENT_TAG}`,
    `*.${AUTOANKI_HTML_CONSTANTS.FINAL_CONTENT_TAG}`,
    `*.${AUTOANKI_HTML_CONSTANTS.METADATA_TAG}.object`,
  ],
});

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
      field[AUTOANKI_HTML_CONSTANTS.METADATA_TAG]['@_attributes'][
        'data-autoanki-source-content-hash'
      ],
    content: unescape(
      field[AUTOANKI_HTML_CONSTANTS.SOURCE_CONTENT_TAG]['#text']
    ),
    computedHash: '',
    fieldChanged: false,
  };
  sourceContent.computedHash = await hashContent(sourceContent.content);
  sourceContent.fieldChanged =
    sourceContent.computedHash !== sourceContent.storedHash;

  const finalContent: AutoankiNoteFieldMetadata = {
    storedHash:
      field[AUTOANKI_HTML_CONSTANTS.METADATA_TAG]['@_attributes'][
        'data-autoanki-final-content-hash'
      ],
    content: field[AUTOANKI_HTML_CONSTANTS.FINAL_CONTENT_TAG]['#text'],
    computedHash: '',
    fieldChanged: false,
  };
  finalContent.computedHash = await hashContent(finalContent.content);
  finalContent.fieldChanged =
    finalContent.computedHash !== finalContent.storedHash;

  const styleMediaFiles = [];
  const scriptMediaFiles = [];
  for (const obj of field['autoanki-metadata'].object) {
    if (obj['@_attributes'].type === 'text/css') {
      styleMediaFiles.push(obj['@_attributes'].data);
    }
    if (obj['@_attributes'].type === 'application/javascript') {
      scriptMediaFiles.push(obj['@_attributes'].data);
    }
  }

  return {
    raw: ankiNoteFieldContent,
    sourceContent,
    finalContent,
    scriptMediaFiles,
    styleMediaFiles,
    uuid: field[AUTOANKI_HTML_CONSTANTS.METADATA_TAG]['@_attributes'][
      'data-autoanki-uuid'
    ],
    modelName:
      field[AUTOANKI_HTML_CONSTANTS.METADATA_TAG]['@_attributes'][
        'data-autoanki-note-type'
      ],
    tags: field[AUTOANKI_HTML_CONSTANTS.METADATA_TAG]['@_attributes'][
      'data-autoanki-tags'
    ],
  } as AutoankiNoteFieldFromAnki;
}

export async function hasFieldContentChanged(
  content: string,
  field: AutoankiNoteFieldMetadata
): Promise<boolean> {
  return (await hashContent(content)) !== field.storedHash;
}
