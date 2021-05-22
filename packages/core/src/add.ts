import { AnkiConnectService, NoteTypes } from '@autoanki/anki-connect';

import { AutoAnkiConfiguration } from './config';
import { parse, Note, checkConsistency, writeMetadata } from './internal/parse';
import {
  createDeckIfNotExisisting,
  assert,
  adaptTagsToAnki,
} from './internal/utils';

interface AddAction {
  noteToBeAdded: Note;
  similarNotes: { ankiNote: NoteTypes.NoteInfo; similarity: number }[];
  confirmToAdd?: boolean;
  message?: string;
}

interface AddOperationExecutionResult {
  modifiedText: string;
  successes: Array<Note>;
  errors: Array<{ note: Note; error: Error }>;
}

export class AddOperation {
  constructor(
    private service: AnkiConnectService,
    private _actions: AddAction[],
    private text: string,
    private deck: string,
    private tags: string[]
  ) {}

  /**
   * Whether the operation is complete and can be executed, or there are pending actions
   */
  get isConfirmed(): boolean {
    return (
      this.actions.reduce((decisionTakenCnt, action) => {
        return decisionTakenCnt + Number(action.confirmToAdd !== undefined);
      }, 0) === this.actions.length
    );
  }

  /**
   * Get all the actions that this add operation wants to perform.
   *
   * DON'T MODIFY THE RETURNED VALUE.
   */
  get actions(): AddAction[] {
    return this._actions;
  }

  async execute(): Promise<AddOperationExecutionResult> {
    if (!this.isConfirmed) {
      throw new Error(
        'Operation cannot be executed if it is not fully confirmed'
      );
    }

    const positiveActions = this.actions.filter(
      (action) => action.confirmToAdd === true
    );
    const negativeActions = this.actions.filter(
      (action) => action.confirmToAdd === false
    );
    negativeActions.forEach((action) => {
      action.noteToBeAdded.metadata = {
        dontAdd: true,
      };
    });

    const notes: NoteTypes.Note[] = positiveActions.map((action) => {
      return {
        fields: action.noteToBeAdded.fields,
        options: {
          allowDuplicate: true,
        },
        deckName: this.deck,
        modelName: action.noteToBeAdded.noteType,
        tags: this.tags,
      };
    });
    const result = await this.service.invoke('addNotes', 6, {
      notes,
    });

    assert(result.length === positiveActions.length);

    const errors: AddOperationExecutionResult['errors'] = [];
    const successes: AddOperationExecutionResult['successes'] = [];
    result.forEach((addedNoteId, index) => {
      if (addedNoteId) {
        positiveActions[index].noteToBeAdded.metadata = {
          id: addedNoteId,
        };
        successes.push(positiveActions[index].noteToBeAdded);
      } else {
        errors.push({
          error: new Error('Unable to create note'),
          note: positiveActions[index].noteToBeAdded,
        });
      }
    });

    return {
      modifiedText: await writeMetadata(
        this.text,
        this.actions.map((action) => action.noteToBeAdded)
      ),
      successes,
      errors,
    };
  }
}

export async function add(
  service: AnkiConnectService,
  config: AutoAnkiConfiguration,
  text: string,
  deck: string,
  tags: string[]
): Promise<AddOperation> {
  createDeckIfNotExisisting(service, deck);

  const notes = await parse(text, config);
  const errors = await checkConsistency(service, notes);
  if (errors) {
    throw new Error();
  }
  return new AddOperation(
    service,
    notes.map((note) => {
      return {
        noteToBeAdded: note,
        similarNotes: [],
        confirmToAdd: true,
      };
    }),
    text,
    deck,
    adaptTagsToAnki(tags)
  );
}
