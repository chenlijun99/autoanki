import { AnkiConnectService } from '@autoanki/anki-connect';
import { AutoAnkiConfiguration } from './config';
import { add, AddOperation } from './add';
import { sync } from './sync';

export * as ConfigTypes from './config';

/**
 * Service that manages bidirectional sync between between text files and Anki
 * notes
 */
export default class AutoAnkiService {
  constructor(private config: AutoAnkiConfiguration) {
    this.ankiConnect = new AnkiConnectService(this.config.ankiConnectPort);
  }

  /**
   * Given a text file, parse the Anki notes in it based on the given
   * configuration and insert the parsed notes in Anki.
   *
   * @async
   * @param text - [TODO:description]
   * @param deck - [TODO:description]
   * @param tags - [TODO:description]
   * @return [TODO:description]
   */
  async add(text: string, deck: string, tags: string[]): Promise<AddOperation> {
    return add(this.ankiConnect, this.config, text, deck, tags);
  }

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
   *
   * Note moved from one file to another
   */
  async sync(
    texts: string[],
    previousVersionTexts: string[],
    deck: string
  ): Promise<string[]> {
    return sync(
      this.ankiConnect,
      this.config,
      texts,
      previousVersionTexts,
      deck
    );
  }

  private ankiConnect: AnkiConnectService;
}
