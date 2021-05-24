import { MenuItemLocation, ToolbarButtonLocation } from 'api/types';

import { Subject } from 'rxjs';

export const syncCommandTypes = [
  ToolbarButtonLocation.NoteToolbar,
  MenuItemLocation.Tools,
  MenuItemLocation.FolderContextMenu,
  MenuItemLocation.NoteListContextMenu,
] as const;

export type SyncCommandType = typeof syncCommandTypes[number];

export type CommandContextPayloadMap = {
  [ToolbarButtonLocation.NoteToolbar]: void;
  [MenuItemLocation.Tools]: void;
  [MenuItemLocation.FolderContextMenu]: string;
  [MenuItemLocation.NoteListContextMenu]: string[];
};

export type ExecutionTriggerSubjectMap = {
  [P in SyncCommandType]: Subject<CommandContextPayloadMap[P]>;
};
