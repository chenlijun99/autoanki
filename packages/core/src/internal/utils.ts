import { AnkiConnectService } from '@autoanki/anki-connect';

export async function createDeckIfNotExisisting(
  service: AnkiConnectService,
  deck: string
): Promise<void> {
  const decks = await service.invoke('deckNames', 6);
  if (decks.indexOf(deck) < 0) {
    await service.invoke('createDeck', 6, { deck });
  }
}
