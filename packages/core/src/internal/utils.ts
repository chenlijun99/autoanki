import { AnkiConnectService } from '@autoanki/anki-connect';

/**
 * As the name states
 *
 * @async
 * @param service - service
 * @param deck - jthe deck to be checked and created if not existing
 * @return void promise on success
 */
export async function createDeckIfNotExisisting(
  service: AnkiConnectService,
  deck: string
): Promise<void> {
  const decks = await service.invoke('deckNames', 6);
  if (decks.indexOf(deck) < 0) {
    await service.invoke('createDeck', 6, { deck });
  }
}

/**
 * Convert the given tags in order to ensure that they respect the Anki tag
 * format
 *
 * @param tags - input tags
 * @return converted tags
 */
export function adaptTagsToAnki(tags: string[]): string[] {
  return tags.map((tag) => {
    return tag.replace(' ', '_');
  });
}

class AssertionError extends Error {
  constructor(...args: ConstructorParameters<typeof Error>) {
    super(...args);
    this.name = 'AutoankiCoreAssertionError';
  }
}

/**
 * Throw an instance of AssertionError
 *
 * @param condition - the condition to be checked
 * @param [msg] - the optional message of the thrown AssertionError
 * @throws {AssertionError} - AssertionError
 * @return
 */
export function assert(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new AssertionError(`Assertion Error: ${msg ?? ''}`);
  }
}
