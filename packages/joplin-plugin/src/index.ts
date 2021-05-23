import joplin from 'api';
import { ToolbarButtonLocation } from 'api/types';

import { syncCommand } from './sync';

joplin.plugins.register({
  onStart: async () => {
    console.info('Autuanki joplin plugin started!');

    const panels = joplin.views.panels;
    const view = await panels.create('panel_1');
    await panels.setHtml(view, `<div id="root"></div>`);
    await panels.addScript(view, './app/index.js');

    await joplin.commands.register(syncCommand);
    await joplin.views.toolbarButtons.create(
      syncCommand.name,
      syncCommand.name,
      ToolbarButtonLocation.NoteToolbar
    );
  },
});
