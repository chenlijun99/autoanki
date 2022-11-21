/*
 * From https://stackoverflow.com/a/26766402
 */
const urlRegex = /^(([^#/:?]+):)?(\/\/([^#/?]*))?([^#?]*)(\?([^#]*))?(#(.*))?/;

/**
 * Given a properly encoded URL that *could* point to a local file, i.e. that satisfies any of
 * the following conditions:
 *
 * * It is a relative path (e.g. `./a/b/c.png`).
 * * It is an absolute path (e.g. `/a/b/c.png`).
 * * It is a URL using the file protocol (e.g. `file:///a/b/c.png`)
 *
 * return the corresponding file path.
 *
 * If the given URL can't point to a local file (e.g. uses `http:/` protocol),
 * then return undefined.
 */
export function urlToFilePath(url: string): string | undefined {
  const match = urlRegex.exec(url);
  if (match) {
    const protocol = match[2];
    const path = match[5];
    if (
      (protocol === undefined || protocol === '' || protocol === 'file') &&
      path &&
      path.length > 0
    ) {
      return decodeURI(path);
    }
  }
}
