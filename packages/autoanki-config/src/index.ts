import { z } from 'zod';
import * as path from 'node:path';
import validate from 'validate-npm-package-name';
import minimatch from 'minimatch';

import * as core from '@autoanki/core';

/**
 * Configuration applicable to a note source
 */
const fileConfigSchema = z
  .object({
    /**
     * Autoanki core configuration for the files
     */
    '@autoanki/core': core.configSchema,
  })
  .strict();

export type FileConfig = z.infer<typeof fileConfigSchema>;

const filesConfigSchema = fileConfigSchema
  .extend({
    /**
     * Array of file globs to which the current configuration object must be
     * applied
     */
    files: z.string().array(),
    /**
     * Ignores of file globs that specify among the files matched by `files`
     * which files must be ignored.
     */
    ignores: z.string().array().optional(),
  })
  .strict();

export type FilesConfig = z.infer<typeof filesConfigSchema>;

const configSchema = z.object({
  filesConfig: z.array(filesConfigSchema),
});

export type Config = z.infer<typeof configSchema>;

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

type FilesConfigGroup = {
  files: string[];
  config: FileConfig;
};

export class ConfigManager {
  constructor(private configAbsolutePath: string, configObject: unknown) {
    this.rawConfig = configSchema.parse(configObject);

    for (const config of this.rawConfig.filesConfig) {
      const pipeline = config['@autoanki/core'].pipeline;

      pipeline.source = normalizeRelativePathPluginPath(
        pipeline.source,
        path.dirname(this.configAbsolutePath)
      );
      if (pipeline.transformers) {
        for (const [index, transformer] of pipeline.transformers.entries()) {
          pipeline.transformers[index] = normalizeRelativePathPluginPath(
            transformer,
            path.dirname(this.configAbsolutePath)
          );
        }
      }
    }
  }

  private rawConfig: Config;

  private mergeConfigs(configs: FilesConfig[]): FileConfig {
    const merged: FileConfig = {
      '@autoanki/core': Object.assign(
        {},
        ...configs.map((config) => config['@autoanki/core'])
      ),
    };
    return merged;
  }

  getFileConfig(fileAbsPath: string): FileConfig {
    const configs = [];
    for (const config of this.rawConfig.filesConfig) {
      let matched = false;
      for (const glob of config.files) {
        if (
          minimatch(fileAbsPath, glob, {
            matchBase: true,
          })
        ) {
          matched = true;
          break;
        }
      }
      if (matched) {
        for (const glob of config.ignores ?? []) {
          if (
            minimatch(fileAbsPath, glob, {
              matchBase: true,
            })
          ) {
            matched = false;
            break;
          }
        }
      }
      if (matched) {
        configs.push(config);
      }
    }

    return this.mergeConfigs(configs);
  }

  getFilesGroupedByConfig(fileAbsPaths: string[]): FilesConfigGroup[] {
    const fileToMatchedConfigsMap: Map<string, string> = new Map();

    for (const [configIndex, config] of this.rawConfig.filesConfig.entries()) {
      const matchedFiles: Set<string> = new Set();
      const notMatchedYet: Set<string> = new Set(fileAbsPaths);

      for (const glob of config.files) {
        for (const file of notMatchedYet) {
          if (
            minimatch(file, glob, {
              matchBase: true,
            })
          ) {
            matchedFiles.add(file);
            notMatchedYet.delete(file);
          }
        }
      }

      for (const glob of config.ignores ?? []) {
        for (const file of matchedFiles) {
          if (
            minimatch(file, glob, {
              matchBase: true,
            })
          ) {
            matchedFiles.delete(file);
          }
        }
      }

      for (const file of matchedFiles) {
        const matchedConfigs = fileToMatchedConfigsMap.get(file);
        if (!matchedConfigs) {
          fileToMatchedConfigsMap.set(file, `${configIndex}`);
        } else {
          fileToMatchedConfigsMap.set(file, `${matchedConfigs},${configIndex}`);
        }
      }
    }

    const matchedConfigsGroups: Map<string, string[]> = new Map();
    for (const file of fileAbsPaths) {
      const matchedConfigs = fileToMatchedConfigsMap.get(file);
      if (matchedConfigs) {
        const group = matchedConfigsGroups.get(matchedConfigs);
        if (group) {
          group.push(file);
        } else {
          matchedConfigsGroups.set(matchedConfigs, [file]);
        }
      }
    }

    const groups: FilesConfigGroup[] = [];
    for (const group of matchedConfigsGroups) {
      groups.push({
        config: this.mergeConfigs(
          group[0].split(',').map((index) => {
            const i = Number.parseInt(index);
            return this.rawConfig.filesConfig[i];
          })
        ),
        files: group[1],
      });
    }

    return groups;
  }
}

export function buildConfigManager(
  configAbsolutePath: string,
  configObject: unknown
): ConfigManager {
  return new ConfigManager(configAbsolutePath, configObject);
}
