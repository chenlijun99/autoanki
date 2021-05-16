export type ActionsToPayloadMap = {
  deckNames: {
    6: {
      request: void;
      response: string[];
    };
  };
  deckNamesAndIds: {
    6: {
      request: void;
      response: Record<string, number>;
    };
  };
  /**
   * Accepts an array of card IDs and returns an object with each deck name as
   * a key, and its value an array of the given cards which belong to it.
   */
  getDecks: {
    6: {
      request: {
        cards: number[];
      };
      response: Record<string, number[]>;
    };
  };
  createDeck: {
    6: {
      request: {
        deck: string;
      };
      response: Record<string, number[]>;
    };
  };
};
