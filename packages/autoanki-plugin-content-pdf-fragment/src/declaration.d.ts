/**
 * We use esbuild to bundle CSS and to load the bundled CSS as string
 */
declare module '*.css' {
  const content: string;
  export default content;
}
