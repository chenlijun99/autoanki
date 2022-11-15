import { Config } from './config.js';
import { PluginType, AutoankiPlugin, AutoankiPluginApi } from './plugin.js';
import {
  computeAutoankiMediaFileFromRaw,
  computeAutoankiMediaFileFromRawSync,
} from './media.js';

type PluginConfig<Type extends PluginType> = Type extends 'source'
  ? Config['pipelines'][0]['source']
  : NonNullable<Config['pipelines'][0]['transformers']>[0];

type LoadedPluginType<Type extends PluginType> = InstanceType<
  NonNullable<AutoankiPlugin[Type]>
>;

export class PluginLoadingError extends Error {
  constructor(...args: ConstructorParameters<typeof Error>) {
    super(...args);
    this.name = this.constructor.name;
  }
}

async function importPlugin(moduleName: string): Promise<AutoankiPlugin> {
  return import(moduleName)
    .then((module) => module.default)
    .catch((error) => {
      console.error(error);
      throw new PluginLoadingError(
        `Plugin "${moduleName}" not found or cannot be loaded`
      );
    });
}

export async function loadPlugin<Type extends PluginType>(
  pluginConfig: PluginConfig<Type>,
  type: Type
): Promise<LoadedPluginType<Type>> {
  let plugin: AutoankiPlugin;
  let pluginArgs: unknown | undefined;

  if (typeof pluginConfig === 'string') {
    plugin = await importPlugin(pluginConfig);
  } else if (Array.isArray(pluginConfig)) {
    pluginArgs = pluginConfig[1];
    const first = pluginConfig[0];
    plugin = typeof first === 'string' ? await importPlugin(first) : first;
  } else {
    throw new PluginLoadingError('Invalid plugin configuration');
  }
  const pluginConstructor = plugin[type];
  if (pluginConstructor === undefined) {
    throw new PluginLoadingError(
      'Plugin used as source plugin has no `source` property'
    );
  }

  const api: AutoankiPluginApi = {
    media: {
      computeAutoankiMediaFileFromRawSync: (rawFile) => {
        return computeAutoankiMediaFileFromRawSync(
          pluginConstructor.pluginName,
          rawFile
        );
      },
      computeAutoankiMediaFileFromRaw: (rawFile) => {
        return computeAutoankiMediaFileFromRaw(
          pluginConstructor.pluginName,
          rawFile
        );
      },
    },
  };

  return new pluginConstructor(api, pluginArgs) as LoadedPluginType<Type>;
}
