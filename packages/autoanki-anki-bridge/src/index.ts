import assert from '@autoanki/utils/assert.js';

enum Platform {
  Desktop,
  Android,
}

function getCurrentPlatform() {
  /*
   * Suggestion from https://www.reddit.com/r/Anki/comments/5xaccp/recommended_way_to_detect_whether_anki_deck_is/
   */
  if (navigator.userAgent.includes('QtWebEngine')) {
    return Platform.Desktop;
  }
  return Platform.Android;
}

const CURRENT_PLATFORM = getCurrentPlatform();

function processObjectDataUrl(url: string): string {
  switch (CURRENT_PLATFORM) {
    case Platform.Desktop: {
      return url;
    }
    case Platform.Android: {
      // I have no idea why it is required...
      return encodeURI(url);
    }
  }
}

export interface AnkiBridgePlugin {
  onCardChange(cardEl: HTMLElement, args: unknown, prevArgs: unknown): void;
  onDestroy(): void;
}

export type AnkiBridgeModule = {
  new (cardEl: HTMLElement, args: unknown): AnkiBridgePlugin;
};

interface QueryBridgePluginsFn {
  /**
   * A function that returns an dictionary of bridge plugin script URL and any
   * data that should be passed to them
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
    const scripts = this.scriptsQueryFn(cardElement);

    /*
     * Compute difference with the previous card
     */
    const addedScripts: string[] = [];
    const removedScripts: string[] = [];
    Object.keys(scripts).forEach((scriptFile) => {
      if (!this.currentLoadedPlugins.has(scriptFile)) {
        addedScripts.push(scriptFile);
      }
    });
    for (const loadedScript of this.currentLoadedPlugins.keys()) {
      if (!(loadedScript in scripts)) {
        removedScripts.push(loadedScript);
      }
    }

    /*
     * Load the added script, if not loaded yet
     */
    Promise.all(
      addedScripts.map(async (script) => {
        if (!this.pluginsCache.has(script)) {
          await import(script).then((module) => {
            this.pluginsCache.set(script, module.default);
          });
        }
      })
    ).then(() => {
      for (const addedScript of addedScripts) {
        const pluginModule = this.pluginsCache.get(addedScript)!;
        const args = scripts[addedScript];
        const plugin = new pluginModule(cardElement, args);

        this.currentLoadedPlugins.set(addedScript, { plugin, args: args });
      }

      for (const removedScript of removedScripts) {
        const plugin = this.currentLoadedPlugins.get(removedScript)!;
        plugin.plugin.onDestroy();
        this.currentLoadedPlugins.delete(removedScript)!;
      }

      for (const [scriptName, plugin] of this.currentLoadedPlugins.entries()) {
        const currentArgs = scripts[scriptName];
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
