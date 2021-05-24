import joplin from 'api';
import { ContentScriptType } from 'api/types';

export class MarkdownHandler {
  async setup() {
    await joplin.contentScripts.register(
      ContentScriptType.MarkdownItPlugin,
      'autoanki.markdown',
      'markdown/markdownIt/index.js'
    );
  }
}
