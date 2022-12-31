import fs from 'node:fs';

import { z } from 'zod';
import { match } from 'path-to-regexp';

import { AutoankiPluginApi } from '@autoanki/core';
import { invoke, ItemTypes } from '@autoanki/zotero-bbt-rpc';
import assert from '@autoanki/utils/assert.js';

import type { Attachment } from './common.js';

type Route<T extends z.ZodTypeAny> = {
  path: string;
  paramSchema: T;
  handler: (
    api: AutoankiPluginApi,
    params: z.infer<T>
  ) => Promise<Attachment | undefined>;
};

function defineRoute<T extends z.ZodTypeAny>(route: Route<T>): Route<T> {
  return route;
}

const routes = [
  defineRoute({
    path: 'pdf/byCiteKey/:citeKey/:index?',
    paramSchema: z
      .object({
        citeKey: z.string(),
        index: z
          .string()
          .optional()
          .default('0')
          .transform((str) => {
            return Number.parseInt(str, 10);
          }),
      })
      .strict(),
    handler: async (api, params) => {
      const { citeKey, index } = params;

      let attachments: ItemTypes.AttachementResponse[] = [];
      try {
        attachments = await invoke({
          method: 'item.attachments',
          params: { citekey: citeKey },
        });
      } catch (error) {
        api.logger.warn(
          `Unable to fetch attachments of cite key "${citeKey}": ${error}`
        );
        return;
      }

      attachments = attachments.filter((att) => {
        return att.path !== false && !!att.annotations;
      });

      if (attachments.length === 0) {
        api.logger.warn(
          `The item referenced by cite key "${citeKey}" has no attachments`
        );
      } else if (index < 0 || index >= attachments.length) {
        api.logger.warn(
          `Invalid attachement index "${index}". The item referenced by cite key ${citeKey} has ${attachments.length} attachments.`
        );
      } else {
        const attachment = attachments[index];
        assert(typeof attachment.path === 'string');
        const buffer = await fs.promises.readFile(attachment.path);
        return {
          base64Content: buffer.toString('base64'),
          openUrl: attachment.open,
        } as Attachment;
      }
    },
  }),
] as const;

const routeMatcherToRoute = routes.map((route) => {
  return { matcher: match(route.path), route } as const;
});

export async function handleApiWithPath(
  api: AutoankiPluginApi,
  path: string
): Promise<Attachment | undefined> {
  api.logger.log(`Resolving zotero attachement with path: ${path}`);
  for (const route of routeMatcherToRoute) {
    const result = route.matcher(path);
    if (result) {
      const parseResult = route.route.paramSchema.safeParse(result.params);
      if (parseResult.success) {
        api.logger.log(`Resolved zotero attachement with path: ${path}`);
        return route.route.handler(api, parseResult.data);
      } else {
        api.logger.warn(
          `Invalid parameters for endpoint ${route.route.path}. ${parseResult.error}`
        );
      }
      break;
    }
  }
  api.logger.log(`Unresolved Zotero attachement with path: ${path}`);
}
