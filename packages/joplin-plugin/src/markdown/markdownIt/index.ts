import type MarkdownIt from 'markdown-it';

export default function () {
  return {
    plugin: (markdownIt: MarkdownIt, context: any) => {},
  };
}
