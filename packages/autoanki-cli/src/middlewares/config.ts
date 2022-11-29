import { z } from 'zod';
import * as path from 'node:path';
import { cosmiconfigSync } from 'cosmiconfig';
import validate from 'validate-npm-package-name';

import { ConfigPluginInstance } from '@autoanki/core';
import { Config, ConfigManager, configSchema } from '@autoanki/config';
import assert from '@autoanki/utils/assert.js';

import { getLogger } from './log.js';

let defaultConfig: Config = {
  noteInputsConfig: [],
};

let configManager: ConfigManager;

export function getConfig(): ConfigManager {
  assert(configManager !== undefined);
  return configManager;
}

function isPluginSpecifiedWithRelativePath(name: string) {
  /**
   * If the plugin's name is not a valid NPM package name and is not an
   * absolute path, then we assume that it is a relative path.
   */
  return !validate(name).validForNewPackages && !path.isAbsolute(name);
}

function normalizeRelativePathPluginPath(
  pluginInstance: ConfigPluginInstance,
  configDirectory: string
): ConfigPluginInstance {
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

export function initConfig() {
  const logger = getLogger();
  logger.log('Loading configuration...');
  const result = cosmiconfigSync('autoanki').search();
  if (result) {
    logger.log(`Using configuratino found at ${result.filepath}`);
    let config: Config = { noteInputsConfig: [] };
    try {
      config = configSchema.parse(result.config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error(`Invalid configuration from ${result.filepath}`);
      }
      throw error;
    }

    /*
     * Absolutize plugin relative imports
     */
    for (const sourceConfig of config.noteInputsConfig) {
      const pipeline = sourceConfig['@autoanki/core']?.pipeline;
      if (pipeline) {
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
    }

    configManager = new ConfigManager(config);
  } else {
    logger.log('No configuration file found. Use default configuration');
    configManager = new ConfigManager(defaultConfig);
  }
}
