import type { CommandModule } from 'yargs';

const command: CommandModule = {
  command: 'dump <file>',
  describe: 'Dump anki notes to markdown file',
  handler: () => {},
  builder: (yargs) => {
    return yargs
      .positional('file', {
        type: 'string',
      })
      .options({
        d: {
          description: 'Directories of notes to be ignored',
          type: 'string',
          alias: ['d', 'dir'],
        },
        f: {
          description: `The last version of the same file.  If provided, a diff is performed and notes are appropriately removed from Anki decks`,
          type: 'string',
          alias: ['l', 'last-version'],
        },
      });
  },
};

export default command;
