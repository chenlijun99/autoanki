/*
 * We disable no-await-in-loop rule for this file because surprinsingly,
 * performing Anki-connect requests one after another is much faster
 * than performing all the requests concurrently.
 */
/* eslint-disable no-await-in-loop */

import difference from 'lodash/difference.js';
import differenceBy from 'lodash/differenceBy.js';
import { z } from 'zod';

import assert from '@autoanki/utils/assert.js';
import { invoke, ModelTypes } from '@autoanki/anki-connect';
import type {
  ApiOrigin,
  ActionNames,
  InvokeArgs,
  InvokeResponse,
  NoteTypes,
} from '@autoanki/anki-connect';
import {
  assignIdsToAutoankiNotes,
  writeBackAutoankiNoteUpdates,
  transformAutoankiNote,
  parseMediaFileMetadataFromFilename,
  consoleLogger,
  AUTOANKI_NOTES_DEFAULT_TAG,
  AUTOANKI_MEDIA_PREFIX,
} from '@autoanki/core';
import type {
  AutoankiNote,
  NoteInput,
  AutoankiMediaFile,
  AutoankiMediaFileMetadata,
  Logger,
} from '@autoanki/core';

import {
  AutoankiNoteFromAnki,
  autoankiNoteToAnkiConnectNewNote,
  ankiConnectNoteInfoToAutoankiNote,
  ExistingNoteChanges,
  computeNoteChanges,
} from './note.js';
import { AutoankiSyncError, ConcernedSide } from './common.js';
import { getAnkiNoteField } from './note-field.js';
import { updateNoteTemplatesIfNecessary } from './note-template.js';
import { ankiBridgeScriptMediaFile } from './plugin/index.js';

/**
 * Export the plugin provided by autoanki-sync as default
 */
export { default } from './plugin/index.js';

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

export interface Class<T> extends Function {
  new (...args: any[]): T;
}
export abstract class ManualSyncAction extends SyncAction {
  private static _manualSyncActions: Record<string, ManualSyncActionClass> = {};

  static getActionName(action: ManualSyncAction): string {
    return (action.constructor as ManualSyncActionClass).actionName;
  }

  static get manualSyncActions(): Readonly<
    Record<string, ManualSyncActionClass>
  > {
    return ManualSyncAction._manualSyncActions;
  }

  static registerManualSyncAction(actionClass: ManualSyncActionClass): void {
    this._manualSyncActions[actionClass.actionName] = actionClass;
  }
}

interface ManualSyncActionClass extends Class<ManualSyncAction> {
  /**
   * We could rely on the class name, but it is subject to change due to
   * minification.
   * We could configure the minification tool to keep the class names,
   * but that's another tooling complexity that we'd like to avoid.
   */
  actionName: string;
  choices: string[];
}

export class SyncActionCreateDecks extends AutomaticSyncAction {
  constructor(
    public decks: string[],
    ...args: ConstructorParameters<typeof AutomaticSyncAction>
  ) {
    super(...args);
  }

  async execute() {
    await Promise.all(
      this.decks.map((deck) => {
        return this.syncProcedure._invoke({
          action: 'createDeck',
          request: {
            deck,
          },
        });
      })
    );

    return {
      furtherActions: [],
      sourcesToUpdate: [],
    };
  }
}

export class SyncActionUpdateInjectedScriptsInModelTemplates extends AutomaticSyncAction {
  constructor(
    private notes: AutoankiNote[],
    ...args: ConstructorParameters<typeof AutomaticSyncAction>
  ) {
    super(...args);
  }

  private noteTypesTemplatesToBeUpdated: Record<
    ModelTypes.ModelName,
    ModelTypes.ModelTemplates
  > = {};

  get noteTypesThatRequireInstrumentation(): string[] {
    return Object.keys(this.noteTypesTemplatesToBeUpdated);
  }

  async retrieveNoteTypesThatRequireUpdate(): Promise<void> {
    const noteTypes = Array.from(
      new Set(this.notes.map((note) => note.modelName))
    );
    const noteTypesToBeUpdated = await Promise.all(
      noteTypes.map(async (noteType) => {
        const noteTypeTemplates = await this.syncProcedure._invoke({
          action: 'modelTemplates',
          request: {
            modelName: noteType,
          },
        });

        return [
          noteType,
          await updateNoteTemplatesIfNecessary(noteTypeTemplates, [
            ankiBridgeScriptMediaFile,
          ]),
        ] as const;
      })
    );

    this.noteTypesTemplatesToBeUpdated = noteTypesToBeUpdated
      .filter(([_, updatedTemplate]) => !!updatedTemplate)
      .reduce((obj, [noteType, updatedTemplate]) => {
        obj[noteType] = updatedTemplate!;
        return obj;
      }, {} as typeof this.noteTypesTemplatesToBeUpdated);
  }

  async execute() {
    await Promise.all(
      Object.entries(this.noteTypesTemplatesToBeUpdated).map(
        ([noteType, updatedTemplate]) => {
          return this.syncProcedure._invoke({
            action: 'updateModelTemplates',
            request: {
              model: {
                name: noteType,
                templates: updatedTemplate,
              },
            },
          });
        }
      )
    );

    return {
      furtherActions: [],
      sourcesToUpdate: [],
    };
  }
}

export class SyncActionCreateNotesInAnki extends AutomaticSyncAction {
  constructor(
    public newNotes: AutoankiNote[],
    ...args: ConstructorParameters<typeof AutomaticSyncAction>
  ) {
    super(...args);
  }

  async execute() {
    this.newNotes = await assignIdsToAutoankiNotes(this.newNotes);
    await this.syncProcedure._sendNonExistingMediaFilesOfNotesToAnki(
      this.newNotes
    );
    const newAnkiConnectNotes = await Promise.all(
      this.newNotes.map((newNote) => {
        const fields = this.syncProcedure._existingNoteTypes[newNote.modelName];
        assert(fields !== undefined);
        return autoankiNoteToAnkiConnectNewNote(newNote, fields);
      })
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
          `Unable to create note. Could it be a duplicate?\n${JSON.stringify(
            this.newNotes[i].autoanki.metadata.parsedNote,
            undefined,
            2
          )}`
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
    await this.syncProcedure._sendNonExistingMediaFilesOfNotesToAnki(
      this.notesToUpdate.map((note) => note.note.fromSource)
    );
    for (const note of this.notesToUpdate) {
      /*
       * NOTE that in general the following assertion is not true.
       * `SyncActionUpdateNotesInAnki` may also be used for notes
       * updated in both directions, if that is what the user manually
       * decided to do.
       */
      // assert(note.changes.overallChanges === ConcernedSide.Source);
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
      if (note.changes.modelNameChange !== ConcernedSide.NoSide) {
        throw new Error('Unspported note type change');
      }

      /*
       * Note fields must be always updated, since they contain the whole set
       * of metadata that for sure must be updated as long as anything else is
       * updated.
       */
      const updatedFields: NoteTypes.UpdateNote['fields'] = {};
      await Promise.all(
        this.syncProcedure._existingNoteTypes[
          note.note.fromSource.modelName
        ].map(async (fieldName) => {
          updatedFields[fieldName] = await getAnkiNoteField(
            note.note.fromSource,
            note.note.fromSource.fields[fieldName] ?? '',
            note.note.fromSource.autoanki.sourceContentFields[fieldName] ?? ''
          );
        })
      );
      await this.syncProcedure._invoke({
        action: 'updateNoteFields',
        request: {
          note: {
            id: note.note.fromAnki.id,
            fields: updatedFields,
          },
        },
      });
    }

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
    const updatedNoteWithRecomputedChanges = await Promise.all(
      this.notesToUpdate.map(async (note) => {
        const updatedNote = note.note.fromSource;
        /*
         * NOTE that in general the following assertion is not true.
         * `SyncActionUpdateNotesInSource` may also be used for notes
         * updated in both directions, if that is what the user manually
         * decided to do.
         */
        // assert(note.changes.overallChanges === ConcernedSide.Anki);

        updatedNote.tags = note.note.fromAnki.tags.actual;
        updatedNote.modelName = note.note.fromAnki.modelName.actual;
        for (const fieldName of Object.keys(note.changes.fields)) {
          updatedNote.autoanki.sourceContentFields[fieldName] =
            note.note.fromAnki.fieldsSourceContent[fieldName].content;
        }

        /*
         * Updated the source content of the note. Re-transform it.
         */
        await transformAutoankiNote(updatedNote);
        return {
          note: {
            fromAnki: note.note.fromAnki,
            fromSource: updatedNote,
          },
          changes: {
            ...(await computeNoteChanges(
              updatedNote,
              note.note.fromAnki,
              // at this point we're sure that there is no need
              false
            )),
            /*
             * Maybe there is the difference between the updatedNote and the
             * note from Anki (only if the transformation produced the same
             * final content even though the source content changed).
             * Force that there is some change from the source. At least we
             * must update the metadata in Anki.
             */
            overallChanges: ConcernedSide.Source,
          },
        } as ExistingNoteWithComputedChanges;
      })
    );

    const sourcesToUpdate = await writeBackAutoankiNoteUpdates(
      updatedNoteWithRecomputedChanges.map((note) => note.note.fromSource)
    );

    return {
      furtherActions: [
        /*
         * After a note is updated in the source and re-transformed,
         * it needs to be updated also in Anki, because:
         *
         * * The metadata in the note fields must be updated.
         * * The final content result of the transformation most probably must
         * be updated.
         */
        new SyncActionUpdateNotesInAnki(
          updatedNoteWithRecomputedChanges,
          this.syncProcedure
        ),
      ],
      sourcesToUpdate,
    };
  }
}

export class SyncActionRemoveNotesFromAnki extends AutomaticSyncAction {
  constructor(
    public concernedNotes: AutoankiNoteFromAnki[],
    ...args: ConstructorParameters<typeof AutomaticSyncAction>
  ) {
    super(...args);
  }

  async execute(): Promise<SyncActionResult> {
    await this.syncProcedure._invoke({
      action: 'deleteNotes',
      request: {
        notes: this.concernedNotes.map((note) => note.id),
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

enum HandleNotesOnlyInSourceChoice {
  DELETE_FROM_SOURCE = 'DELETE_FROM_SOURCE',
  ADD_TO_ANKI = 'ADD_TO_ANKI',
  IGNORE = 'IGNORE',
}

export class SyncActionHandleNotesOnlyInSource extends ManualSyncAction {
  constructor(
    public concernedNotes: AutoankiNote[],
    ...args: ConstructorParameters<typeof ManualSyncAction>
  ) {
    super(...args);
  }

  /**
   * Name of this action
   *
   * @public
   */
  static actionName = 'SyncActionHandleNotesOnlyInSource';

  /**
   * Choices of this action
   *
   * @public
   */
  static choices = Object.values(HandleNotesOnlyInSourceChoice);

  async execute(
    choices: HandleNotesOnlyInSourceChoice[]
  ): Promise<SyncActionResult> {
    assert(this.concernedNotes.length === choices.length);

    const furtherActions: SyncAction[] = [];
    const newNotes: AutoankiNote[] = [];
    const notesToBeDeletedFromSource: AutoankiNote[] = [];
    for (const [i, choice] of choices.entries()) {
      if (choice === HandleNotesOnlyInSourceChoice.ADD_TO_ANKI) {
        newNotes.push(this.concernedNotes[i]);
      }
      if (choice === HandleNotesOnlyInSourceChoice.DELETE_FROM_SOURCE) {
        notesToBeDeletedFromSource.push(this.concernedNotes[i]);
      }
    }

    if (newNotes.length > 0) {
      furtherActions.push(
        new SyncActionCreateNotesInAnki(newNotes, this.syncProcedure)
      );
    }
    if (notesToBeDeletedFromSource.length > 0) {
      furtherActions.push(
        new SyncActionRemoveNotesFromSource(
          notesToBeDeletedFromSource,
          this.syncProcedure
        )
      );
    }

    return {
      furtherActions,
      sourcesToUpdate: [],
    };
  }
}
ManualSyncAction.registerManualSyncAction(SyncActionHandleNotesOnlyInSource);

/**
 * Possible actions when a note is found only in Anki.
 *
 * A note is only in Anki could mean:
 *  * the note source has been entirely removed (use `DELETE_FROM_ANKI`)
 *  * that the note source has not been parsed this time (use `IGNORE`).
 */
enum HandleNotesOnlyInAnkiChoice {
  DELETE_FROM_ANKI = 'DELETE',
  IGNORE = 'IGNORE',
}

export class SyncActionHandleNotesOnlyInAnki extends ManualSyncAction {
  constructor(
    public concernedNotes: AutoankiNoteFromAnki[],
    ...args: ConstructorParameters<typeof ManualSyncAction>
  ) {
    super(...args);
  }

  /**
   * Name of this action
   *
   * @public
   */
  static actionName = 'SyncActionHandleNotesOnlyInAnki';

  /**
   * Choices of this action
   *
   * @public
   */
  static choices = Object.values(HandleNotesOnlyInAnkiChoice);

  async execute(
    choices: HandleNotesOnlyInAnkiChoice[]
  ): Promise<SyncActionResult> {
    assert(this.concernedNotes.length === choices.length);

    const furtherActions: SyncAction[] = [];
    const notesToBeDeletedFromAnki: AutoankiNoteFromAnki[] = [];
    for (const [i, choice] of choices.entries()) {
      if (choice === HandleNotesOnlyInAnkiChoice.DELETE_FROM_ANKI) {
        notesToBeDeletedFromAnki.push(this.concernedNotes[i]);
      }
    }

    if (notesToBeDeletedFromAnki.length > 0) {
      furtherActions.push(
        new SyncActionRemoveNotesFromAnki(
          notesToBeDeletedFromAnki,
          this.syncProcedure
        )
      );
    }
    return {
      furtherActions,
      sourcesToUpdate: [],
    };
  }
}
ManualSyncAction.registerManualSyncAction(SyncActionHandleNotesOnlyInAnki);

enum HandleUpdateConflictChoice {
  PICK_SOURCE = 'PICK_SOURCE',
  PICK_ANKI = 'PICK_ANKI',
  IGNORE = 'IGNORE',
}

export class SyncActionHandleNotesUpdateConflict extends ManualSyncAction {
  constructor(
    public concernedNotes: ExistingNoteWithComputedChanges[],
    ...args: ConstructorParameters<typeof ManualSyncAction>
  ) {
    super(...args);
  }

  /**
   * Name of this action
   *
   * @public
   */
  static actionName = 'SyncActionHandleNotesUpdateConflict';

  /**
   * Choices of this action
   *
   * @public
   */
  static choices = Object.values(HandleUpdateConflictChoice);

  async execute(
    choices: HandleUpdateConflictChoice[]
  ): Promise<SyncActionResult> {
    assert(this.concernedNotes.length === choices.length);

    const furtherActions: SyncAction[] = [];
    const notesToUpdateInSource: ExistingNoteWithComputedChanges[] = [];
    const notesToUpdateInAnki: ExistingNoteWithComputedChanges[] = [];
    for (const [i, choice] of choices.entries()) {
      if (choice === HandleUpdateConflictChoice.PICK_ANKI) {
        notesToUpdateInSource.push(this.concernedNotes[i]);
      }
      if (choice === HandleUpdateConflictChoice.PICK_SOURCE) {
        notesToUpdateInAnki.push(this.concernedNotes[i]);
      }
    }

    if (notesToUpdateInSource.length > 0) {
      furtherActions.push(
        new SyncActionUpdateNotesInSource(
          notesToUpdateInSource,
          this.syncProcedure
        )
      );
    }
    if (notesToUpdateInAnki.length > 0) {
      furtherActions.push(
        new SyncActionUpdateNotesInAnki(notesToUpdateInAnki, this.syncProcedure)
      );
    }

    return {
      furtherActions,
      sourcesToUpdate: [],
    };
  }
}
ManualSyncAction.registerManualSyncAction(SyncActionHandleNotesUpdateConflict);

type MediaDigestMap = Record<
  AutoankiMediaFileMetadata['digest'],
  AutoankiMediaFileMetadata
>;

/**
 * This packages doesn't use it, but it is provided as comodity for packages
 * that make use of @autoanki/sync.
 */
const strictSyncConfigSchema = z
  .object({
    moreAccurateFinalContentChangeDetection: z.boolean(),
    manualActionDefaultChoices: z
      .record(
        z.string().superRefine((syncActionName, context) => {
          if (!ManualSyncAction.manualSyncActions[syncActionName]) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: context.path,
              message: `Invalid sync action name "${syncActionName}"`,
            });
          }
        }),
        z.string()
      )
      .superRefine((data, context) => {
        for (const [actionClassName, defaultChoice] of Object.entries(data)) {
          const actionClass =
            ManualSyncAction.manualSyncActions[actionClassName];
          if (actionClass && !actionClass.choices.includes(defaultChoice)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: context.path.concat([actionClassName]),
              message: `Invalid choice ${defaultChoice} for action ${actionClassName}`,
            });
          }
        }
      }),
    origin: z.union([z.string(), z.number()]).optional() as z.ZodType<
      ApiOrigin | undefined
    >,
  })
  .strict();

export const configSchema = strictSyncConfigSchema.partial();

/**
 * Sync config
 */
export type Config = z.infer<typeof strictSyncConfigSchema>;

const DEFAULT_CONFIG: Config = {
  moreAccurateFinalContentChangeDetection: true,
  manualActionDefaultChoices: {},
};

/**
 * Anki notes sync coordinator
 */
export class SyncProcedure {
  constructor(
    private notesToBeSynced: AutoankiNote[],
    config: Partial<Config>,
    public _logger: Logger = consoleLogger
  ) {
    this._config = strictSyncConfigSchema.parse({
      ...DEFAULT_CONFIG,
      ...config,
    });
  }

  get config(): Readonly<Config> {
    return this._config;
  }

  private _config: Config;

  private pendingSyncActions: Set<SyncAction> = new Set();

  public _existingNoteTypes: Record<
    ModelTypes.ModelName,
    ModelTypes.FieldName[]
  > = {};

  private existingDecks: string[] = [];

  private existingMediaMap: MediaDigestMap = {};

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
    this._logger.log('Fetching data from Anki...');
    [this.existingMediaMap, this._existingNoteTypes, this.existingDecks] =
      await Promise.all([
        this.getExistingAutoankiMediaFiles(),
        this.retrieveExisistingNoteTypes(),
        this._invoke({
          action: 'deckNames',
          request: undefined,
        }),
      ]);

    const actions: SyncAction[] = [];

    const noteTypes = Array.from(
      new Set(this.notesToBeSynced.map((note) => note.modelName))
    );
    const missingNoteTypes = difference(
      noteTypes,
      Object.keys(this._existingNoteTypes)
    );
    if (missingNoteTypes.length > 0) {
      throw new Error(
        `The following note types are not defined in Anki: [${missingNoteTypes.join(
          ', '
        )}]`
      );
    }

    const decksOfNotes = Array.from(
      new Set(this.notesToBeSynced.map((note) => note.deckName))
    );
    const missingDecks = difference(decksOfNotes, this.existingDecks);
    if (missingDecks.length > 0) {
      actions.push(new SyncActionCreateDecks(missingDecks, this));
    }

    const updateNoteTemplatesAction =
      new SyncActionUpdateInjectedScriptsInModelTemplates(
        this.notesToBeSynced,
        this
      );
    await updateNoteTemplatesAction.retrieveNoteTypesThatRequireUpdate();
    if (
      updateNoteTemplatesAction.noteTypesThatRequireInstrumentation.length > 0
    ) {
      actions.push(updateNoteTemplatesAction);
    }

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
      actions.push(new SyncActionHandleNotesOnlyInSource(onlyInSource, this));
    }
    if (onlyInAnki.length > 0) {
      actions.push(new SyncActionHandleNotesOnlyInAnki(onlyInAnki, this));
    }

    {
      const notesExistingOnBothSides: ExistingNoteWithComputedChanges[] =
        await Promise.all(
          Object.values(existingNotesTmp).map(async (existingNote) => {
            return {
              note: existingNote,
              changes: await computeNoteChanges(
                existingNote.fromSource!,
                existingNote.fromAnki!,
                this._config.moreAccurateFinalContentChangeDetection
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
        if (
          note.changes.finalContentFieldsOverallChanges & ConcernedSide.Anki
        ) {
          this._logger.warn(
            `The final content of the note ${note.note.fromAnki.id} has been changd in Anki. This will be ignored`
          );
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
          new SyncActionRemoveNotesFromAnki(
            newlyMarkedAsDeletedInSource.map((note) => note.note.fromAnki),
            this
          )
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
      if (
        action instanceof ManualSyncAction &&
        !!this._config.manualActionDefaultChoices[
          ManualSyncAction.getActionName(action)
        ]
      ) {
        const defaultChoice =
          this._config.manualActionDefaultChoices[
            ManualSyncAction.getActionName(action)
          ];
        const buildDefaultChoicesArray = <T>(
          choice: T,
          length: number
        ): T[] => {
          return Array.from({ length }).fill(choice) as T[];
        };
        if (action instanceof SyncActionHandleNotesOnlyInSource) {
          await this.runAction(
            action,
            buildDefaultChoicesArray(
              defaultChoice as HandleNotesOnlyInSourceChoice,
              action.concernedNotes.length
            )
          );
        }
        if (action instanceof SyncActionHandleNotesOnlyInAnki) {
          await this.runAction(
            action,
            buildDefaultChoicesArray(
              defaultChoice as HandleNotesOnlyInAnkiChoice,
              action.concernedNotes.length
            )
          );
        }
        if (action instanceof SyncActionHandleNotesUpdateConflict) {
          await this.runAction(
            action,
            buildDefaultChoicesArray(
              defaultChoice as HandleUpdateConflictChoice,
              action.concernedNotes.length
            )
          );
        }
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
      this.pendingSyncActions.add(a);
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
      origin: this._config.origin,
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

  private async retrieveExisistingNoteTypes(): Promise<
    this['_existingNoteTypes']
  > {
    this._logger.log('Fetching existing note types...');
    const noteTypesAndFields: this['_existingNoteTypes'] = { A: [] };
    const names = await this._invoke({
      action: 'modelNames',
      request: undefined,
    });
    await Promise.all(
      names.map(async (noteTypeName) => {
        const fields = await this._invoke({
          action: 'modelFieldNames',
          request: {
            modelName: noteTypeName,
          },
        });
        // @ts-ignore
        // Honestly, I don't know why it gives error...
        noteTypesAndFields[noteTypeName] = fields;
      })
    );
    return noteTypesAndFields;
  }

  public _isMediaFileAlreadyAvailable(
    metadata: AutoankiMediaFileMetadata
  ): boolean {
    return !!this.existingMediaMap[metadata.digest];
  }

  /**
   * @internal
   */
  public async _sendMediaFile(
    mediaFile: AutoankiMediaFile,
    metadata: AutoankiMediaFileMetadata
  ): Promise<void> {
    try {
      const newFileName = await this._invoke({
        action: 'storeMediaFile',
        request: {
          filename: metadata.storedFilename,
          data: mediaFile.base64Content,
          deleteExisting: false,
        },
      });
      if (newFileName !== metadata.storedFilename) {
        throw new AutoankiSyncError(
          `Unable to store media file using filename ${metadata.storedFilename} in Anki. Anki returned the filename ${newFileName}"`
        );
      }
    } catch (error) {
      if (!(error instanceof AutoankiSyncError)) {
        throw new AutoankiSyncError(
          `Unable to store media file ${
            metadata.storedFilename
          } in Anki. Reason: "${error ?? 'Unknown'}"`
        );
      } else {
        throw error;
      }
    }
  }

  /**
   * @internal
   */
  public async _sendNonExistingMediaFilesOfNotesToAnki(
    notes: AutoankiNote[]
  ): Promise<unknown> {
    const alreadyMet: Set<AutoankiMediaFileMetadata['storedFilename']> =
      new Set();
    const mediaFilesToSend: AutoankiNote['mediaFiles'] = [];

    for (const note of notes) {
      for (const mediaFile of note.mediaFiles.concat(
        note.scriptFiles,
        note.styleFiles
      )) {
        if (!alreadyMet.has(mediaFile.metadata.storedFilename)) {
          alreadyMet.add(mediaFile.metadata.storedFilename);

          const existing = this.existingMediaMap[mediaFile.metadata.digest];
          if (
            !existing ||
            existing.storedFilename !== mediaFile.metadata.storedFilename
          ) {
            mediaFilesToSend.push(mediaFile);
          }
        }
      }
    }

    if (mediaFilesToSend.length > 0) {
      this._logger.logLazy((print) => {
        print(
          `Sending media files to Anki: ${JSON.stringify(
            mediaFilesToSend.map((media) => media.filename)
          )}`
        );
      });
    }
    return Promise.all(
      mediaFilesToSend.map(async (media) => {
        const metadata = media.metadata;
        /*
         * Optimistically treated as sent, so that nobody else that
         * is concurrently running will send this again.
         */
        this.existingMediaMap[metadata.digest] = metadata;
        await this._sendMediaFile(media, metadata);
      })
    );
  }

  private async getExistingAutoankiMediaFiles(): Promise<MediaDigestMap> {
    this._logger.log('Fetching existing media from Anki...');
    const existingAutoankiMediaFileNames = await this._invoke({
      action: 'getMediaFilesNames',
      request: {
        pattern: `*${AUTOANKI_MEDIA_PREFIX}*`,
      },
    });
    return (
      await Promise.all(
        existingAutoankiMediaFileNames.map((filename) =>
          parseMediaFileMetadataFromFilename(filename)
        )
      )
    ).reduce((map, current) => {
      if (current) {
        map[current.digest] = current;
      }
      return map;
    }, {} as MediaDigestMap);
  }
}
