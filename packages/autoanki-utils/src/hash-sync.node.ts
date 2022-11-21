import crypto from 'node:crypto';

export function hashContentSync(content: string): string {
  const sha = crypto.createHash('sha1');
  sha.update(content);
  return sha.digest('hex');
}
