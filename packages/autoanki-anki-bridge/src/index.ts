import assert from '@autoanki/utils/assert.js';

export enum Platform {
  Desktop,
  Android,
}

export function getCurrentPlatform() {
  /*
   * Suggestion from https://www.reddit.com/r/Anki/comments/5xaccp/recommended_way_to_detect_whether_anki_deck_is/
   */
  if (navigator.userAgent.includes('QtWebEngine')) {
    return Platform.Desktop;
  }
  return Platform.Android;
}

const CURRENT_PLATFORM = getCurrentPlatform();

export function encodeObjectDataUrlIfNecessary(url: string): string {
  switch (CURRENT_PLATFORM) {
    case Platform.Desktop: {
      return url;
    }
    case Platform.Android: {
      /*
       * Usually the URL in HTML is already encoded by Anki, but there is a bug
       * in Anki-Android.
       * See https://github.com/ankidroid/Anki-Android/issues/12864
       */
      return encodeURI(url);
    }
  }
}

function basename(str: string, sep: string): string {
  return str.slice(str.lastIndexOf(sep) + 1);
}

/**
 * If a media file needs to be fetched via XHR, Ajax, fetch, dynamic import(),
 * etc., then Anki-Desktop and Anki-Android behave differently,
 * thus this function.
 *
 * NOTE that if you got the media URL from DOM elements accessing the DOM
 * attribute directly (e.g. `imgEl.src`, `objectEl.data`, etc.), rather than
 * using `getAttribute()`, then the path that you get back is a full URL.
 * E.g. given `<img src="myimg.png"/>`, using `imgEl.src` you get
 * `${window.location.origin}/myimg.png`.
 *
 * This function only takes the basename of the full URL. It works since
 * Anki media folder doesn't have subfolders.
 */
export function getMediaFileUrlForXHR(encodedPath: string): string {
  const mediaFileName = basename(encodedPath, '/');
  switch (CURRENT_PLATFORM) {
    case Platform.Desktop: {
      return new URL(mediaFileName, window.location.origin).toString();
    }
    case Platform.Android: {
      /*
       * See https://github.com/ankidroid/Anki-Android/pull/7764
       */
      return new URL(
        mediaFileName,
        'https://appassets.androidplatform.net'
      ).toString();
    }
  }
}

export interface AnkiBridgePlugin {
  onCardChange(cardEl: HTMLElement, args: unknown, prevArgs: unknown): void;
  onDestroy(): void;
}

export interface AnkiBridgePluginApi {
  misc: {
    encodeObjectDataUrlIfNecessary: typeof encodeObjectDataUrlIfNecessary;
    getMediaFileUrlForXHR: typeof getMediaFileUrlForXHR;
  };
}

export type AnkiBridgeModule = {
  new (
    pluginApi: AnkiBridgePluginApi,
    cardEl: HTMLElement,
    args: unknown
  ): AnkiBridgePlugin;
};

interface QueryBridgePluginsFn {
  /**
   * A function that returns an dictionary of bridge plugin script URL
   * (**encoded**) and any data that should be passed to them.
   */
  (cardDiv: HTMLElement): Record<string, unknown>;
}

export default class AnkiBridge {
  constructor(private scriptsQueryFn: QueryBridgePluginsFn) {}

  private currentLoadedPlugins: Map<
    string,
    { plugin: AnkiBridgePlugin; args: unknown }
  > = new Map();

  private pluginsCache: Map<string, AnkiBridgeModule> = new Map();

  private onCardChange(cardElement: HTMLElement) {
    /*
     * The card has changed.
     * Re-query the bridge plugins for the current card.
     */
    const scriptsURLs = this.scriptsQueryFn(cardElement);

    /*
     * Compute difference with the previous card
     */
    const addedScripts: string[] = [];
    const removedScripts: string[] = [];
    Object.keys(scriptsURLs).forEach((scriptFile) => {
      if (!this.currentLoadedPlugins.has(scriptFile)) {
        addedScripts.push(scriptFile);
      }
    });
    for (const loadedScript of this.currentLoadedPlugins.keys()) {
      if (!(loadedScript in scriptsURLs)) {
        removedScripts.push(loadedScript);
      }
    }

    /*
     * Load the added script, if not loaded yet
     */
    Promise.all(
      addedScripts.map(async (script) => {
        if (!this.pluginsCache.has(script)) {
          await import(getMediaFileUrlForXHR(script)).then((module) => {
            this.pluginsCache.set(script, module.default);
          });
        }
      })
    ).then(() => {
      for (const addedScript of addedScripts) {
        const pluginModule = this.pluginsCache.get(addedScript)!;
        const args = scriptsURLs[addedScript];
        const plugin = new pluginModule(
          {
            misc: {
              encodeObjectDataUrlIfNecessary,
              getMediaFileUrlForXHR,
            },
          },
          cardElement,
          args
        );

        this.currentLoadedPlugins.set(addedScript, { plugin, args });
      }

      for (const removedScript of removedScripts) {
        const plugin = this.currentLoadedPlugins.get(removedScript)!;
        plugin.plugin.onDestroy();
        this.currentLoadedPlugins.delete(removedScript)!;
      }

      for (const [scriptName, plugin] of this.currentLoadedPlugins.entries()) {
        const currentArgs = scriptsURLs[scriptName];
        plugin.plugin.onCardChange(cardElement, currentArgs, plugin.args);
      }
    });
  }

  main() {
    console.info('Anki-bridge starting');

    const ankiCardDiv = document.querySelectorAll<HTMLDivElement>(`#qa`);
    assert(ankiCardDiv.length === 1);

    this.onCardChange(ankiCardDiv.item(0));
    const observer = new MutationObserver(() => {
      this.onCardChange(ankiCardDiv.item(0));
    });

    observer.observe(ankiCardDiv.item(0), {
      attributes: false,
      childList: true,
      subtree: false,
    });
  }

  start() {
    if (document.readyState !== 'loading') {
      this.main();
    } else {
      window.addEventListener('DOMContentLoaded', () => this.main(), {
        once: true,
      });
    }
  }
}
