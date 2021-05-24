import joplin from 'api';
import { MenuItemLocation, ToolbarButtonLocation } from 'api/types';

import { MarkdownHandler } from './markdown';
import { SyncHandler, SyncStatusPanel } from './sync';

joplin.plugins.register({
  onStart: async () => {
    await new MarkdownHandler().setup();

    const syncHandler = new SyncHandler();
    const syncPanel = new SyncStatusPanel(syncHandler);
    await syncPanel.setup();

    const toolbarSyncCommand = syncHandler.getSyncCommand(
      ToolbarButtonLocation.NoteToolbar
    );
    const folderSyncCommand = syncHandler.getSyncCommand(
      MenuItemLocation.FolderContextMenu
    );
    await joplin.commands.register(toolbarSyncCommand);
    await joplin.commands.register(folderSyncCommand);

    await joplin.views.toolbarButtons.create(
      toolbarSyncCommand.name,
      toolbarSyncCommand.name,
      ToolbarButtonLocation.NoteToolbar
    );
    await joplin.views.menuItems.create(
      folderSyncCommand.name,
      folderSyncCommand.name,
      MenuItemLocation.FolderContextMenu
    );
  },
});
