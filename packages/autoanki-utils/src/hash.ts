import webcrypto from '#webcrypto.js';

const { subtle } = webcrypto;

export async function hashContent(content: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(content);
  const hashBuffer = await subtle.digest('SHA-1', msgUint8);
  const hashArray = [...new Uint8Array(hashBuffer)];
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(''); // convert bytes to hex string
  return hashHex;
}
