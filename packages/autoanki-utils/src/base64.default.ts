import { Base64 } from 'js-base64';

export function stringToBase64(str: string): string {
  return Base64.encode(str);
}

export function base64ToString(str: string): string {
  return Base64.decode(str);
}
