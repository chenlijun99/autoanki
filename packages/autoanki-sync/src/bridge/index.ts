import AnkiBridge, {
  encodeObjectDataUrlIfNecessary,
} from '@autoanki/anki-bridge';
import { AUTOANKI_HTML_CONSTANTS } from '../common.js';

declare global {
  interface Window {
    ankiBridgeLoaded?: boolean;
  }
}

if (!window.ankiBridgeLoaded) {
  window.ankiBridgeLoaded = true;

  function isScriptEleemnt(
    element: HTMLOrSVGScriptElement
  ): element is HTMLScriptElement {
    return typeof (element as HTMLScriptElement).src === 'string';
  }

  let thisScriptSrc: string | undefined;
  if (document.currentScript && isScriptEleemnt(document.currentScript)) {
    thisScriptSrc = document.currentScript.src;
  } else if (import.meta.url) {
    thisScriptSrc = import.meta.url;
  }

  function queryBridgePlugins(cardDiv: HTMLElement) {
    const resourceObjects = cardDiv.querySelectorAll<HTMLObjectElement>(
      `${AUTOANKI_HTML_CONSTANTS.METADATA_TAG} object`
    );
    const plugins: Record<string, unknown> = {};
    resourceObjects.forEach((object) => {
      if (object.type === 'application/javascript') {
        const scriptUrl = encodeObjectDataUrlIfNecessary(object.data);

        if (scriptUrl !== thisScriptSrc && !(scriptUrl in plugins)) {
          const scriptArgs = object.getAttribute(
            `data-${AUTOANKI_HTML_CONSTANTS.METADATA_SCRIPT_ARGS_DATA_ATTRIBUTE}`
          );
          if (scriptArgs) {
            plugins[scriptUrl] = JSON.parse(scriptArgs);
          } else {
            plugins[scriptUrl] = undefined;
          }
        }
      }
    });
    return plugins;
  }

  const ankiBridge = new AnkiBridge(queryBridgePlugins);
  ankiBridge.start();
}
