import { z } from 'zod';
import * as path from 'node:path';
import winston from 'winston';
import { cosmiconfigSync } from 'cosmiconfig';
import validate from 'validate-npm-package-name';

import * as core from '@autoanki/core';

const cliConfigSchema = z.object({
  '@autoanki/core': core.configSchema,
});

export type CliConfig = z.infer<typeof cliConfigSchema>;

let defaultConfig: CliConfig = {
  '@autoanki/core': {
    pipelines: [],
  },
};

function isPluginSpecifiedWithRelativePath(name: string) {
  /**
   * If the plugin's name is not a valid NPM package name and is not an
   * absolute path, then we assume that it is a relative path.
   */
  return !validate(name).validForNewPackages && !path.isAbsolute(name);
}

function normalizeRelativePathPluginPath(
  pluginInstance: core.ConfigPluginInstance,
  configDirectory: string
): core.ConfigPluginInstance {
  if (
    typeof pluginInstance === 'string' &&
    isPluginSpecifiedWithRelativePath(pluginInstance)
  ) {
    return path.join(configDirectory, pluginInstance).normalize();
  } else if (
    Array.isArray(pluginInstance) &&
    typeof pluginInstance[0] === 'string' &&
    isPluginSpecifiedWithRelativePath(pluginInstance[0])
  ) {
    pluginInstance[0] = path
      .join(configDirectory, pluginInstance[0])
      .normalize();
  }
  return pluginInstance;
}

export function getConfig(): CliConfig {
  return defaultConfig;
}
export function initConfig() {
  winston.debug('Loading configuration...');
  const result = cosmiconfigSync('autoanki').search();
  if (result) {
    winston.debug(`Using configuratino found at ${result.filepath}`);
    try {
      defaultConfig = cliConfigSchema.parse(result.config);
      for (const pipeline of defaultConfig['@autoanki/core'].pipelines) {
        pipeline.source = normalizeRelativePathPluginPath(
          pipeline.source,
          path.dirname(result.filepath)
        );
        if (pipeline.transformers) {
          for (const [index, transformer] of pipeline.transformers.entries()) {
            pipeline.transformers[index] = normalizeRelativePathPluginPath(
              transformer,
              path.dirname(result.filepath)
            );
          }
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        winston.error(`Invalid configuration from ${result.filepath}`);
        winston.error(JSON.stringify(error.issues, undefined, 2));
      } else {
        throw error;
      }
    }
  } else {
    winston.debug('No configuration file found. Use default configuration');
  }
}
