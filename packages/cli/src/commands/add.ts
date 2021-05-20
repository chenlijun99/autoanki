import type { CommandModule } from 'yargs';

const command: CommandModule = {
  command: 'add <files..>',
  describe: 'Add all notes in the given markdown file from Anki',
  handler: () => {},
  builder: (yargs) => {
    return yargs
      .positional('file', {
        type: 'string',
      })
      .options({
        d: {
          description: 'The deck to be used',
          type: 'string',
          alias: ['d', 'deck'],
          default: 'Autoanki Default',
        },
        l: {
          description: `The last version of the same file.  If provided, a diff is performed and notes are appropriately removed from Anki decks`,
          type: 'string',
          alias: ['l', 'last-version'],
        },
      });
  },
};

export default command;
