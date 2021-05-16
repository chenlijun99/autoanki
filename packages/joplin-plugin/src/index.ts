import joplin from 'api';

joplin.plugins.register({
  onStart: async () => {
    console.info('Test plugin started!');
  },
});
