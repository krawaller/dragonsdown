import { describe, it, expect } from "vitest";
import {
  extractCards,
  extractChips,
  normalizeTitle,
  prettifyChipName,
  resolveCards,
} from ".";

describe("prettifyChipName", () => {
  it("splits at lower→upper boundaries", () => {
    expect(prettifyChipName("AdultDragons")).toBe("Adult Dragons");
    expect(prettifyChipName("DeathHound")).toBe("Death Hound");
    expect(prettifyChipName("GiantSpiders")).toBe("Giant Spiders");
  });

  it("leaves single-word PascalCase names alone", () => {
    expect(prettifyChipName("Bandits")).toBe("Bandits");
    expect(prettifyChipName("Banshees")).toBe("Banshees");
  });

  it("capitalizes the first letter when GMNotes is fully lowercase", () => {
    expect(prettifyChipName("aurorans")).toBe("Aurorans");
    expect(prettifyChipName("consul")).toBe("Consul");
    expect(prettifyChipName("watch")).toBe("Watch");
  });
});

function card(nickname: string, cardID: number, deckId: string, deck: object) {
  return {
    Name: "Card",
    Nickname: nickname,
    CardID: cardID,
    CustomDeck: { [deckId]: deck },
  };
}

const SAMPLE_DECK = {
  FaceURL: "https://example.com/face.png",
  BackURL: "https://example.com/back.png",
  NumWidth: 10,
  NumHeight: 7,
  UniqueBack: false,
};

describe("extractCards", () => {
  it("extracts a top-level card with derived row/col", () => {
    const save = {
      ObjectStates: [card("Foo", 90508, "905", SAMPLE_DECK)],
    };
    const out = extractCards(save, "eastern");
    expect(out["Foo"]).toEqual([
      {
        source: "eastern",
        faceURL: SAMPLE_DECK.FaceURL,
        backURL: SAMPLE_DECK.BackURL,
        numWidth: 10,
        numHeight: 7,
        // index = 90508 - 905*100 = 8; row = 0, col = 8
        row: 0,
        col: 8,
        uniqueBack: false,
      },
    ]);
  });

  it("recurses through Bag and Deck containers", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          ContainedObjects: [
            {
              Name: "Deck",
              ContainedObjects: [card("DeepCard", 214, "2", SAMPLE_DECK)],
            },
          ],
        },
      ],
    };
    const out = extractCards(save, "eastern");
    expect(out["DeepCard"]).toHaveLength(1);
    // index = 214 - 2*100 = 14; row = 1, col = 4
    expect(out["DeepCard"][0]).toMatchObject({ row: 1, col: 4 });
  });

  it("groups multiple cards under the same nickname", () => {
    const save = {
      ObjectStates: [
        card("Twin", 100, "1", SAMPLE_DECK),
        card("Twin", 205, "2", SAMPLE_DECK),
      ],
    };
    const out = extractCards(save, "eastern");
    expect(out["Twin"]).toHaveLength(2);
  });

  it("skips cards with empty or missing nicknames", () => {
    const save = {
      ObjectStates: [card("", 100, "1", SAMPLE_DECK), card("Foo", 101, "1", SAMPLE_DECK)],
    };
    const out = extractCards(save, "eastern");
    expect(Object.keys(out)).toEqual(["Foo"]);
  });

  it("normalizes curly apostrophe + strips it so PDF/TTS spellings match", () => {
    // PDF uses U+2019 (’); TTS uses U+0027 ('); both land under the same key.
    const save = {
      ObjectStates: [card("Champion's Blade", 100, "1", SAMPLE_DECK)],
    };
    const out = extractCards(save, "eastern");
    expect(Object.keys(out)).toEqual(["Champions Blade"]);
    expect(normalizeTitle("Champion’s Blade")).toBe("Champions Blade");
  });

  it("matches when one side omits the apostrophe entirely", () => {
    // PDF: `Adventurer’s Toolkit`. TTS: `Adventurers Toolkit` (no apostrophe).
    const save = {
      ObjectStates: [card("Adventurers Toolkit", 100, "1", SAMPLE_DECK)],
    };
    const out = extractCards(save, "eastern");
    expect(Object.keys(out)).toEqual(["Adventurers Toolkit"]);
    expect(normalizeTitle("Adventurer’s Toolkit")).toBe("Adventurers Toolkit");
  });

  it("normalizes double quotes too", () => {
    expect(normalizeTitle("“foo”")).toBe('"foo"');
  });

  it("treats CardCustom the same as Card", () => {
    const save = {
      ObjectStates: [
        {
          Name: "CardCustom",
          Nickname: "Beastmaster (Faunamancy)",
          CardID: 100,
          CustomDeck: { "1": SAMPLE_DECK },
        },
      ],
    };
    const out = extractCards(save, "eastern");
    expect(Object.keys(out)).toEqual(["Beastmaster (Faunamancy)"]);
  });

  it("preserves Tags as a sorted array when present", () => {
    const save = {
      ObjectStates: [
        {
          ...card("Tagged", 100, "1", SAMPLE_DECK),
          Tags: ["Merchant", "Item", "Steal"],
        },
      ],
    };
    expect(extractCards(save, "eastern")["Tagged"][0].tags).toEqual([
      "Item",
      "Merchant",
      "Steal",
    ]);
  });

  it("omits tags when the Tags array is missing or empty", () => {
    const save = {
      ObjectStates: [
        card("Untagged", 100, "1", SAMPLE_DECK),
        { ...card("EmptyTags", 101, "1", SAMPLE_DECK), Tags: [] },
      ],
    };
    const out = extractCards(save, "eastern");
    expect("tags" in out["Untagged"][0]).toBe(false);
    expect("tags" in out["EmptyTags"][0]).toBe(false);
  });

  it("merges tags across duplicate cells (union, sorted)", () => {
    const save = {
      ObjectStates: [
        { ...card("Twin", 100, "1", SAMPLE_DECK), Tags: ["A", "B"] },
        { ...card("Twin", 100, "1", SAMPLE_DECK), Tags: ["B", "C"] },
      ],
    };
    expect(extractCards(save, "eastern")["Twin"]).toHaveLength(1);
    expect(extractCards(save, "eastern")["Twin"][0].tags).toEqual([
      "A",
      "B",
      "C",
    ]);
  });

  it("records the full ancestry of nicknamed containers, outermost first", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "DESOLATION Cards",
          ContainedObjects: [
            {
              Name: "Bag",
              Nickname: "Inner Bag",
              ContainedObjects: [card("Buried", 100, "1", SAMPLE_DECK)],
            },
            card("Top", 101, "1", SAMPLE_DECK),
            {
              Name: "Deck",
              ContainedObjects: [card("InDeck", 102, "1", SAMPLE_DECK)],
            },
          ],
        },
      ],
    };
    const out = extractCards(save, "eastern");
    expect(out["Top"][0].ancestry).toEqual(["DESOLATION Cards"]);
    expect(out["Buried"][0].ancestry).toEqual([
      "DESOLATION Cards",
      "Inner Bag",
    ]);
    // The Deck has no Nickname so it doesn't contribute; only the Bag does.
    expect(out["InDeck"][0].ancestry).toEqual(["DESOLATION Cards"]);
  });

  it("records ancestry for any nicknamed container, not just Bag", () => {
    // Custom_Model_Bag, Deck, anything that contains the card and carries a
    // Nickname is included.
    const save = {
      ObjectStates: [
        {
          Name: "Custom_Model_Bag",
          Nickname: "Adult Dragons",
          ContainedObjects: [
            {
              Name: "Deck",
              Nickname: "Subdeck",
              ContainedObjects: [card("X", 100, "1", SAMPLE_DECK)],
            },
          ],
        },
      ],
    };
    expect(extractCards(save, "eastern")["X"][0].ancestry).toEqual([
      "Adult Dragons",
      "Subdeck",
    ]);
  });

  it("omits `ancestry` for cards with no nicknamed ancestors", () => {
    const save = { ObjectStates: [card("Loose", 100, "1", SAMPLE_DECK)] };
    expect("ancestry" in extractCards(save, "eastern")["Loose"][0]).toBe(false);
  });

  it("skips ancestors with an empty Nickname while keeping deeper named ones", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "",
          ContainedObjects: [
            {
              Name: "Bag",
              Nickname: "Named",
              ContainedObjects: [card("X", 100, "1", SAMPLE_DECK)],
            },
          ],
        },
      ],
    };
    expect(extractCards(save, "eastern")["X"][0].ancestry).toEqual(["Named"]);
  });

  it("preserves source identifier across all extracted cards", () => {
    const save = { ObjectStates: [card("A", 100, "1", SAMPLE_DECK)] };
    const out = extractCards(save, "my-source");
    expect(out["A"][0].source).toBe("my-source");
  });
});

function chip(gmNotes: string, imageURL: string, secondary = "") {
  return {
    Name: "Custom_Tile",
    GMNotes: gmNotes,
    LuaScript: "chipName = self.getGMNotes()\n",
    CustomImage: { ImageURL: imageURL, ImageSecondaryURL: secondary },
  };
}

describe("extractChips", () => {
  it("extracts chips by GMNotes when LuaScript starts with chipName =", () => {
    const save = {
      ObjectStates: [chip("Trolls", "front.png", "back.png")],
    };
    const out = extractChips(save, "eastern");
    expect(out["Trolls"]).toEqual([
      {
        source: "eastern",
        imageURL: "front.png",
        imageSecondaryURL: "back.png",
        locations: [{ ancestry: [], count: 1 }],
      },
    ]);
  });

  it("skips Custom_Tile objects without the chipName marker", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Custom_Tile",
          GMNotes: "Map",
          LuaScript: "function onLoad() end",
          CustomImage: { ImageURL: "x" },
        },
      ],
    };
    expect(extractChips(save, "eastern")).toEqual({});
  });

  it("dedups physical copies into one entry with per-ancestry counts", () => {
    const save = {
      ObjectStates: [
        chip("Trolls", "front.png", "back.png"),
        chip("Trolls", "front.png", "back.png"),
        chip("Trolls", "front.png", "back.png"),
      ],
    };
    const out = extractChips(save, "eastern")["Trolls"];
    expect(out).toHaveLength(1);
    expect(out[0].locations).toEqual([{ ancestry: [], count: 3 }]);
  });

  it("keeps distinct URL pairs separate", () => {
    const save = {
      ObjectStates: [
        chip("Bandits", "a.png", "back.png"),
        chip("Bandits", "a.png", "back.png"),
        chip("Bandits", "b.png", "back.png"),
      ],
    };
    const out = extractChips(save, "eastern")["Bandits"];
    expect(out).toHaveLength(2);
    const totals = out.map((c) =>
      c.locations.reduce((n, l) => n + l.count, 0),
    );
    expect(totals.sort()).toEqual([1, 2]);
  });

  it("groups physical copies under their nicknamed-ancestor location", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Plains Chips",
          ContainedObjects: [
            chip("Goblins", "g.png", "b.png"),
            chip("Goblins", "g.png", "b.png"),
            chip("Goblins", "g.png", "b.png"),
          ],
        },
        {
          Name: "Bag",
          Nickname: "Woods Chips",
          ContainedObjects: [
            chip("Goblins", "g.png", "b.png"),
            chip("Goblins", "g.png", "b.png"),
          ],
        },
        // One copy not in any nicknamed container.
        chip("Goblins", "g.png", "b.png"),
      ],
    };
    const out = extractChips(save, "eastern")["Goblins"];
    expect(out).toHaveLength(1);
    expect(out[0].locations).toEqual([
      { ancestry: ["Plains Chips"], count: 3 },
      { ancestry: ["Woods Chips"], count: 2 },
      { ancestry: [], count: 1 },
    ]);
  });

  it("normalizes GMNotes the same way as card nicknames", () => {
    const save = {
      ObjectStates: [chip("King’s Edict", "f", "b")],
    };
    expect(Object.keys(extractChips(save, "eastern"))).toEqual([
      "Kings Edict",
    ]);
  });

  it("skips chips without an ImageURL", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Custom_Tile",
          GMNotes: "Trolls",
          LuaScript: "chipName = x",
          CustomImage: {},
        },
      ],
    };
    expect(extractChips(save, "eastern")).toEqual({});
  });
});

describe("resolveCards", () => {
  const sampleCard = {
    source: "test",
    faceURL: "x",
    backURL: "y",
    numWidth: 1,
    numHeight: 1,
    row: 0,
    col: 0,
    uniqueBack: false,
  };

  it("finds direct matches after normalization", () => {
    const out = resolveCards(
      "Champion’s Blade",
      { "Champions Blade": [sampleCard] },
      {},
    );
    expect(out).toHaveLength(1);
  });

  it("falls back to alias when direct lookup misses", () => {
    const out = resolveCards(
      "Ripple Strike",
      { Ripplestrike: [sampleCard] },
      { "Ripple Strike": "Ripplestrike" },
    );
    expect(out).toHaveLength(1);
  });

  it("returns empty when neither direct nor alias matches", () => {
    expect(resolveCards("Unknown", {}, {})).toEqual([]);
  });

  it("normalizes both alias key and value", () => {
    // Alias keys/values may themselves have curly quotes; the resolver
    // should normalize internally.
    const out = resolveCards(
      "Shekel of Subjugation",
      { "Shekel of Subjucation": [sampleCard] },
      { "Shekel of Subjugation": "Shekel of Subjucation" },
    );
    expect(out).toHaveLength(1);
  });

  it("alias array concatenates results from every target", () => {
    // One PDF section ("Spell Book and Spell Scroll") covering two TTS cards.
    const a = { ...sampleCard, source: "from-A" };
    const b = { ...sampleCard, source: "from-B" };
    const out = resolveCards(
      "Spell Book and Spell Scroll",
      { "Spell Book": [a], "Spell Scroll": [b] },
      { "Spell Book and Spell Scroll": ["Spell Book", "Spell Scroll"] },
    );
    expect(out.map((c) => c.source)).toEqual(["from-A", "from-B"]);
  });

  it("alias array silently skips targets that don't exist in the index", () => {
    const a = { ...sampleCard };
    const out = resolveCards(
      "Section",
      { Real: [a] },
      { Section: ["Real", "Imaginary"] },
    );
    expect(out).toHaveLength(1);
  });

  it("alias only fires when there's no direct match", () => {
    // If "X" exists in the index, the alias for "X" -> "Y" is ignored.
    const out = resolveCards(
      "X",
      { X: [sampleCard], Y: [{ ...sampleCard, source: "other" }] },
      { X: "Y" },
    );
    expect(out[0].source).toBe("test");
  });
});
