import { writeFile } from 'node:fs/promises';

import type { CommandModule } from 'yargs';

import {
  groupAutoankiNotesBySourcePluginAndInput,
  getPluginName,
} from '@autoanki/core';
import syncPlugin, {
  AutomaticSyncAction,
  SyncAction,
  SyncActionCreateNotesInAnki,
  SyncActionUpdateNotesInAnki,
  SyncActionHandleNotesUpdateConflict,
  SyncProcedure,
  SyncActionRemoveNotesFromSource,
  SyncActionRemoveNotesFromAnki,
  SyncActionUpdateNotesInSource,
  SyncActionUpdateInjectedScriptsInModelTemplates,
  SyncActionCreateDecks,
  SyncActionHandleNotesOnlyInAnki,
  SyncActionHandleNotesOnlyInSource,
  ManualSyncAction,
} from '@autoanki/sync';

import { extractAnkiNotesFromFiles } from '../../utils/index.js';
import { question } from '../../utils/readline.js';
import { createChildLogger, getLogger } from '../../middlewares/log.js';
import { getConfig } from '../../middlewares/config.js';
import { groupByMap } from '@autoanki/utils/array.js';

interface Args {
  inputs: string[];
  port: number;
  'dry-run': boolean;
}

function syncActionToString(procedure: SyncProcedure, action: SyncAction) {
  let str = '';
  if (action instanceof AutomaticSyncAction) {
    str += '- [A] ';
  } else if (action instanceof ManualSyncAction) {
    const defaultChoice =
      procedure.config.manualActionDefaultChoices[
        ManualSyncAction.getActionName(action)
      ];
    str += defaultChoice ? `- [M, default: "${defaultChoice}"] ` : '- [M] ';
  }

  if (action instanceof SyncActionCreateNotesInAnki) {
    str += 'Create notes in Anki\n';
    const grouped = groupAutoankiNotesBySourcePluginAndInput(action.newNotes);
    for (const [sourcePlugin, groupedbySource] of grouped) {
      str += `      From "${getPluginName(sourcePlugin)}"\n`;
      for (const [source, notes] of groupedbySource) {
        str += `         ${notes.length} new notes from "${source.key}"\n`;
      }
    }
  } else if (action instanceof SyncActionUpdateNotesInAnki) {
    str += 'Updates notes source -> Anki\n';
    const grouped = groupAutoankiNotesBySourcePluginAndInput(
      action.notesToUpdate,
      (item) => item.note.fromSource
    );
    for (const [sourcePlugin, groupedbySource] of grouped) {
      str += `      From "${getPluginName(sourcePlugin)}"\n`;
      for (const [source, notes] of groupedbySource) {
        str += `         from "${source.key}"\n`;
        for (const note of notes) {
          str += `           Note ${note.note.fromSource.autoanki.uuid!}\n`;
        }
      }
    }
  } else if (action instanceof SyncActionUpdateNotesInSource) {
    str += 'Updates notes Anki -> source\n';
    const grouped = groupAutoankiNotesBySourcePluginAndInput(
      action.notesToUpdate,
      (item) => item.note.fromSource
    );
    for (const [sourcePlugin, groupedbySource] of grouped) {
      str += `      From "${getPluginName(sourcePlugin)}"\n`;
      for (const [source, notes] of groupedbySource) {
        str += `         from "${source.key}"\n`;
        for (const note of notes) {
          str += `           Note ${note.note.fromSource.autoanki.uuid!}\n`;
        }
      }
    }
  } else if (action instanceof SyncActionRemoveNotesFromSource) {
    str += 'Remove notes from source\n';
    const grouped = groupAutoankiNotesBySourcePluginAndInput(
      action.notesToBeRemoved
    );
    for (const [sourcePlugin, groupedbySource] of grouped) {
      str += `      From "${getPluginName(sourcePlugin)}"\n`;
      for (const [source, notes] of groupedbySource) {
        str += `         from "${source.key}"\n`;
        for (const note of notes) {
          str += `           Note ${note.autoanki.uuid!}\n`;
        }
      }
    }
  } else if (action instanceof SyncActionRemoveNotesFromAnki) {
    str += `Remove notes from Anki: ${action.concernedNotes
      .map((note) => note.uuid)
      .join(', ')}\n`;
  } else if (
    action instanceof SyncActionUpdateInjectedScriptsInModelTemplates
  ) {
    str += `Update injected scripts in note templates: [${action.noteTypesThatRequireInstrumentation.join(
      ', '
    )}]`;
  } else if (action instanceof SyncActionCreateDecks) {
    str += `Create decks: [${action.decks.join(', ')}]`;
  } else if (action instanceof SyncActionHandleNotesUpdateConflict) {
    str += 'Handle update conflict\n';

    const grouped = groupAutoankiNotesBySourcePluginAndInput(
      action.concernedNotes,
      (item) => item.note.fromSource
    );
    for (const [sourcePlugin, groupedbySource] of grouped) {
      str += `      From "${getPluginName(sourcePlugin)}"\n`;
      for (const [source, notes] of groupedbySource) {
        str += `         from "${source.key}"\n`;
        for (const note of notes) {
          str += `           Note ${note.note.fromSource.autoanki.uuid!}\n`;
        }
      }
    }
  } else if (action instanceof SyncActionHandleNotesOnlyInAnki) {
    str += `Handle notes only in Anki ${action.concernedNotes
      .map((note) => note.uuid)
      .join(', ')}\n`;
  } else if (action instanceof SyncActionHandleNotesOnlyInSource) {
    str += 'Handle notes only in source\n';

    const grouped = groupAutoankiNotesBySourcePluginAndInput(
      action.concernedNotes
    );
    for (const [sourcePlugin, groupedbySource] of grouped) {
      str += `      From "${getPluginName(sourcePlugin)}"\n`;
      for (const [source, notes] of groupedbySource) {
        str += `         from "${source.key}"\n`;
        for (const note of notes) {
          str += `           Note ${note.autoanki.uuid!}\n`;
        }
      }
    }
  } else {
    throw new TypeError(`Unhandled action ${action.constructor.name}`);
  }
  return str;
}

async function handler(argv: Args) {
  const logger = getLogger();

  logger.info('Parsing Anki notes from note sources...');
  const allNotes = await extractAnkiNotesFromFiles(argv.inputs, [
    [syncPlugin, undefined],
  ]);

  const configManager = getConfig();
  const groupedByConfig = groupByMap(
    allNotes,
    (note) =>
      configManager.getFileConfig(note.autoanki.metadata.input.key)![
        '@autoanki/sync'
      ]
  );

  logger.logLazy((print) => {
    const str = Array.from(groupedByConfig.entries())
      .map(([config, notes]) => {
        return JSON.stringify(
          {
            config,
            inputs: Array.from(
              new Set(notes.map((note) => note.autoanki.metadata.input.key))
            ),
          },
          undefined,
          2
        );
      })
      .join('\n');
    print(
      `Syncing Autoanki notes, with the following configuration groups:\n${str}`
    );
  });

  for (const [config, notes] of groupedByConfig.entries()) {
    const sync = new SyncProcedure(
      notes,
      {
        ...config,
        origin: argv.port,
      },
      createChildLogger('@autoanki/sync')
    );

    logger.info('Computing required sync actions...');
    await sync.start();

    for (const action of sync.syncActions) {
      console.log(syncActionToString(sync, action));
    }

    if (sync.syncActions.length === 0) {
      logger.info('Everything is synced. No operation required.');
    }

    if (!argv['dry-run'] && sync.syncActions.length > 0) {
      const response = await question(
        'Proceed (y)es/(n)o/(m)odify decisions? '
      );
      if (response === 'y') {
        logger.info('Syncing...');
        await sync.runAllAutomaticActions();

        if (sync.completed) {
          await Promise.all(
            // IMHO false positive
            // eslint-disable-next-line @typescript-eslint/no-loop-func
            sync.sourcesToWriteBack.map((source) => {
              return writeFile(source.key, Buffer.from(source.content));
            })
          );

          logger.info('Done!');
        } else {
          throw new Error('Manual operations not supported yet');
        }
      }
    }
  }
}

const command: CommandModule<{}, Args> = {
  command: 'sync <inputs...>',
  describe:
    'Sync all Anki notes extracted from the given source files with the local Anki via Anki-connect',
  handler,
  builder: (yargs) => {
    return yargs
      .positional('inputs', {
        type: 'string',
        array: true,
        demandOption: true,
        describe: 'File paths or URLs',
      })
      .options({
        port: {
          description: 'Anki-connect port',
          type: 'number',
          default: 8765,
          alias: ['p'],
          required: false,
        },
        'dry-run': {
          description:
            'Print the commands that would be executed, ' +
            'but do not execute them ' +
            '(except in certain circumstances)',
          type: 'boolean',
          default: false,
          alias: ['n'],
          required: false,
        },
      });
  },
};

export default command;
