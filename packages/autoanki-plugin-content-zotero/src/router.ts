import fs from 'node:fs';

import { z } from 'zod';
import { match } from 'path-to-regexp';

import { AutoankiPluginApi } from '@autoanki/core';
import { invoke } from '@autoanki/zotero-bbt-rpc';

type Route<T extends z.ZodTypeAny> = {
  path: string;
  paramSchema: T;
  handler: (
    api: AutoankiPluginApi,
    params: z.infer<T>
  ) => Promise<string | undefined>;
};

function defineRoute<T extends z.ZodTypeAny>(route: Route<T>): Route<T> {
  return route;
}

const routes = [
  defineRoute({
    path: 'citeKey/:citeKey/:index?',
    paramSchema: z
      .object({
        citeKey: z.string(),
        index: z
          .string()
          .optional()
          .default('0')
          .transform((str) => {
            return Number.parseInt(str);
          }),
      })
      .strict(),
    handler: async (api, params) => {
      const { citeKey, index } = params;

      let attachments = [];
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

      if (attachments.length === 0) {
        api.logger.warn(
          `The item referenced by cite key "${citeKey}" has no attachments`
        );
      } else if (index < 0 || index >= attachments.length) {
        api.logger.warn(
          `Invalid attachement index "${index}". The item referenced by cite key ${citeKey} has ${attachments.length} attachments.`
        );
      } else {
        const attachement = attachments[index];
        const buffer = await fs.promises.readFile(attachement.path);
        return buffer.toString('base64');
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
): Promise<string | undefined> {
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
