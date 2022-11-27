export function stringToBase64(str: string): string {
  return Buffer.from(str).toString('base64');
}

export function base64ToString(str: string): string {
  return Buffer.from(str, 'base64').toString();
}
