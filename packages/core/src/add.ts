import { AnkiConnectService, NoteTypes } from '@autoanki/anki-connect';

import { AutoAnkiConfiguration } from './config';
import { parse, Note, checkSemanticErrors } from './internal/parse';
import { createDeckIfNotExisisting } from './internal/utils';

interface AddAction {
  noteToBeAdded: Note;
  similarNotes: { ankiNote: NoteTypes.NoteInfo; similarity: number }[];
  confirmToAdd?: boolean;
}

export class AddOperation {
  constructor(
    private service: AnkiConnectService,
    private actions: AddAction[],
    private text: string,
    private deck: string
  ) {}

  /**
   * Whether the operation is complete and can be executed, or there are pending actions
   */
  get isComplete(): boolean {
    return (
      this.actions.reduce((decisionTakenCnt, action) => {
        return decisionTakenCnt + Number(action.confirmToAdd !== undefined);
      }, 0) === this.actions.length
    );
  }

  async execute() {
    const notes: NoteTypes.Note[] = this.actions
      .filter((action) => action.confirmToAdd === true)
      .map((action) => {
        return {
          fields: action.noteToBeAdded.fields,
          options: {
            allowDuplicate: true,
          },
          deckName: this.deck,
          modelName: action.noteToBeAdded.noteType,
          tags: [],
        };
      });
    return this.service.invoke('addNotes', 6, {
      notes,
    });
  }
}

export async function add(
  service: AnkiConnectService,
  config: AutoAnkiConfiguration,
  text: string,
  deck: string
): Promise<AddOperation> {
  createDeckIfNotExisisting(service, deck);
  const notes = await parse(text, config);
  const errors = await checkSemanticErrors(service, notes);
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
    deck
  );
}
