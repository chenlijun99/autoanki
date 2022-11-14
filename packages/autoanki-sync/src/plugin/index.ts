/**
 * @file autoanki-sync itself also provides a transformer plugin
 */
import type {
  AutoankiNote,
  AutoankiPlugin,
  TransformerPlugin,
  TransformerPluginOutput,
  AutoankiMediaFile,
} from '@autoanki/core';

import bundledBase64 from 'anki-bridge-bundled-base64.js';
import styleBase64 from './style.css';

export const ankiBridgeScriptMediaFile: AutoankiMediaFile = Object.freeze({
  base64Content: bundledBase64,
  /*
   * Note: intentionally without underscore.
   *
   * Add anki bridge script to each note. Obviously only one will
   * be sent and stored in Anki. But this way each note has a reference
   * to the anki bridge script that it relies on.
   * By doing so we can have multiple anki bridge coexist (imagine some old
   * notes that use an older version of anki bridge, because they were
   * synced using an older version of @autoanki/sync) and when all the
   * notes that rely on a certain version of anki-bridge don't rely
   * on that version anymore (they are re-synced using an up-to-date
   * @autoanki/sync), then Anki can gargabe collect it.
   */
  filename: 'anki_bridge.js',
});

export const styleMediaFile: AutoankiMediaFile = Object.freeze({
  base64Content: styleBase64,
  filename: 'style.css',
});

export class AutoankiSyncTransformer implements TransformerPlugin {
  static pluginName = '@autoanki/sync';

  name = AutoankiSyncTransformer.pluginName;

  async transform(note: AutoankiNote): Promise<TransformerPluginOutput> {
    return {
      transformedNote: note,
      scriptFiles: [ankiBridgeScriptMediaFile],
      styleFiles: [styleMediaFile],
    };
  }
}

export default {
  transformer: AutoankiSyncTransformer,
} as AutoankiPlugin;
