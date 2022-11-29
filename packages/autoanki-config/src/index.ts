import { z } from 'zod';
import minimatch from 'minimatch';
import hash from 'object-hash';

import * as core from '@autoanki/core';
import { configSchema as syncConfigSchema } from '@autoanki/sync';

/**
 * Configuration applicable to a note source
 *
 * ConfigManager ensures that if two file config are deeply equal, then
 * they are also referentially equal.
 * This guarantee applies also to properties of a file config: e.g.
 * given `fileConfigA` and `fileConfigB`, where `fileConfigA !== fileConfigB`,
 * `fileConfigA['@autoanki/core']` and `fileConfigB['@autoanki/core']` are
 * deeply equal, then they are also referentially equal.
 *
 * This allows the application developers to quickly group note sources
 * by config or sub-configs.
 */
const noteInputConfigSchema = z
  .object({
    /**
     * Autoanki core configuration for the inputs
     */
    '@autoanki/core': core.configSchema,
    /**
     * Autoanki sync configuration for the inputs
     */
    '@autoanki/sync': syncConfigSchema,
  })
  .strict();

export type NoteInputConfig = z.infer<typeof noteInputConfigSchema>;
type NoteInputConfigKeys = Array<keyof NoteInputConfig>;

const noteInputsConfigSchema = noteInputConfigSchema
  .partial()
  .extend({
    /**
     * Array of inputs globs to which the current configuration object must be
     * applied
     */
    inputs: z.string().array(),
    /**
     * Ignores of inputs globs that specify among the inputs matched by `inputs`
     * which inputs must be ignored.
     */
    ignores: z.string().array().optional(),
  })
  .strict();

export type NoteInputsConfig = z.infer<typeof noteInputsConfigSchema>;

export const configSchema = z.object({
  noteInputsConfig: z.array(noteInputsConfigSchema),
});

export type Config = z.infer<typeof configSchema>;

export class ConfigManager {
  constructor(config: Config) {
    this.rawConfig = {
      noteInputsConfig: [],
    };
    type MapType = {
      [key in keyof NoteInputConfig]: Record<string, NoteInputConfig[key]>;
    };
    const hashToObjectMap: MapType = {
      '@autoanki/core': {},
      '@autoanki/sync': {},
    };
    for (const sourcesConfig of config.noteInputsConfig) {
      const noteInputsConfig: NoteInputsConfig = {
        inputs: sourcesConfig.inputs,
        ignores: sourcesConfig.ignores,
      };

      for (const key of Object.keys(hashToObjectMap) as NoteInputConfigKeys) {
        const configPortion = sourcesConfig[key];
        if (configPortion) {
          const digest = hash(configPortion);
          let equalConfigPortion = hashToObjectMap[key][digest];
          if (!equalConfigPortion) {
            hashToObjectMap[key][digest] = configPortion;
            equalConfigPortion = configPortion;
            // @ts-ignore
            this.configPortionHashCache[key].set(configPortion, digest);
          }
          // @ts-ignore
          noteInputsConfig[key] = equalConfigPortion;
        }
      }

      this.rawConfig.noteInputsConfig.push(noteInputsConfig);
    }
  }

  private configPortionHashCache: {
    [key in keyof NoteInputConfig]: Map<NoteInputConfig[key], string>;
  } = {
    '@autoanki/sync': new Map(),
    '@autoanki/core': new Map(),
  };

  private configPortionMergeCache: {
    [key in keyof NoteInputConfig]: Map<string, NoteInputConfig[key]>;
  } = {
    '@autoanki/sync': new Map(),
    '@autoanki/core': new Map(),
  };

  private finalConfigMergeCache: Map<string, NoteInputConfig | undefined> =
    new Map();

  private noteInputKeyToConfigCache: Map<string, NoteInputConfig | undefined> =
    new Map();

  private rawConfig: Config;

  private getMergeHash<T extends keyof NoteInputConfig>(
    configs: NoteInputsConfig[],
    key: T
  ) {
    const digests = new Set<string>();
    for (const config of configs) {
      const value = config[key];
      if (value) {
        // @ts-ignore
        const digest = this.configPortionHashCache[key].get(value);
        if (digest) {
          digests.add(digest);
        }
      }
    }
    return Array.from(digests).join('');
  }

  private mergeConfigs(
    configs: NoteInputsConfig[]
  ): NoteInputConfig | undefined {
    const merged: Partial<NoteInputConfig> = {};

    let finalDigest = '';
    for (const key of Object.keys(
      this.configPortionMergeCache
    ) as NoteInputConfigKeys) {
      const digest = this.getMergeHash(configs, key);
      finalDigest += digest;
      let mergedPortion = this.configPortionMergeCache[key].get(digest);
      if (!mergedPortion) {
        mergedPortion = Object.assign(
          {},
          ...configs.map((config) => config[key])
        );
        // @ts-ignore
        this.configPortionMergeCache[key].set(digest, mergedPortion);
      }
      // @ts-ignore
      merged[key] = mergedPortion;
    }

    const cached = this.finalConfigMergeCache.get(finalDigest);
    if (!cached) {
      const result = noteInputConfigSchema.safeParse(merged);
      if (result.success) {
        this.finalConfigMergeCache.set(finalDigest, merged as NoteInputConfig);
        return merged as NoteInputConfig;
      } else {
        this.finalConfigMergeCache.set(finalDigest, undefined);
        return undefined;
      }
    }
    return cached;
  }

  /**
   * Get the configuration for the given note input
   *
   * @returns a valid configuration for the given note input or undefined if a
   * valid configuration couldn't be constructed, which happens typically
   * when the given note input didn't match any configuration or didn't
   * match enough "partial configs" to build a complete config.
   */
  getFileConfig(noteInputKey: string): NoteInputConfig | undefined {
    const cached = this.noteInputKeyToConfigCache.get(noteInputKey);
    if (cached) {
      return cached;
    }

    const configs = [];
    for (const config of this.rawConfig.noteInputsConfig) {
      let matched = false;
      for (const glob of config.inputs) {
        if (
          minimatch(noteInputKey, glob, {
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
            minimatch(noteInputKey, glob, {
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

    const final = this.mergeConfigs(configs);
    this.noteInputKeyToConfigCache.set(noteInputKey, final);
    return final;
  }
}
