import axios from 'axios';

import type { ActionsToPayloadMap as NoteActionsToPayloadMap } from './note';
import type { ActionsToPayloadMap as DeckActionsToPayloadMap } from './deck';

type ActionsToPayloadMap = NoteActionsToPayloadMap & DeckActionsToPayloadMap;

/**
 * Service that exposes an uniform interface to interact with the local Anki
 *
 * Based on Anki-connect
 *
 * See [Anki-connect](https://github.com/FooSoft/anki-connect)
 */
export class AnkiConnectService {
  constructor(private port = 8765) {}

  private get apiBaseUrl() {
    return `http://127.0.0.1::${this.port}`;
  }

  /**
   * Call anki-connect API
   *
   * @private
   * See https://github.com/microsoft/TypeScript/issues/29131
   */
  async invoke<
    ActionName extends keyof ActionsToPayloadMap,
    VersionNumber extends 6,
    RequestParams = ActionsToPayloadMap[ActionName][VersionNumber]['request'],
    Response = ActionsToPayloadMap[ActionName][VersionNumber]['response']
  >(
    ...args: RequestParams extends void
      ? [ActionName, VersionNumber]
      : [ActionName, VersionNumber, RequestParams]
  ): Promise<Response> {
    const action = args[0];
    const version = args[1];
    const params = args[2];

    const response = await axios.post(
      this.apiBaseUrl,
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
      throw response.data.error;
    }
    return response.data.result;
  }
}
