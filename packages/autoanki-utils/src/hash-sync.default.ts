import crypto from 'crypto-js';

export function hashContentSync(content: string): string {
  return crypto.SHA1(content).toString();
}
