import { z } from 'zod';
import { cosmiconfigSync } from 'cosmiconfig';

import { buildConfigManager, Config, ConfigManager } from '@autoanki/config';
import assert from '@autoanki/utils/assert.js';

import { getLogger } from './log.js';

let defaultConfig: Config = {
  filesConfig: [],
};

let configManager: ConfigManager;

export function getConfig(): ConfigManager {
  assert(configManager !== undefined);
  return configManager;
}

export function initConfig() {
  const logger = getLogger();
  logger.debug('Loading configuration...');
  const result = cosmiconfigSync('autoanki').search();
  if (result) {
    logger.debug(`Using configuratino found at ${result.filepath}`);
    try {
      configManager = buildConfigManager(result.filepath, result.config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error(`Invalid configuration from ${result.filepath}`);
        logger.error(JSON.stringify(error.issues, undefined, 2));
      } else {
        throw error;
      }
    }
  } else {
    logger.debug('No configuration file found. Use default configuration');
    /*
     * Just pass a fake absolute path path
     */
    configManager = buildConfigManager(
      '/autoanki/autoanki.config.js',
      defaultConfig
    );
  }
}
