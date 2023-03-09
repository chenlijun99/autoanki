import axios from 'axios';

import type { ActionsToPayloadMap as NoteActionsToPayloadMap } from './note.js';
import type { ActionsToPayloadMap as DeckActionsToPayloadMap } from './deck.js';
import type { ActionsToPayloadMap as ModelActionsToPayloadMap } from './model.js';
import type { ActionsToPayloadMap as MediaActionsToPayloadMap } from './media.js';
import type { ActionsToPayloadMap as MiscellaneousActionsToPayloadMap } from './miscellaneous.js';

export * as CardTypes from './card.js';
export * as NoteTypes from './note.js';
export * as ModelTypes from './model.js';
export * as MediaTypes from './media.js';

type ActionsToPayloadMap = NoteActionsToPayloadMap &
  DeckActionsToPayloadMap &
  ModelActionsToPayloadMap &
  MediaActionsToPayloadMap &
  MiscellaneousActionsToPayloadMap;

export type ActionNames = keyof ActionsToPayloadMap;

/**
 * If a number, then it represents the port number of the API origin, then
 * http://127.0.0.1 is used as protocol and host.
 * If a string, then it is treated as the API origin.
 */
export type ApiOrigin = string | number;
function getApiOrigin(input?: ApiOrigin): string {
  if (input) {
    return typeof input === 'number' ? `http://127.0.0.1:${input}` : input;
  }
  return 'http://127.0.0.1:8765';
}

export interface InvokeArgs<
  ActionName extends ActionNames,
  VersionNumber extends 6,
  RequestParams = ActionsToPayloadMap[ActionName][VersionNumber]['request']
> {
  action: ActionName;
  version: VersionNumber;
  request: RequestParams;
  origin?: ApiOrigin;
}

export type InvokeResponse<
  ActionName extends ActionNames,
  VersionNumber extends 6
> = ActionsToPayloadMap[ActionName][VersionNumber]['response'];

/**
 * Call anki-connect API
 *
 * See https://github.com/microsoft/TypeScript/issues/29131
 */
export async function invoke<
  ActionName extends ActionNames,
  VersionNumber extends 6
>(
  args: InvokeArgs<ActionName, VersionNumber>
): Promise<InvokeResponse<ActionName, VersionNumber>> {
  const action = args.action;
  const version = args.version;
  const params = args.request;
  const origin = getApiOrigin(args.origin);

  const response = await axios.post(
    origin,
    JSON.stringify({ action, version, params })
  );
  if (Object.getOwnPropertyNames(response.data).length !== 2) {
    throw new Error('response has an unexpected number of fields');
  }
  if (!('error' in response.data)) {
    throw new Error('response is missing required error field');
  }
  if (!('result' in response.data)) {
    throw new Error('response is missing required result field');
  }
  if (response.data.error) {
    throw new Error(`Anki-connect request failed: "${response.data.error}"`);
  }
  return response.data.result;
}
