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
} from '@autoanki/sync';

import { extractAnkiNotesFromFiles } from '../../utils/index.js';

interface Args {
  inputs: string[];
  port: number;
  'dry-run': boolean;
}

function syncActionToString(action: SyncAction) {
  let str = '';
  str += action instanceof AutomaticSyncAction ? '- [A] ' : '- [M] ';

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
    str += 'Remove notes from Anki\n';
    const grouped = groupAutoankiNotesBySourcePluginAndInput(
      action.notesToBeRemoved,
      (item) => item.note.fromSource
    );
    for (const [sourcePlugin, groupedbySource] of grouped) {
      str += `      From "${getPluginName(sourcePlugin)}"\n`;
      for (const [source, notes] of groupedbySource) {
        str += `         from "${source.key}"\n`;
        for (const note of notes) {
          str += `           Note ${note.note.fromAnki.uuid}\n`;
        }
      }
    }
  } else if (action instanceof SyncActionHandleNotesUpdateConflict) {
    str += 'Conflictual updates\n';
  } else if (
    action instanceof SyncActionUpdateInjectedScriptsInModelTemplates
  ) {
    str += `Update injected scripts in note templates: [${action.noteTypesThatRequireInstrumentation.join(
      ', '
    )}]`;
  } else if (action instanceof SyncActionCreateDecks) {
    str += `Create decks: [${action.decks.join(', ')}]`;
  } else {
    throw new TypeError(`Unhandled action ${action.constructor.name}`);
  }
  return str;
}

async function handler(argv: Args) {
  const notes = await extractAnkiNotesFromFiles(argv.inputs, [
    [syncPlugin, undefined],
  ]);
  const sync = new SyncProcedure(notes, {
    origin: argv.port,
  });

  await sync.start();

  for (const action of sync.syncActions) {
    console.log(syncActionToString(action));
  }

  if (!argv['dry-run']) {
    await sync.runAllAutomaticActions();

    if (sync.completed) {
      await Promise.all(
        sync.sourcesToWriteBack.map((source) => {
          return writeFile(source.key, Buffer.from(source.content));
        })
      );
    } else {
      throw new Error('Manual operations not supported yet');
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
