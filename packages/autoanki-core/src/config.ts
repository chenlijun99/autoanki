import { z } from 'zod';

import { autoankiPluginSchema } from './plugin.js';

const preloadedLoadedPluginSchema = z.tuple([
  autoankiPluginSchema,
  z.unknown(),
]);

const dynamicallyLoadedPluginSchema = z.union([
  z.string(),
  z.tuple([z.string(), z.unknown()]),
]);

const configPluginInstanceSchema = z.union([
  preloadedLoadedPluginSchema,
  dynamicallyLoadedPluginSchema,
]);

export type ConfigPluginInstance = z.infer<typeof configPluginInstanceSchema>;

/**
 * Similar to how the `test` field of webpack works.
 * See https://webpack.js.org/configuration/module/#condition
 *
 * * If it's a string, all the input that start with the given string are
 * processed
 * * If it's a RegExp, all the input that match with the given regex are
 * processed
 */
const pipelineInputTestSchema = z.union([z.string(), z.instanceof(RegExp)]);

/**
 * Anki note extraction pipeline
 */
const pipelineSchema = z
  .object({
    test: pipelineInputTestSchema,
    source: configPluginInstanceSchema,
    transformers: z.array(configPluginInstanceSchema).optional(),
  })
  .strict();

export const configSchema = z
  .object({
    pipelines: z.array(pipelineSchema),
  })
  .strict();

/**
 * Autoanki configuration model
 */
export type Config = z.infer<typeof configSchema>;
