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
