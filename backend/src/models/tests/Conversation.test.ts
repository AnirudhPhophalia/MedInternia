import Conversation from "../Conversation";

describe("Conversation model", () => {
  it("enforces a unique compound index on the participant pair", () => {
    const indexes = Conversation.schema.indexes();

    const uniquePairIndex = indexes.find(([, options]) => options.unique === true);
    expect(uniquePairIndex).toBeDefined();
    expect(uniquePairIndex?.[0]).toEqual(
      expect.objectContaining({
        "participants.0": 1,
        "participants.1": 1
      })
    );
  });
});
