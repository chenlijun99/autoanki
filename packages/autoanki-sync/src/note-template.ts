import { unified } from 'unified';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import type { Element, Root } from 'hast';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';

import type { AutoankiMediaFile } from '@autoanki/core';
import { ModelTypes } from '@autoanki/anki-connect';
import assert from '@autoanki/utils/assert.js';

const AutoankiSyncContainerClassName = 'autoanki-sync-scripts';

const pluginDataKey = '@autoanki/sync';
interface PluginData {
  rewritten: boolean;
}

interface PluginOptions {
  requiredScripts: string[];
}

const rehypeInstrumentAutoankiSyncScripts: Plugin<[PluginOptions]> = (
  options
) => {
  return (tree, file) => {
    let requiresRewrite = false;
    let autoankiSyncContainer: Element | undefined;
    let autoankiSyncContainerParent: Root | Element | null | undefined;

    visit(tree as Root, 'element', (node, _, parent) => {
      let matchedContainer = false;
      if (node.tagName === 'div') {
        const className = node.properties?.className;
        if (
          typeof className === 'string' &&
          className === AutoankiSyncContainerClassName
        ) {
          matchedContainer = true;
        } else if (
          Array.isArray(className) &&
          className.includes(AutoankiSyncContainerClassName)
        ) {
          matchedContainer = true;
        }
      }

      if (matchedContainer) {
        autoankiSyncContainer = node;
        autoankiSyncContainerParent = parent;

        const existingScripts = node.children
          .filter(
            (childNode): childNode is Element =>
              childNode.type === 'element' &&
              childNode.tagName === 'script' &&
              !!childNode.properties?.src &&
              typeof childNode.properties.src === 'string'
          )
          .map((childScriptNode) => childScriptNode.properties!.src as string);
        if (existingScripts.length !== options.requiredScripts.length) {
          requiresRewrite = true;
        }
        if (!requiresRewrite) {
          for (const script of options.requiredScripts) {
            if (!existingScripts.includes(script)) {
              requiresRewrite = true;
              break;
            }
          }
        }
        if (!requiresRewrite) {
          for (const script of existingScripts) {
            if (!options.requiredScripts.includes(script)) {
              requiresRewrite = true;
              break;
            }
          }
        }
      }
    });

    const rewrite =
      requiresRewrite ||
      (autoankiSyncContainer === undefined &&
        options.requiredScripts.length > 0) ||
      (autoankiSyncContainer !== undefined &&
        options.requiredScripts.length === 0);

    file.data[pluginDataKey] = {
      rewritten: rewrite,
    } as PluginData;

    if (rewrite) {
      if (options.requiredScripts.length > 0) {
        const scriptsChildren = options.requiredScripts.map((scriptSrc) => {
          return {
            type: 'element',
            tagName: 'script',
            properties: { src: scriptSrc },
            children: [],
          } as Element;
        });
        if (autoankiSyncContainer) {
          autoankiSyncContainer.children = scriptsChildren;
        } else {
          let root: Root | undefined;
          visit(tree as Root, 'root', (node) => {
            root = node;
          });
          assert(root !== undefined);

          autoankiSyncContainer = {
            type: 'element',
            tagName: 'div',
            properties: { className: [AutoankiSyncContainerClassName] },
            children: scriptsChildren,
          };
          root.children.push(autoankiSyncContainer);
        }
      }
      if (
        options.requiredScripts.length === 0 &&
        autoankiSyncContainer !== undefined &&
        autoankiSyncContainerParent
      ) {
        const index = autoankiSyncContainerParent.children.indexOf(
          autoankiSyncContainer
        );
        if (index > -1) {
          autoankiSyncContainerParent.children.splice(index, 1);
        }
      }
    }
  };
};

/**
 * Update the note templates so that they contain the expected scripts.
 * Old scripts are deleted.
 *
 * Returns the instrumented note templates
 */
export async function updateNoteTemplatesIfNecessary(
  templates: ModelTypes.ModelTemplates,
  expectedScripts: AutoankiMediaFile[]
): Promise<ModelTypes.ModelTemplates | undefined> {
  const newTemplates: ModelTypes.ModelTemplates = {};

  const processor = unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeInstrumentAutoankiSyncScripts, {
      requiredScripts: expectedScripts.map((script) =>
        encodeURIComponent(script.metadata.storedFilename)
      ),
    })
    .use(rehypeStringify);

  let rewritten = false;
  for (const [cardName, cardTemplate] of Object.entries(templates)) {
    const [Front, Back] = await Promise.all([
      await processor.process(cardTemplate.Front),
      await processor.process(cardTemplate.Back),
    ]);
    newTemplates[cardName] = {
      Front: Front.value.toString(),
      Back: Back.value.toString(),
    };
    rewritten =
      (Front.data[pluginDataKey] as PluginData).rewritten ||
      (Back.data[pluginDataKey] as PluginData).rewritten;
  }

  if (rewritten) {
    return newTemplates;
  }
}
