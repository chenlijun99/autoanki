/**
 * Project convention
 */
declare module 'bridge/index.bundled.js' {
  const content: string;
  export default content;
}

declare module 'bridge/*.bundled.js' {
  const content: string;
  export default content;
}
