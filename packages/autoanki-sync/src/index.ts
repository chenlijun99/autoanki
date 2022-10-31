import differenceBy from 'lodash/differenceBy.js';

import assert from '@autoanki/utils/assert.js';
import { invoke } from '@autoanki/anki-connect';
import type {
  ApiOrigin,
  ActionNames,
  InvokeArgs,
  InvokeResponse,
  NoteTypes,
} from '@autoanki/anki-connect';
import {
  assignIdsToAutoankiNotes,
  AutoankiNote,
  writeBackAutoankiNoteUpdates,
  transformAutoankiNote,
  AUTOANKI_NOTES_DEFAULT_TAG,
  NoteInput,
} from '@autoanki/core';

import {
  AutoankiNoteFromAnki,
  autoankiNoteToAnkiConnectNewNote,
  ankiConnectNoteInfoToAutoankiNote,
  ExistingNoteChanges,
  computeNoteChanges,
} from './note.js';
import { ConcernedSide } from './common.js';
import { getAnkiNoteField } from './note-field.js';

/**
 * An "properly existing" Anki note exists in the source and in Anki.
 * A "non-properly existing" Anki note may exist in either source or in Anki.
 * Use Partial<ExistingNote> for such case.
 *
 * This data type holds also the information about the difference between
 * the note existing in the source and the note in Anki.
 * Such information is used during the sync procedure.
 */
interface ExistingNote {
  fromSource: AutoankiNote;
  fromAnki: AutoankiNoteFromAnki;
}

interface ExistingNoteWithComputedChanges {
  note: ExistingNote;
  changes: ExistingNoteChanges;
}

/**
 * The result of a sync action is an heterogenous array of:
 */
interface SyncActionResult {
  /**
   * Further sync actions that must be performed
   */
  furtherActions: SyncAction[];
  /**
   * Note sources that must be updated as a consequence of the synching.
   */
  sourcesToUpdate: NoteInput[];
}

export abstract class SyncAction {
  constructor(protected syncProcedure: SyncProcedure) {}
  public abstract execute(..._args: unknown[]): Promise<SyncActionResult>;
}

export abstract class AutomaticSyncAction extends SyncAction {
  public abstract execute(): Promise<SyncActionResult>;
}

export abstract class ManualSyncAction extends SyncAction {}

export class SyncActionCreateNotesInAnki extends AutomaticSyncAction {
  constructor(
    public newNotes: AutoankiNote[],
    ...args: ConstructorParameters<typeof AutomaticSyncAction>
  ) {
    super(...args);
  }

  async execute() {
    this.newNotes = await assignIdsToAutoankiNotes(this.newNotes);
    const newAnkiConnectNotes = await Promise.all(
      this.newNotes.map((newNote) => autoankiNoteToAnkiConnectNewNote(newNote))
    );
    const createdNoteIds = await this.syncProcedure._invoke({
      action: 'addNotes',
      request: {
        notes: newAnkiConnectNotes,
      },
    });
    const result: SyncActionResult = {
      furtherActions: [],
      sourcesToUpdate: [],
    };
    for (const [i, id] of createdNoteIds.entries()) {
      if (!id) {
        throw new Error(
          `Unable to create note ${JSON.stringify(newAnkiConnectNotes[i])}`
        );
      }
    }
    result.sourcesToUpdate = await writeBackAutoankiNoteUpdates(this.newNotes);
    return result;
  }
}

function arrayChanges<T>(
  oldItems: T[],
  newItems: T[],
  iteratee: (el: T) => any = (item) => item
): { added: T[]; removed: T[] } {
  return {
    added: differenceBy(newItems, oldItems, iteratee),
    removed: differenceBy(oldItems, newItems, iteratee),
  };
}

export class SyncActionUpdateNotesInAnki extends AutomaticSyncAction {
  constructor(
    public notesToUpdate: ExistingNoteWithComputedChanges[],
    ...args: ConstructorParameters<typeof AutomaticSyncAction>
  ) {
    super(...args);
  }

  async execute() {
    await Promise.all(
      this.notesToUpdate.map(async (note) => {
        assert(note.changes.overallChanges === ConcernedSide.Source);
        if (note.changes.tagsChanges === ConcernedSide.Anki) {
          const { added, removed } = arrayChanges(
            note.note.fromAnki.tags.actual,
            note.note.fromSource.tags
          );
          const ops = [];
          if (added.length > 0) {
            ops.push(
              this.syncProcedure._invoke({
                action: 'addTags',
                request: {
                  tags: added.join(' '),
                  notes: [note.note.fromAnki.id],
                },
              })
            );
          }
          if (removed.length > 0) {
            ops.push(
              this.syncProcedure._invoke({
                action: 'removeTags',
                request: {
                  tags: removed.join(' '),
                  notes: [note.note.fromAnki.id],
                },
              })
            );
          }
          await Promise.all(ops);
        }
        if (note.changes.modelNameChange === ConcernedSide.Source) {
          throw new Error('Unspported note type change');
        }
        if (note.changes.fieldsOverallChanges === ConcernedSide.Source) {
          const updatedFields: NoteTypes.UpdateNote['fields'] = {};
          for (const [fieldName, field] of Object.entries(
            note.changes.fields
          )) {
            if (
              field.sourceContentChanges === ConcernedSide.Source ||
              field.finalContentChanges === ConcernedSide.Source
            ) {
              updatedFields[fieldName] = await getAnkiNoteField(
                note.note.fromSource,
                note.note.fromSource.fields[fieldName],
                note.note.fromSource.autoanki.sourceContentFields[fieldName]
              );
            }
          }
          this.syncProcedure._invoke({
            action: 'updateNoteFields',
            request: {
              note: {
                id: note.note.fromAnki.id,
                fields: updatedFields,
              },
            },
          });
        }
      })
    );

    return {
      furtherActions: [],
      sourcesToUpdate: [],
    };
  }
}

export class SyncActionUpdateNotesInSource extends AutomaticSyncAction {
  constructor(
    public notesToUpdate: ExistingNoteWithComputedChanges[],
    ...args: ConstructorParameters<typeof AutomaticSyncAction>
  ) {
    super(...args);
  }

  async execute(): Promise<SyncActionResult> {
    const updated = this.notesToUpdate.map((note) => {
      const updatedNote = note.note.fromSource;
      assert(note.changes.overallChanges === ConcernedSide.Anki);
      if (note.changes.tagsChanges === ConcernedSide.Anki) {
        updatedNote.tags = note.note.fromAnki.tags.actual;
      }
      if (note.changes.modelNameChange === ConcernedSide.Anki) {
        updatedNote.modelName = note.note.fromAnki.modelName.actual;
      }
      if (note.changes.fieldsOverallChanges === ConcernedSide.Anki) {
        for (const [fieldName, field] of Object.entries(note.changes.fields)) {
          assert(field.finalContentChanges === ConcernedSide.NoSide);
          if (field.sourceContentChanges === ConcernedSide.Anki) {
            updatedNote.autoanki.sourceContentFields[fieldName] =
              note.note.fromAnki.fieldsSourceContent[fieldName].content;
          }
        }
      }
      return updatedNote;
    });
    return {
      furtherActions: [],
      sourcesToUpdate: await writeBackAutoankiNoteUpdates(updated),
    };
  }
}

export class SyncActionRemoveNotesFromAnki extends AutomaticSyncAction {
  constructor(
    public notesToBeRemoved: ExistingNoteWithComputedChanges[],
    ...args: ConstructorParameters<typeof AutomaticSyncAction>
  ) {
    super(...args);
  }

  async execute(): Promise<SyncActionResult> {
    await this.syncProcedure._invoke({
      action: 'deleteNotes',
      request: {
        notes: this.notesToBeRemoved.map((note) => note.note.fromAnki.id),
      },
    });

    return { furtherActions: [], sourcesToUpdate: [] };
  }
}

export class SyncActionRemoveNotesFromSource extends AutomaticSyncAction {
  constructor(
    public notesToBeRemoved: AutoankiNote[],
    ...args: ConstructorParameters<typeof AutomaticSyncAction>
  ) {
    super(...args);
  }

  async execute(): Promise<SyncActionResult> {
    for (const note of this.notesToBeRemoved) {
      note.autoanki.deleted = true;
      delete note.autoanki.uuid;
    }
    return {
      furtherActions: [],
      sourcesToUpdate: await writeBackAutoankiNoteUpdates(
        this.notesToBeRemoved
      ),
    };
  }
}

enum HandleUpdateConflictChoice {
  PICK_SOURCE,
  PICK_ANKI,
  MERGE,
  IGNORE,
}

export class SyncActionHandleNotesUpdateConflict extends ManualSyncAction {
  constructor(
    public conflictNotes: ExistingNoteWithComputedChanges[],
    ...args: ConstructorParameters<typeof ManualSyncAction>
  ) {
    super(...args);
  }

  async execute(
    choices: HandleUpdateConflictChoice[]
  ): Promise<SyncActionResult> {
    return {
      furtherActions: [],
      sourcesToUpdate: [],
    };
  }
}

/**
 * Anki notes sync coordinator
 */
export class SyncProcedure {
  constructor(
    private notesToBeSynced: AutoankiNote[],
    private origin?: ApiOrigin
  ) {}

  private pendingSyncActions: Set<SyncAction> = new Set();

  /**
   * Sync actions that must be performed.
   *
   * This information can be used to e.g.:
   *
   * * print a dry-run report,
   * * build an UI that allows the user to visualize, select, etc. the sync
   * actions.
   * * etc.
   */
  public get syncActions(): SyncAction[] {
    return [...this.pendingSyncActions];
  }

  /**
   * Note sources that must be updated with the given content
   */
  public sourcesToWriteBack: NoteInput[] = [];

  /**
   * Whether the sync procedure has completed
   */
  public get completed(): boolean {
    return this.pendingSyncActions.size === 0;
  }

  /**
   * Start the sync procedure
   */
  public async start() {
    const existingNotesFromAnki = await this.getExistingAutoankiNotesFromAnki();
    const existingNotesFromSource: AutoankiNote[] = [];
    const newNotesFromSource: AutoankiNote[] = [];

    for (const note of this.notesToBeSynced) {
      if (note.autoanki.uuid === undefined && note.autoanki.deleted !== true) {
        newNotesFromSource.push(note);
      } else if (note.autoanki.uuid) {
        /*
         * We handle only the case the note has an UUID.
         * For a note without uuid, with only deleted marked as true, there
         * nothing we can do.
         * So we just ignore it.
         */
        existingNotesFromSource.push(note);
      }
    }

    const actions: SyncAction[] = [];

    if (newNotesFromSource.length > 0) {
      actions.push(new SyncActionCreateNotesInAnki(newNotesFromSource, this));
    }

    const existingNotesTmp: Record<string, Partial<ExistingNote>> = {};
    for (const note of existingNotesFromSource) {
      if (!existingNotesTmp[note.autoanki.uuid!]) {
        existingNotesTmp[note.autoanki.uuid!] = {};
      }
      existingNotesTmp[note.autoanki.uuid!].fromSource = note;
    }
    for (const note of existingNotesFromAnki) {
      if (!existingNotesTmp[note.uuid]) {
        existingNotesTmp[note.uuid] = {};
      }
      existingNotesTmp[note.uuid].fromAnki = note;
    }

    const onlyInSource: AutoankiNote[] = [];
    const onlyInAnki: AutoankiNoteFromAnki[] = [];
    for (const [key, existingNote] of Object.entries(existingNotesTmp)) {
      if (!(existingNote.fromAnki && existingNote.fromSource)) {
        if (existingNote.fromAnki) {
          onlyInAnki.push(existingNote.fromAnki);
        }
        if (existingNote.fromSource) {
          onlyInSource.push(existingNote.fromSource);
        }
        delete existingNotesTmp[key];
      }
    }
    if (onlyInSource.length > 0) {
      /*
       * Notes that only exist in the source => they have been deleted from
       * Anki.
       */
      actions.push(new SyncActionRemoveNotesFromSource(onlyInSource, this));
    }
    if (onlyInAnki.length > 0) {
      /*
       * Notes that only exist in Anki =>
       *
       * * the note in Anki is from a source that has not been processed this
       * time or
       * * the note has been entirely removed from source (not marked as deleted)
       */
    }

    {
      const notesExistingOnBothSides: ExistingNoteWithComputedChanges[] =
        await Promise.all(
          Object.values(existingNotesTmp).map(async (existingNote) => {
            return {
              note: existingNote,
              changes: await computeNoteChanges(
                existingNote.fromSource!,
                existingNote.fromAnki!
              ),
            } as ExistingNoteWithComputedChanges;
          })
        );

      const bothUpdated: ExistingNoteWithComputedChanges[] = [];
      const updatedOnlyInAnki: ExistingNoteWithComputedChanges[] = [];
      const updatedOnlyInSource: ExistingNoteWithComputedChanges[] = [];
      const newlyMarkedAsDeletedInSource: ExistingNoteWithComputedChanges[] =
        [];

      for (const note of Object.values(notesExistingOnBothSides)) {
        if (note.note.fromAnki.anyFieldsFinalContentChanged) {
          throw new Error('Not handled');
        }

        if (note.note.fromSource.autoanki.deleted) {
          newlyMarkedAsDeletedInSource.push(note);
        } else if (
          note.changes.overallChanges & ConcernedSide.Source &&
          note.changes.overallChanges & ConcernedSide.Anki
        ) {
          bothUpdated.push(note);
        } else if (note.changes.overallChanges & ConcernedSide.Anki) {
          updatedOnlyInAnki.push(note);
        } else if (note.changes.overallChanges & ConcernedSide.Source) {
          updatedOnlyInSource.push(note);
        }
      }

      if (newlyMarkedAsDeletedInSource.length > 0) {
        actions.push(
          new SyncActionRemoveNotesFromAnki(newlyMarkedAsDeletedInSource, this)
        );
      }
      if (bothUpdated.length > 0) {
        actions.push(
          new SyncActionHandleNotesUpdateConflict(bothUpdated, this)
        );
      }
      if (updatedOnlyInAnki.length > 0) {
        actions.push(
          new SyncActionUpdateNotesInSource(updatedOnlyInAnki, this)
        );
      }
      if (updatedOnlyInSource.length > 0) {
        actions.push(
          new SyncActionUpdateNotesInAnki(updatedOnlyInSource, this)
        );
      }
    }

    this.pendingSyncActions = new Set(actions);
  }

  public async runAllAutomaticActions() {
    for (const action of this.pendingSyncActions) {
      if (action instanceof AutomaticSyncAction) {
        await this.runAction(action);
      }
    }
  }

  public async runAction<T extends SyncAction>(
    action: T,
    ...args: Parameters<T['execute']>
  ) {
    this.pendingSyncActions.delete(action);

    const result = await action.execute(...args);
    this.sourcesToWriteBack.push(...result.sourcesToUpdate);

    const furtherActions: SyncAction[] = result.furtherActions;
    for (const a of furtherActions) {
      if (a instanceof AutomaticSyncAction) {
        const res = await a.execute();
        furtherActions.push.apply(res.furtherActions);
        this.sourcesToWriteBack.push(...result.sourcesToUpdate);
      } else if (a instanceof ManualSyncAction) {
        this.pendingSyncActions.add(a);
      }
    }
  }

  /**
   * Wrapper of anki-connect's `invoke` function with the configured
   * origin.
   *
   * @internal
   */
  public _invoke<ActionName extends ActionNames>(
    args: Omit<InvokeArgs<ActionName, 6>, 'version' | 'origin'>
  ): Promise<InvokeResponse<ActionName, 6>> {
    return invoke({
      ...args,
      version: 6,
      origin: this.origin,
    });
  }

  private async getExistingAutoankiNotesFromAnki(): Promise<
    AutoankiNoteFromAnki[]
  > {
    const exisistingAutoankiNoteIds = await this._invoke({
      action: 'findNotes',
      request: {
        query: `tag:${AUTOANKI_NOTES_DEFAULT_TAG}`,
      },
    });
    const noteInfos = await this._invoke({
      action: 'notesInfo',
      request: {
        notes: exisistingAutoankiNoteIds,
      },
    });
    return Promise.all(
      noteInfos.map((noteInfo) => ankiConnectNoteInfoToAutoankiNote(noteInfo))
    );
  }
}
