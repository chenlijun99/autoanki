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

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.addEventListener('error', () =>
        reject(new Error('failed to issue request'))
      );
      xhr.addEventListener('load', () => {
        try {
          const response: any = JSON.parse(xhr.responseText);
          if (Object.getOwnPropertyNames(response).length !== 2) {
            throw new Error('response has an unexpected number of fields');
          }
          if (!response.error) {
            throw new Error('response is missing required error field');
          }
          if (!response.result) {
            throw new Error('response is missing required result field');
          }
          if (response.error) {
            throw response.error;
          }
          resolve(response.result);
        } catch (e) {
          reject(e);
        }
      });

      xhr.open('POST', this.apiBaseUrl);
      xhr.send(JSON.stringify({ action, version, params }));
    });
  }
}
