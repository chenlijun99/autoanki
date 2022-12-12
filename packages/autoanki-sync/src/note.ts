import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import { toString } from 'hast-util-to-string';

import type { NoteTypes } from '@autoanki/anki-connect';
import type { AutoankiNote } from '@autoanki/core';

import { AutoankiNoteFromAnkiError, ConcernedSide } from './common.js';
import {
  AutoankiNoteFieldMetadata,
  getAnkiNoteField,
  getAutoankiNoteField,
  hasFieldContentChanged,
} from './note-field.js';

/**
 * Data type of Autoanki note retrieved from anki
 */
export interface AutoankiNoteFromAnki {
  /**
   * The id of the note in the Anki database
   */
  id: number;
  uuid: string;
  /**
   * Note type
   */
  modelName: {
    actual: string;
    stored: string;
    changed: boolean;
  };
  /**
   * Tags
   */
  tags: {
    actual: string[];
    stored: string[];
    changed: boolean;
  };
  /**
   * The raw content of the Anki note
   */
  rawFields: NoteTypes.NewNote['fields'];
  /**
   * The note content as written in the source file.
   */
  fieldsSourceContent: Record<
    keyof NoteTypes.NewNote['fields'],
    AutoankiNoteFieldMetadata
  >;
  /**
   * The portion of the note content that is actually shown to the user. It is
   * the result of the whole note parsing and transformation pipeline of
   * @autoanki/core.
   */
  fieldsFinalContent: Record<
    keyof NoteTypes.NewNote['fields'],
    AutoankiNoteFieldMetadata
  >;
  scriptMediaFiles: string[];
  styleMediaFiles: string[];
}

export async function autoankiNoteToAnkiConnectNewNote(
  newNote: AutoankiNote,
  noteTypeFields: string[]
): Promise<NoteTypes.NewNote> {
  const fields: NoteTypes.NewNote['fields'] = {};
  await Promise.all(
    noteTypeFields.map(async (fieldName) => {
      fields[fieldName] = await getAnkiNoteField(
        newNote,
        newNote.fields[fieldName] ?? '',
        newNote.autoanki.sourceContentFields[fieldName] ?? ''
      );
    })
  );

  return {
    fields,
    deckName: newNote.deckName,
    modelName: newNote.modelName,
    options: newNote.options ?? {
      // By default allow duplicate.
      allowDuplicate: true,
    },
    tags: newNote.tags,
  };
}

interface MetadataFromField<T> {
  fieldName: string;
  value: T;
}

class InconsistentMetadataError<T> extends AutoankiNoteFromAnkiError {
  constructor(
    metadataName: string,
    lhs: MetadataFromField<T>,
    rhs: MetadataFromField<T>
  ) {
    super(`Metadata corruption. ${metadataName} from all the fields must be equal,\
           but field ${lhs.fieldName} has "${lhs.value}"\
           while field ${rhs.fieldName} has ${rhs.value}`);
    this.name = this.constructor.name;
  }
}

function equal<T>(a: T, b: T): boolean {
  return a === b;
}
function arrayEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0, length = a.length; i < length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

export async function ankiConnectNoteInfoToAutoankiNote(
  noteInfoFromAnki: NoteTypes.NoteInfo
): Promise<AutoankiNoteFromAnki> {
  const rawFields = Object.entries(noteInfoFromAnki.fields).reduce(
    (fields, [fieldName, field]) => {
      fields[fieldName] = field.value;
      return fields;
    },
    {} as AutoankiNoteFromAnki['rawFields']
  );

  if (Object.keys(rawFields).length === 0) {
    throw new AutoankiNoteFromAnkiError(
      'Note with zero fields. Should never happen.'
    );
  }

  const autoankiNoteFields = await Promise.all(
    Object.entries(rawFields).map(async ([fieldName, fieldContent]) => {
      return [
        fieldName,
        await getAutoankiNoteField(fieldName, fieldContent),
      ] as const;
    })
  );

  const sourceSubfields: AutoankiNoteFromAnki['fieldsSourceContent'] = {};
  const contentSubfields: AutoankiNoteFromAnki['fieldsFinalContent'] = {};
  const uuid: string = autoankiNoteFields[0][1].uuid;
  const tags: string = autoankiNoteFields[0][1].tags;
  const modelName: string = autoankiNoteFields[0][1].modelName;
  const scriptMediaFiles: string[] = autoankiNoteFields[0][1].scriptMediaFiles;
  const styleMediaFiles: string[] = autoankiNoteFields[0][1].styleMediaFiles;

  for (const [i, [fieldName, field]] of autoankiNoteFields.entries()) {
    sourceSubfields[fieldName] = field.sourceContent;
    contentSubfields[fieldName] = field.finalContent;

    // metadata consistency check
    if (i > 0) {
      for (const check of [
        ['uuid', uuid, field.uuid, equal],
        ['tags', tags, field.tags, equal],
        ['modelName', modelName, field.modelName, equal],
        [
          'scriptMediaFiles',
          scriptMediaFiles,
          field.scriptMediaFiles,
          arrayEqual,
        ],
        ['styleMediaFiles', styleMediaFiles, field.styleMediaFiles, arrayEqual],
      ] as const) {
        const checkEqual = check[3];
        const first = check[1];
        const nth = check[2];
        // @ts-ignore
        if (!checkEqual(first, nth)) {
          throw new InconsistentMetadataError(
            check[0],
            {
              fieldName: autoankiNoteFields[0][0],
              value: check[1],
            },
            {
              fieldName,
              value: check[2],
            }
          );
        }
      }
    }
  }

  return {
    id: noteInfoFromAnki.noteId,
    uuid,
    tags: {
      actual: noteInfoFromAnki.tags,
      stored: tags.split(' '),
      changed: tags !== noteInfoFromAnki.tags.join(' '),
    },
    modelName: {
      actual: noteInfoFromAnki.modelName,
      stored: modelName,
      changed: modelName !== noteInfoFromAnki.modelName,
    },
    rawFields,
    fieldsSourceContent: sourceSubfields,
    fieldsFinalContent: contentSubfields,
    scriptMediaFiles,
    styleMediaFiles,
  };
}

export interface ExistingNoteChanges {
  overallChanges: ConcernedSide;
  tagsChanges: ConcernedSide;
  modelNameChange: ConcernedSide;
  fields: Record<
    string,
    {
      availability: ConcernedSide;
      sourceContentChanges: ConcernedSide;
      finalContentChanges: ConcernedSide;
    }
  >;
  sourceContentFieldsOverallChanges: ConcernedSide;
  finalContentFieldsOverallChanges: ConcernedSide;
  fieldsOverallChanges: ConcernedSide;
  scriptMediaFilesChanges: ConcernedSide;
  styleMediaFilesChanges: ConcernedSide;
}

const processor = unified().use(rehypeParse, { fragment: true });
function htmlToText(html: string): string {
  const ast = processor.parse(html);
  return toString(ast);
}

export async function computeNoteChanges(
  fromSource: AutoankiNote,
  fromAnki: AutoankiNoteFromAnki,
  moreAccurateFinalContentChangeDetection: boolean
): Promise<ExistingNoteChanges> {
  /*
   * Check tags changes
   */
  let tagsChanges: ExistingNoteChanges['tagsChanges'] = ConcernedSide.NoSide;
  {
    const sourceTags = fromSource.tags.sort().join(' ');
    const actualTagsInAnki = fromAnki.tags.actual.sort().join(' ');
    const storedTagsInAnki = fromAnki.tags.stored.sort().join(' ');
    if (sourceTags !== actualTagsInAnki) {
      if (sourceTags !== storedTagsInAnki) {
        tagsChanges |= ConcernedSide.Source;
      }
      if (fromAnki.tags.changed) {
        tagsChanges |= ConcernedSide.Anki;
      }
    }
  }

  /*
   * Check note type changes
   */
  let modelNameChange: ExistingNoteChanges['modelNameChange'] =
    ConcernedSide.NoSide;
  if (fromSource.modelName !== fromAnki.modelName.actual) {
    if (fromSource.modelName !== fromAnki.modelName.stored) {
      modelNameChange |= ConcernedSide.Source;
    }
    if (fromAnki.modelName.changed) {
      modelNameChange |= ConcernedSide.Anki;
    }
  }

  let sourceContentFieldsOverallChanges: ExistingNoteChanges['overallChanges'] =
    ConcernedSide.NoSide;
  let finalContentFieldsOverallChanges: ExistingNoteChanges['overallChanges'] =
    ConcernedSide.NoSide;

  const fields: ExistingNoteChanges['fields'] = {};
  for (const fieldName of [
    ...Object.keys(fromSource.autoanki.sourceContentFields),
    ...Object.keys(fromAnki.rawFields),
  ]) {
    fields[fieldName] = {
      availability: ConcernedSide.NoSide,
      finalContentChanges: ConcernedSide.NoSide,
      sourceContentChanges: ConcernedSide.NoSide,
    };
  }

  /*
   * Check whether there are source content changes from the note source.
   */
  for (const [fieldName, field] of Object.entries(
    fromSource.autoanki.sourceContentFields
  )) {
    fields[fieldName].availability |= ConcernedSide.Source;
    if (
      !fromAnki.fieldsSourceContent[fieldName] ||
      (await hasFieldContentChanged(
        field,
        fromAnki.fieldsSourceContent[fieldName]
      ))
    ) {
      sourceContentFieldsOverallChanges |= ConcernedSide.Source;
      fields[fieldName].sourceContentChanges |= ConcernedSide.Source;
    }
  }

  /*
   * Check whether there are final content changes from the note source.
   *
   * NOTE that even if the note source has not changed at all, the final
   * content could still change.
   *
   * E.g.
   *
   * * The transformer plugin has been updated and now adds something new.
   * * A media references by the source note has been edited.
   * * etc.
   */
  for (const [fieldName, field] of Object.entries(fromSource.fields)) {
    fields[fieldName].availability |= ConcernedSide.Source;
    if (
      !fromAnki.fieldsFinalContent[fieldName] ||
      (await hasFieldContentChanged(
        field,
        fromAnki.fieldsFinalContent[fieldName]
      ))
    ) {
      finalContentFieldsOverallChanges |= ConcernedSide.Source;
      fields[fieldName].finalContentChanges |= ConcernedSide.Source;
    }
  }

  /*
   * Check whether there are content changes from the Anki.
   */
  for (const fieldName of Object.keys(fromAnki.rawFields)) {
    fields[fieldName].availability |= ConcernedSide.Anki;
    if (fromAnki.fieldsSourceContent[fieldName].fieldChanged) {
      sourceContentFieldsOverallChanges |= ConcernedSide.Anki;
      fields[fieldName].sourceContentChanges |= ConcernedSide.Anki;
    }

    let finalContentChanged =
      fromAnki.fieldsFinalContent[fieldName].fieldChanged;
    if (
      finalContentChanged &&
      moreAccurateFinalContentChangeDetection &&
      !!fromSource.fields[fieldName]
    ) {
      /*
       * Sometimes the Anki-desktop editor may automatically perform cosmetic
       * changes to the HTML (that don't impact the actual rendered textual
       * content). E.g. escaping of named entities, indentation, etc.
       * If `moreAccurateFinalContentChangeDetection` is enabled,
       * we extract the text from HTML and check whether they do indeed
       * differ to it was just a HTML differnece.
       */
      finalContentChanged =
        htmlToText(fromAnki.fieldsFinalContent[fieldName].content) !==
        htmlToText(fromSource.fields[fieldName]);
    }

    if (finalContentChanged) {
      finalContentFieldsOverallChanges |= ConcernedSide.Anki;
      fields[fieldName].finalContentChanges |= ConcernedSide.Anki;
    }
  }

  /*
   * Check changes in media
   *
   * For now we assume that only the source changes the media files
   */
  const scriptMediaFilesChanges = arrayEqual(
    fromSource.scriptFiles.map((file) => file.metadata.storedFilename),
    fromAnki.scriptMediaFiles
  )
    ? ConcernedSide.NoSide
    : ConcernedSide.Source;
  const styleMediaFilesChanges = arrayEqual(
    fromSource.styleFiles.map((file) => file.metadata.storedFilename),
    fromAnki.styleMediaFiles
  )
    ? ConcernedSide.NoSide
    : ConcernedSide.Source;

  return {
    overallChanges:
      sourceContentFieldsOverallChanges |
      finalContentFieldsOverallChanges |
      tagsChanges |
      modelNameChange |
      scriptMediaFilesChanges |
      styleMediaFilesChanges,
    tagsChanges,
    modelNameChange,
    fields,
    sourceContentFieldsOverallChanges,
    finalContentFieldsOverallChanges,
    fieldsOverallChanges:
      sourceContentFieldsOverallChanges | finalContentFieldsOverallChanges,
    scriptMediaFilesChanges,
    styleMediaFilesChanges,
  };
}
