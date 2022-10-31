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
  anyFieldsSourceContentChanged: boolean;
  /**
   * The portion of the note content that is actually shown to the user. It is
   * the result of the whole note parsing and transformation pipeline of
   * @autoanki/core.
   */
  fieldsFinalContent: Record<
    keyof NoteTypes.NewNote['fields'],
    AutoankiNoteFieldMetadata
  >;
  anyFieldsFinalContentChanged: boolean;
}

export async function autoankiNoteToAnkiConnectNewNote(
  newNote: AutoankiNote
): Promise<NoteTypes.NewNote> {
  const fields: NoteTypes.NewNote['fields'] = {};
  await Promise.all(
    Object.entries(newNote.fields).map(async ([name, content]) => {
      fields[name] = await getAnkiNoteField(
        newNote,
        content,
        newNote.autoanki.sourceContentFields[name]
      );
    })
  );

  return {
    fields,
    deckName: newNote.deckName,
    modelName: newNote.modelName,
    audio: newNote.audio,
    video: newNote.video,
    options: newNote.options,
    picture: newNote.picture,
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
  let uuid: string = autoankiNoteFields[0][1].uuid;
  let tags: string = autoankiNoteFields[0][1].tags;
  let modelName: string = autoankiNoteFields[0][1].modelName;
  let anySourceSubfieldsChanged = false;
  let anyContentSubfieldsChanged = false;

  for (const [i, [fieldName, field]] of autoankiNoteFields.entries()) {
    sourceSubfields[fieldName] = field.sourceContent;
    anySourceSubfieldsChanged ||= field.sourceContent.fieldChanged;
    contentSubfields[fieldName] = field.finalContent;
    anyContentSubfieldsChanged ||= field.finalContent.fieldChanged;

    // metadata consistency check
    if (i > 0) {
      for (const check of [
        ['uuid', uuid, field.uuid],
        ['tags', tags, field.tags],
        ['modelName', modelName, field.modelName],
      ] as const) {
        if (check[1] !== check[2]) {
          throw new InconsistentMetadataError(
            check[0],
            {
              fieldName: autoankiNoteFields[0][0],
              value: check[1],
            },
            {
              fieldName: fieldName,
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
    anyFieldsSourceContentChanged: anySourceSubfieldsChanged,
    fieldsFinalContent: contentSubfields,
    anyFieldsFinalContentChanged: anyContentSubfieldsChanged,
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
  fieldsOverallChanges: ConcernedSide;
}

export async function computeNoteChanges(
  fromSource: AutoankiNote,
  fromAnki: AutoankiNoteFromAnki
): Promise<ExistingNoteChanges> {
  let overallChanges: ExistingNoteChanges['overallChanges'] =
    ConcernedSide.NoSide;
  let tagsChanges: ExistingNoteChanges['tagsChanges'] = ConcernedSide.NoSide;
  {
    // TODO: support order insensitive tags comparison
    const sourceTgas = fromSource.tags.join(' ');
    const actualTagsInAnki = fromAnki.tags.actual.join(' ');
    const storedTagsInAnki = fromAnki.tags.stored.join(' ');
    if (sourceTgas !== actualTagsInAnki) {
      if (sourceTgas !== storedTagsInAnki) {
        overallChanges |= ConcernedSide.Source;
        tagsChanges |= ConcernedSide.Source;
      }
      if (fromAnki.tags.changed) {
        overallChanges |= ConcernedSide.Anki;
        tagsChanges |= ConcernedSide.Anki;
      }
    }
  }

  let modelNameChange: ExistingNoteChanges['modelNameChange'] =
    ConcernedSide.NoSide;
  if (fromSource.modelName !== fromAnki.modelName.actual) {
    if (fromSource.modelName !== fromAnki.modelName.stored) {
      overallChanges |= ConcernedSide.Source;
      modelNameChange |= ConcernedSide.Source;
    }
    if (fromAnki.modelName.changed) {
      overallChanges |= ConcernedSide.Anki;
      modelNameChange |= ConcernedSide.Anki;
    }
  }

  let fieldsOverallChanges: ExistingNoteChanges['overallChanges'] =
    ConcernedSide.NoSide;
  let fields: ExistingNoteChanges['fields'] = {};
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
      overallChanges |= ConcernedSide.Source;
      fieldsOverallChanges |= ConcernedSide.Source;
      fields[fieldName].sourceContentChanges |= ConcernedSide.Source;
    }
  }

  for (const [fieldName, field] of Object.entries(fromSource.fields)) {
    fields[fieldName].availability |= ConcernedSide.Source;
    if (
      !fromAnki.fieldsFinalContent[fieldName] ||
      (await hasFieldContentChanged(
        field,
        fromAnki.fieldsFinalContent[fieldName]
      ))
    ) {
      overallChanges |= ConcernedSide.Source;
      fieldsOverallChanges |= ConcernedSide.Source;
      fields[fieldName].finalContentChanges |= ConcernedSide.Source;
    }
  }

  for (const fieldName of Object.keys(fromAnki.rawFields)) {
    fields[fieldName].availability |= ConcernedSide.Anki;
    if (fromAnki.fieldsSourceContent[fieldName].fieldChanged) {
      overallChanges |= ConcernedSide.Anki;
      fieldsOverallChanges |= ConcernedSide.Anki;
      fields[fieldName].sourceContentChanges |= ConcernedSide.Anki;
    }
    if (fromAnki.fieldsFinalContent[fieldName].fieldChanged) {
      overallChanges |= ConcernedSide.Anki;
      fieldsOverallChanges |= ConcernedSide.Anki;
      fields[fieldName].finalContentChanges |= ConcernedSide.Anki;
    }
  }

  return {
    overallChanges,
    tagsChanges,
    modelNameChange,
    fields,
    fieldsOverallChanges,
  };
}
