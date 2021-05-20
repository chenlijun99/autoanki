import { AnkiConnectService } from '@autoanki/anki-connect';

function identity<T>(a: T): T {
  return a;
}

interface SyncOptions {
  text2AnkiField?: (text: string) => string;
  ankiField2Text?: (field: string) => string;
  autoCreateSimilarityThreshold: number;
  /**
   * Anki-connect port
   */
  port?: number;
}

const defaultOptions: SyncOptions = {
  text2AnkiField: identity,
  ankiField2Text: identity,
  autoCreateSimilarityThreshold: 80,
};

/**
 * @returns The modified texts
 *
 * Behaviour:
 *
 * Markdown file already synced different with Anki note => modify markdown file
 * Markdown file different than last synced
 *  * last synced version === Anki note => modify anki note
 *  * last synced version !== Anki note => Anki note also modified => conflict resolution
 *
 * Rather than converting to HTML, why not load markdown library?
 * Makes it easier to edit Anki card on phone...
 */
export async function sync(
  texts: string[],
  deck: string,
  options?: Partial<SyncOptions>
): Promise<string[]> {
  const opts: SyncOptions = {
    ...defaultOptions,
    ...options,
  };

  const service = new AnkiConnectService(opts.port);

  const decks = await service.invoke('deckNames', 6);
  if (decks.indexOf(deck) < 0) {
    await service.invoke('createDeck', 6, { deck });
  }

  const noteIds = await service.invoke('findNotes', 6, {
    query: `deck:"${deck}"`,
  });

  const notesInDeck = await service.invoke('notesInfo', 6, {
    notes: noteIds,
  });

  texts.forEach((text) => {
    console.log(text);
  });

  return ['hello'];
}
