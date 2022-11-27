import { z } from 'zod';

import type {
  AutoankiNote,
  AutoankiPlugin,
  TransformerPlugin,
  TransformerPluginOutput,
  AutoankiMediaFile,
  AutoankiPluginApi,
} from '@autoanki/core';

import { stringToBase64 } from '@autoanki/utils/base64.js';

const pluginConfigSchema = z
  .object({
    css: z.string().min(1),
  })
  .strict();

type PluginConfig = z.infer<typeof pluginConfigSchema>;

export class CssContentPlugin implements TransformerPlugin {
  static pluginName = '@autoanki/pluginc-content-css';

  constructor(coreApi: AutoankiPluginApi, config: PluginConfig) {
    this.config = pluginConfigSchema.parse(config);
    this.styleMediaFile = coreApi.media.computeAutoankiMediaFileFromRawSync({
      filename: 'style.css',
      base64Content: stringToBase64(this.config.css),
    });
  }

  private config: PluginConfig;

  private styleMediaFile: AutoankiMediaFile;

  async transform(note: AutoankiNote): Promise<TransformerPluginOutput> {
    return {
      transformedNote: note,
      styleFiles: [this.styleMediaFile],
    };
  }
}

export default {
  transformer: CssContentPlugin,
} as AutoankiPlugin;
