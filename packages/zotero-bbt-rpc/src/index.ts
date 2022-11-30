import axios from 'axios';

import type { MethodToTypeMap as ItemMethodToTypeMap } from './item.js';

export * as ItemTypes from './item.js';

type MethodToTypeMap = ItemMethodToTypeMap;

export type MethodNames = keyof MethodToTypeMap;

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
  return 'http://127.0.0.1:23119';
}

export interface InvokeArgs<
  MethodName extends MethodNames,
  Params = MethodToTypeMap[MethodName]['request']
> {
  method: MethodName;
  params: Params;
  origin?: ApiOrigin;
}

export type InvokeResponse<MethodName extends MethodNames> =
  MethodToTypeMap[MethodName]['response'];

const JSON_RPC_VERSION = '2.0';

/**
 * Call Zotero Better BibTeX JSON-RPC
 *
 * See https://retorque.re/zotero-better-bibtex/exporting/json-rpc/
 */
export async function invoke<MethodName extends MethodNames>(
  args: InvokeArgs<MethodName>
): Promise<InvokeResponse<MethodName>> {
  const method = args.method;
  const params = args.params;
  const origin = getApiOrigin(args.origin);

  const response = await axios.post(
    `${origin}/better-bibtex/json-rpc`,
    {
      jsonrpc: JSON_RPC_VERSION,
      method: method,
      params: params,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
  );

  if (response.data.jsonrpc !== JSON_RPC_VERSION) {
    throw new Error(
      `Invalid response. "jsonrpc" field is ${response.data.jsonrpc}, while it should be ${JSON_RPC_VERSION}`
    );
  }
  if ('error' in response.data) {
    throw new Error(
      `JSON RPC failed with code ${response.data.error.code}. Message: ${response.data.error.message}`
    );
  }
  return response.data.result;
}
