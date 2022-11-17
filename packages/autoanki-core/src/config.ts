import { z } from 'zod';

import { autoankiPluginSchema } from './plugin.js';
import { tagSchema } from './utils.js';

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
 * Anki note extraction pipeline
 */
const pipelineSchema = z
  .object({
    source: configPluginInstanceSchema,
    transformers: z.array(configPluginInstanceSchema).optional(),
  })
  .strict();

export const configSchema = z
  .object({
    defaultDeck: z.string().optional(),
    tags: tagSchema.array().optional(),
    pipeline: pipelineSchema,
  })
  .strict();

/**
 * Autoanki configuration model
 */
export type Config = z.infer<typeof configSchema>;
