/**
 * TODO: this is incomplete. I don't need to inject JavaScript into notes right
 * now so I don't have enough motivation to allocate my limited time to this.
 */
import { AUTOANKI_TAGS } from '../common.js';

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

function main() {
  const resourceObjects = document.querySelectorAll<HTMLObjectElement>(
    `${AUTOANKI_TAGS.METADATA} > object`
  );
  const scriptFiles: Set<string> = new Set();
  resourceObjects.forEach((object) => {
    if (object.type === 'application/javascript') {
      scriptFiles.add(object.data);
    }
  });

  for (const script of scriptFiles) {
    const scriptElement = document.createElement('script');
    scriptElement.src = processObjectDataUrl(script);
  }
}

declare global {
  interface Window {
    ankiBridgeLoaded?: boolean;
  }
}

if (!window.ankiBridgeLoaded) {
  window.ankiBridgeLoaded = true;

  if (document.readyState !== 'loading') {
    main();
  } else {
    window.addEventListener('DOMContentLoaded', main, { once: true });
  }
}
