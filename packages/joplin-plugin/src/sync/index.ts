import { Command } from 'api/types';
import { Subject } from 'rxjs';

import { syncEpic } from './core';
import {
  SyncCommandType,
  syncCommandTypes,
  ExecutionTriggerSubjectMap,
} from './types';

type CommandMap = Record<SyncCommandType, Command>;

export class SyncCommandFactory {
  constructor() {
    syncEpic(this.executionMap);
  }

  getSyncCommand(type: SyncCommandType): Command {
    return this.commandMap[type];
  }

  private readonly commandMap: CommandMap = syncCommandTypes.reduce(
    (map, key) => {
      map[key] = SyncCommandFactory.getCommand(this, key);
      return map;
    },
    {} as CommandMap
  );

  private static getCommand<Type extends SyncCommandType>(
    factory: SyncCommandFactory,
    type: Type
  ): Command {
    return {
      label: 'Sync with anki',
      iconName: 'fas fa-sync',
      execute: async (...args) => {
        // @ts-ignore
        factory.executionMap[type].next(args);
      },
      name: `autoanki.${type}.sync`,
    };
  }

  private executionMap: ExecutionTriggerSubjectMap = syncCommandTypes.reduce(
    (map, key) => {
      // @ts-ignore
      map[key] = new Subject();
      return map;
    },
    {} as ExecutionTriggerSubjectMap
  );
}
