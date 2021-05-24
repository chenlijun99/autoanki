import joplin from 'api';
import { MenuItemLocation, ToolbarButtonLocation } from 'api/types';

import { SyncCommandFactory } from './sync';

joplin.plugins.register({
  onStart: async () => {
    const panels = joplin.views.panels;
    const view = await panels.create('panel_1');
    await panels.setHtml(view, `<div id="root"></div>`);
    await panels.addScript(view, './app/index.js');

    const syncCommandFactory = new SyncCommandFactory();
    const toolbarSyncCommand = syncCommandFactory.getSyncCommand(
      ToolbarButtonLocation.NoteToolbar
    );
    const folderSyncCommand = syncCommandFactory.getSyncCommand(
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
