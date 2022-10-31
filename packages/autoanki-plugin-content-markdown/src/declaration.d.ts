/**
 * We use esbuild to bundle Katex's CSS and to load the bundled CSS as string
 */
declare module 'katex/dist/katex.min.css' {
  const content: string;
  export default content;
}
