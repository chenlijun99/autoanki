import joplin from 'api';
import { Command } from 'api/types';

export const syncCommand: Command = {
  name: 'Sync anki notes',
  label: 'Sync with anki',
  iconName: 'fas fa-sync',
  execute: async () => {
    console.log('Sync with anki');
  },
};
