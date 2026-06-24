import { describe, it, expect } from "vitest";
import {
  applyManualMonsterChipNames,
  extractBoards,
  extractCards,
  extractChips,
  extractClasses,
  extractLineages,
  extractCivilisationTokens,
  extractCivLocations,
  extractItems,
  extractLegendaryLocations,
  extractMapTileMonsters,
  extractMissions,
  extractNatives,
  extractNativeSummons,
  extractSiteMonsters,
  extractSpells,
  extractTreasures,
  extractWildernessTokens,
  extractSites,
  missionCellKey,
  normalizeTitle,
  prettifyChipName,
  resolveCards,
  CIVILISATION_REFERENCE_CARD_FACE_URL,
  CIVILISATION_TOKEN_FACE_URL,
  DEEP_TREASURE_CARD_BACK_URL,
  HERO_STARTING_SPELL_CARD_BACK_URL,
  ITEM_CARD_BACK_URL,
  SITE_FACE_URL,
  TREASURE_CARD_BACK_URL,
  SPELL_CARD_BACK_URL,
  WILDERNESS_TOKEN_BACK_URLS,
  WILDERNESS_TOKEN_FRONT_METADATA,
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

  it("normalizes known TTS chip group typos", () => {
    expect(prettifyChipName("Cylops")).toBe("Cyclops");
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

function tile(
  nickname: string,
  imageURL: string,
  imageSecondaryURL: string,
  gmNotes = "",
) {
  return {
    Name: "Custom_Tile",
    Nickname: nickname,
    GMNotes: gmNotes,
    CustomImage: { ImageURL: imageURL, ImageSecondaryURL: imageSecondaryURL },
  };
}

const SAMPLE_DECK = {
  FaceURL: "https://example.com/face.png",
  BackURL: "https://example.com/back.png",
  NumWidth: 10,
  NumHeight: 7,
  UniqueBack: false,
};

const SAMPLE_SPELL_DECK = {
  ...SAMPLE_DECK,
  BackURL: SPELL_CARD_BACK_URL,
};

const SAMPLE_STARTING_SPELL_DECK = {
  ...SAMPLE_DECK,
  BackURL: HERO_STARTING_SPELL_CARD_BACK_URL,
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
      ObjectStates: [
        card("", 100, "1", SAMPLE_DECK),
        card("Foo", 101, "1", SAMPLE_DECK),
      ],
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

describe("extractClasses", () => {
  it("links class advantage cards with class and targeting tokens", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Class DRAGONS DOWN",
          ContainedObjects: [
            card("Archer (Steady)", 800, "8", {
              ...SAMPLE_DECK,
              FaceURL:
                "https://dragonsdowndata.com/data/classes/AllClassCardsFront.png",
              BackURL:
                "https://dragonsdowndata.com/data/classes/AllClassCardsBack.png",
              NumHeight: 5,
            }),
            tile("Archer", "archer-token.png", "archer-token-back.png"),
            tile(
              "Archer token",
              "archer-target.png",
              "archer-target-back.png",
              "Archer",
            ),
          ],
        },
      ],
    };

    expect(
      extractClasses(save, "dd_all_exp", [{ title: "Archer (Steady)" }]),
    ).toEqual({
      Archer: [
        {
          source: "dd_all_exp",
          name: "Archer",
          box: "Dragons Down",
          advantageTitle: "Archer (Steady)",
          advantageCard: {
            source: "dd_all_exp",
            faceURL:
              "https://dragonsdowndata.com/data/classes/AllClassCardsFront.png",
            backURL:
              "https://dragonsdowndata.com/data/classes/AllClassCardsBack.png",
            numWidth: 10,
            numHeight: 5,
            row: 0,
            col: 0,
            uniqueBack: false,
            ancestry: ["Class DRAGONS DOWN"],
          },
          classToken: {
            source: "dd_all_exp",
            name: "Archer",
            imageURL: "archer-token.png",
            imageSecondaryURL: "archer-token-back.png",
            ancestry: ["Class DRAGONS DOWN"],
          },
          targetingTokens: [
            {
              source: "dd_all_exp",
              name: "Archer token",
              imageURL: "archer-target.png",
              imageSecondaryURL: "archer-target-back.png",
              ancestry: ["Class DRAGONS DOWN"],
              gmNotes: "Archer",
            },
          ],
        },
      ],
    });
  });

  it("normalizes TTS class component spelling variants", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Class DRAGONS DOWN",
          ContainedObjects: [
            card("Conjurer (Mastery)", 803, "8", SAMPLE_DECK),
            tile("Conjuror", "conjuror.png", "conjuror-back.png"),
            tile(
              "Conjuror token",
              "conjuror-target.png",
              "conjuror-target-back.png",
              "Conjuror",
            ),
          ],
        },
        {
          Name: "Bag",
          Nickname: "Class DESOLATION",
          ContainedObjects: [
            card("Battle Mage (Power)", 814, "8", SAMPLE_DECK),
            tile("Battlemage", "battlemage.png", "battlemage-back.png"),
            tile(
              "Battlemage token",
              "battlemage-target.png",
              "battlemage-target-back.png",
              "Battlemage",
            ),
          ],
        },
        {
          Name: "Bag",
          Nickname: "Class EASTERN",
          ContainedObjects: [
            card("Pit Fighter (Weaponmaster)", 834, "8", SAMPLE_DECK),
            tile("Pit FIghter", "pit-fighter.png", "pit-fighter-back.png"),
            tile(
              "Pit Fighter token",
              "pit-fighter-target.png",
              "pit-fighter-target-back.png",
              "Pit Fighter",
            ),
            tile(
              "Pit Fighter token 2",
              "pit-fighter-target.png",
              "pit-fighter-target-2-back.png",
            ),
          ],
        },
        {
          Name: "Bag",
          Nickname: "Class DRAGONS DOWN",
          ContainedObjects: [
            card("Warrior (Adept)", 811, "8", SAMPLE_DECK),
            tile("Warrior Counter(Big)", "warrior.png", "warrior-back.png"),
            tile(
              "Warrior token",
              "warrior-target.png",
              "warrior-target-back.png",
              "Warrior",
            ),
          ],
        },
      ],
    };

    const classes = extractClasses(save, "dd_all_exp", [
      { title: "Battle Mage (Power)" },
      { title: "Conjurer (Mastery)" },
      { title: "Pit Fighter (Weaponmaster)" },
      { title: "Warrior (Adept)" },
    ]);

    expect(classes["Battle Mage"][0].classToken?.name).toBe("Battlemage");
    expect(classes.Conjurer[0].classToken?.name).toBe("Conjuror");
    expect(classes["Pit Fighter"][0].classToken?.name).toBe("Pit FIghter");
    expect(classes.Warrior[0].classToken?.name).toBe("Warrior Counter(Big)");
    expect(classes["Pit Fighter"][0].targetingTokens).toHaveLength(2);
    expect(classes["Battle Mage"][0].box).toBe("Desolation");
    expect(classes.Conjurer[0].box).toBe("Dragons Down");
    expect(classes["Pit Fighter"][0].box).toBe("Eastern Reaches");
  });

  it("extracts scripted front and back class setup loadouts", () => {
    const assassinLua = `function onLoad()
    createSetupButtons()
end

function back_setup(object, player_color)
    Wait.time(function() take_card(ItemDeck, "Long Sword", "slot5", player_color, rr) end, 2)
    Wait.time(function() take_card(ItemDeck, "Dagger", "slot4", player_color, rr) end, 3)
    Wait.time(function() take_cube("Speed", "brown", 4, player_color, rr) end, 3)
    Wait.time(function() take_cube("Attack", "red", 2, player_color, rr) end, 4)
    Wait.time(function() take_cube("Life", "health", 2, player_color, rr) end, 5)
    Wait.time(function() set_gold(23, player_color) end, 3)
end

function front_setup(object, player_color)
    Wait.time(function() take_card(ItemDeck, "Leathers", "slot2", player_color, rr) end, 4)
    Wait.time(function() take_card(ItemDeck, "Short Sword", "slot5", player_color, rr) end, 3)
    Wait.time(function() take_card(ItemDeck, "Dagger", "slot4", player_color, rr) end, 3)
    Wait.time(function() take_cube("Speed", "brown", 4, player_color, rr) end, 3)
    Wait.time(function() take_cube("Attack", "red", 2, player_color, rr) end, 4)
    Wait.time(function() take_cube("Life", "health", 2, player_color, rr) end, 5)
    Wait.time(function() set_gold(19, player_color) end, 3)
end`;
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Class DESOLATION",
          ContainedObjects: [
            {
              ...card("Assassin (Backstab)", 812, "8", SAMPLE_DECK),
              LuaScript: assassinLua,
            },
          ],
        },
      ],
    };

    expect(
      extractClasses(save, "dd_all_exp", [{ title: "Assassin (Backstab)" }])
        .Assassin[0].setup,
    ).toEqual({
      front: {
        items: [
          { name: "Leathers", slot: "slot2" },
          { name: "Short Sword", slot: "slot5" },
          { name: "Dagger", slot: "slot4" },
        ],
        cubes: [
          { type: "Speed", color: "brown", count: 4 },
          { type: "Attack", color: "red", count: 2 },
          { type: "Life", color: "health", count: 2 },
        ],
        gold: 19,
      },
      back: {
        items: [
          { name: "Long Sword", slot: "slot5" },
          { name: "Dagger", slot: "slot4" },
        ],
        cubes: [
          { type: "Speed", color: "brown", count: 4 },
          { type: "Attack", color: "red", count: 2 },
          { type: "Life", color: "health", count: 2 },
        ],
        gold: 23,
      },
    });
  });

  it("extracts either/or and any-colour class setup magic cubes", () => {
    const wizardLua = `function front_setup(object, player_color)
        Wait.time(function() take_card(ItemDeck, "Staff", "slot6", player_color, rr) end, 2)
        Wait.time(function() take_cube("Speed", "brown", 3, player_color, rr) end, 3)
        Wait.time(function() take_cube("Life", "health", 1, player_color, rr) end, 4)
        Wait.time(function() take_cube("Attack", "red", 1, player_color, rr) end, 4)
        Wait.time(function() take_cube("Spell", "yellow", 1, player_color, rr) end, 5)
        Wait.time(function() take_cube("Spell", "blue", 1, player_color, rr) end, 6)
        Wait.time(function() set_gold(15, player_color) end, 3)
        Wait.time(function() broadcastToColor("You Must Choose One Yellow or One Blue Cube and destroy the other one!", player_color, {237, 0, 0}) end, 4)
        Wait.time(function() broadcastToColor("Choose 1 Colored Magic Cube", player_color, {0, 54, 247}) end, 2)
end

function back_setup(object, player_color)
        Wait.time(function() take_card(ItemDeck, "Staff", "slot6", player_color, rr) end, 2)
        Wait.time(function() take_cube("Speed", "brown", 3, player_color, rr) end, 3)
        Wait.time(function() take_cube("Life", "health", 1, player_color, rr) end, 4)
        Wait.time(function() take_cube("Attack", "red", 1, player_color, rr) end, 4)
        Wait.time(function() take_cube("Spell", "purple", 1, player_color, rr) end, 5)
        Wait.time(function() take_cube("Spell", "grey", 1, player_color, rr) end, 6)
        Wait.time(function() set_gold(15, player_color) end, 3)
        Wait.time(function() broadcastToColor("You Must Choose One Purple or One Grey Cube and destroy the other one!", player_color, {237, 0, 0}) end, 4)
        Wait.time(function() broadcastToColor("Choose 1 Colored Magic Cube", player_color, {0, 54, 247}) end, 2)
end`;
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Class NATIVES",
          ContainedObjects: [
            {
              ...card("Wizard (Studious)", 831, "8", SAMPLE_DECK),
              LuaScript: wizardLua,
            },
          ],
        },
      ],
    };

    expect(
      extractClasses(save, "dd_all_exp", [{ title: "Wizard (Studious)" }])
        .Wizard[0].setup,
    ).toMatchObject({
      front: {
        cubes: [
          { type: "Speed", color: "brown", count: 3 },
          { type: "Life", color: "health", count: 1 },
          { type: "Attack", color: "red", count: 1 },
          { type: "Spell", colors: ["yellow", "blue"], count: 1 },
          { type: "Spell", color: "any", count: 1 },
        ],
      },
      back: {
        cubes: [
          { type: "Speed", color: "brown", count: 3 },
          { type: "Life", color: "health", count: 1 },
          { type: "Attack", color: "red", count: 1 },
          { type: "Spell", colors: ["purple", "grey"], count: 1 },
          { type: "Spell", color: "any", count: 1 },
        ],
      },
    });
  });

  it("keeps fixed magic cubes when an either/or choice consumes extras", () => {
    const conjurerLua = `function front_setup(object, player_color)
        Wait.time(function() take_cube("Speed", "brown", 3, player_color, rr) end, 2)
        Wait.time(function() take_cube("Attack", "red", 1, player_color, rr) end, 3)
        Wait.time(function() take_cube("Life", "health", 1, player_color, rr) end, 4)
        Wait.time(function() take_cube("Spell", "blue", 2, player_color, rr) end, 5)
        Wait.time(function() take_cube("Spell", "grey", 1, player_color, rr) end, 6)
        Wait.time(function() broadcastToColor("You Must Choose One Blue or One Grey Cube and destroy the other one!", player_color, {237, 0, 0}) end, 5)
end`;
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Class DRAGONS DOWN",
          ContainedObjects: [
            {
              ...card("Conjurer (Mastery)", 803, "8", SAMPLE_DECK),
              LuaScript: conjurerLua,
            },
          ],
        },
      ],
    };

    expect(
      extractClasses(save, "dd_all_exp", [{ title: "Conjurer (Mastery)" }])
        .Conjurer[0].setup?.front?.cubes,
    ).toEqual([
      { type: "Speed", color: "brown", count: 3 },
      { type: "Attack", color: "red", count: 1 },
      { type: "Life", color: "health", count: 1 },
      { type: "Spell", color: "blue", count: 1 },
      { type: "Spell", colors: ["blue", "grey"], count: 1 },
    ]);
  });
});

describe("extractLineages", () => {
  it("extracts expected lineage cards by advantage title", () => {
    const save = {
      ObjectStates: [
        card("Dwarf (Caver)", 701, "7", SAMPLE_DECK),
        card("Dwarf (Caver)", 1302, "13", SAMPLE_DECK),
      ],
    };

    expect(
      extractLineages(save, "dd_all_exp", [
        { source: "core", title: "Dwarf (Caver)" },
      ]),
    ).toEqual({
      Dwarf: [
        {
          source: "dd_all_exp",
          name: "Dwarf",
          box: "Dragons Down",
          advantageTitle: "Dwarf (Caver)",
          cards: [
            {
              source: "dd_all_exp",
              faceURL: "https://example.com/face.png",
              backURL: "https://example.com/back.png",
              numWidth: 10,
              numHeight: 7,
              row: 0,
              col: 1,
              uniqueBack: false,
            },
            {
              source: "dd_all_exp",
              faceURL: "https://example.com/face.png",
              backURL: "https://example.com/back.png",
              numWidth: 10,
              numHeight: 7,
              row: 0,
              col: 2,
              uniqueBack: false,
            },
          ],
        },
      ],
    });
  });

  it("normalizes TTS lineage title variants", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Lineage DESOLATION",
          ContainedObjects: [
            card("Half-Elves (Two-Worlds)", 116, "1", SAMPLE_DECK),
          ],
        },
      ],
    };

    const lineages = extractLineages(save, "dd_all_exp", [
      { source: "desolation", title: "Half-Elves (Two Worlds)" },
    ]);

    expect(lineages["Half-Elf"][0].box).toBe("Desolation");
    expect(lineages["Half-Elf"][0].cards).toHaveLength(1);
  });

  it("uses the lineage advantage source for box names", () => {
    const save = {
      ObjectStates: [card("Gnome (Inventive)", 122, "1", SAMPLE_DECK)],
    };

    const lineages = extractLineages(save, "dd_all_exp", [
      { source: "natives-and-legends", title: "Gnome (Inventive)" },
    ]);

    expect(lineages.Gnome[0].box).toBe("Natives and Legends");
  });
});

describe("extractSpells", () => {
  it("extracts spell cards from manifest spell entries", () => {
    const save = {
      ObjectStates: [card("Affliction", 800, "8", SAMPLE_SPELL_DECK)],
    };

    const spells = extractSpells(save, "dd_all_exp", [
      {
        source: "core",
        title: "Black Spells",
        tags: ["blackMagic"],
      },
      {
        source: "core",
        title: "Affliction",
        tags: ["spell", "blackMagic"],
      },
    ]);

    expect(spells.Affliction[0]).toMatchObject({
      source: "dd_all_exp",
      name: "Affliction",
      rulebookSource: "core",
      magic: ["black"],
      decks: ["spells"],
    });
    expect(spells.Affliction[0].spellCards).toEqual([
      expect.objectContaining({
        source: "dd_all_exp",
        faceURL: "https://example.com/face.png",
        backURL: SPELL_CARD_BACK_URL,
        numWidth: 10,
        numHeight: 7,
        row: 0,
        col: 0,
        uniqueBack: false,
        copies: 1,
        locations: [{ ancestry: [], count: 1 }],
      }),
    ]);
    expect(spells.Affliction[0].startingSpellCards).toEqual([]);
  });

  it("separates spell cards from hero starting spell cards by back", () => {
    const save = {
      ObjectStates: [
        card("Calm", 801, "8", SAMPLE_SPELL_DECK),
        card("Calm", 801, "8", SAMPLE_STARTING_SPELL_DECK),
        card("Calm", 801, "8", SAMPLE_STARTING_SPELL_DECK),
      ],
    };

    const spells = extractSpells(save, "dd_all_exp", [
      {
        title: "Calm",
        tags: ["spell", "greenMagic"],
      },
    ]);

    expect(spells.Calm[0].cards).toHaveLength(2);
    expect(spells.Calm[0].spellCards).toHaveLength(1);
    expect(spells.Calm[0].startingSpellCards).toHaveLength(1);
    expect(spells.Calm[0].spellCards[0].copies).toBe(1);
    expect(spells.Calm[0].startingSpellCards[0].copies).toBe(2);
    expect(spells.Calm[0].decks).toEqual(["spells", "heroStartingSpells"]);
  });

  it("uses aliases when manifest titles differ from TTS card names", () => {
    const save = {
      ObjectStates: [card("Ripplestrike", 801, "8", SAMPLE_SPELL_DECK)],
    };

    const spells = extractSpells(
      save,
      "dd_all_exp",
      [
        {
          title: "Ripple Strike",
          tags: ["spell", "greenMagic"],
        },
      ],
      { "Ripple Strike": "Ripplestrike" },
    );

    expect(spells["Ripple Strike"][0].cards).toHaveLength(1);
    expect(spells["Ripple Strike"][0].magic).toEqual(["green"]);
  });
});

describe("extractMissions", () => {
  it("extracts mission cards with descriptions and completion targets", () => {
    const save = {
      ObjectStates: [
        {
          ...card("Adrift Sailor", 60727, "607", SAMPLE_DECK),
          Description: "Complete at Mariners",
          Tags: ["Mission", "Mariners"],
        },
      ],
    };

    expect(extractMissions(save, "dd_all_exp")).toEqual({
      "Adrift Sailor": [
        {
          source: "dd_all_exp",
          faceURL: SAMPLE_DECK.FaceURL,
          backURL: SAMPLE_DECK.BackURL,
          numWidth: 10,
          numHeight: 7,
          row: 2,
          col: 7,
          uniqueBack: false,
          tags: ["Mariners", "Mission"],
          description: "Complete at Mariners",
          completeAt: ["Mariners"],
        },
      ],
    });
  });

  it("keeps mission descriptions after the completion sentence", () => {
    const save = {
      ObjectStates: [
        {
          ...card("Sea Explorer", 60767, "607", SAMPLE_DECK),
          Description: "Complete at Mariners.\nRemove for co-op modes.",
          Tags: ["Mission"],
        },
      ],
    };

    const mission = extractMissions(save, "dd_all_exp")["Sea Explorer"][0];
    expect(mission.description).toBe(
      "Complete at Mariners.\nRemove for co-op modes.",
    );
    expect(mission.completeAt).toEqual(["Mariners"]);
  });

  it("skips non-mission cards", () => {
    const save = {
      ObjectStates: [
        {
          ...card("Trade Goods", 60803, "608", SAMPLE_DECK),
          Description: "Complete at Foreigner",
          Tags: ["Merchant"],
        },
      ],
    };

    expect(extractMissions(save, "dd_all_exp")).toEqual({});
  });

  it("derives mission terrain pack from the containing bag", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Caves  Chips",
          ContainedObjects: [
            {
              ...card("Banned Charts", 60720, "607", SAMPLE_DECK),
              Description: "Complete at Astrologer",
              Tags: ["Mission"],
            },
          ],
        },
      ],
    };

    expect(
      extractMissions(save, "dd_all_exp")["Banned Charts"][0],
    ).toMatchObject({
      ancestry: ["Caves  Chips"],
      terrainPack: "caves",
    });
  });

  it("treats missions in the natives bucket as neutral", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "NATIVES Groups",
          ContainedObjects: [
            {
              ...card("Decapitator", 60708, "607", SAMPLE_DECK),
              Description: "Complete at Consul",
              Tags: ["Mission"],
            },
          ],
        },
      ],
    };

    expect(
      extractMissions(save, "dd_all_exp")["Decapitator"][0].terrainPack,
    ).toBe("neutral");
  });

  it("extracts mission kinds and scripted rewards", () => {
    const missionDeck1 = {
      ...SAMPLE_DECK,
      FaceURL: "https://dragonsdowndata.com/data/missions/AllMissionDeck1.png",
    };
    const save = {
      ObjectStates: [
        {
          ...card("Decapitator", 60708, "607", missionDeck1),
          Description: "Complete at Consul",
          Tags: ["Mission", "Natives", "Consul"],
          LuaScript: [
            "dcount = 1",
            "tcount = 0",
            "icount = 0",
            "scount = 0",
            "famount = 0",
            "gamount = 5",
            "outlaw = 1",
            "charisma = 0",
            "wisdom = 0",
            "intellect = 1",
          ].join("\n"),
        },
      ],
    };
    const missionKinds = {
      [missionCellKey({
        faceURL: missionDeck1.FaceURL,
        row: 0,
        col: 8,
      })]: "atrocity" as const,
    };

    expect(
      extractMissions(save, "dd_all_exp", { missionKinds })["Decapitator"][0],
    ).toMatchObject({
      kind: "atrocity",
      rewards: {
        drawCards: { deep: 1 },
        points: { gold: 5 },
        attributes: { intellect: 1 },
        outlaw: 1,
      },
    });
  });

  it("extracts printed mission stats from manual card-cell mappings", () => {
    const missionDeck1 = {
      ...SAMPLE_DECK,
      FaceURL: "https://dragonsdowndata.com/data/missions/AllMissionDeck1.png",
    };
    const save = {
      ObjectStates: [
        {
          ...card("Alcohol", 60728, "607", missionDeck1),
          Description: "Complete at Rogues",
          Tags: ["Mission"],
        },
      ],
    };
    const missionStats = [
      {
        source: "dd_all_exp",
        raw: "Alcohol",
        faceURL: missionDeck1.FaceURL,
        row: 2,
        col: 8,
        stats: {
          gold: 15,
          fame: 0,
          legend: 0,
          attribute: "cunning" as const,
        },
      },
    ];

    expect(
      extractMissions(save, "dd_all_exp", { missionStats })["Alcohol"][0].stats,
    ).toEqual({ gold: 15, fame: 0, legend: 0, attribute: "cunning" });
  });

  it("omits mission kind when no generated kind map is provided", () => {
    const missionDeck1 = {
      ...SAMPLE_DECK,
      FaceURL: "https://dragonsdowndata.com/data/missions/AllMissionDeck1.png",
    };
    const save = {
      ObjectStates: [
        {
          ...card("Decapitator", 60708, "607", missionDeck1),
          Description: "Complete at Consul",
          Tags: ["Mission"],
        },
      ],
    };

    expect(extractMissions(save, "dd_all_exp")["Decapitator"][0].kind).toBe(
      undefined,
    );
  });

  it("keeps steal rewards separate from completion rewards", () => {
    const missionDeck2 = {
      ...SAMPLE_DECK,
      FaceURL: "https://dragonsdowndata.com/data/missions/AllMissionDeck2.png",
    };
    const save = {
      ObjectStates: [
        {
          ...card("Trade Goods", 60803, "608", missionDeck2),
          Description: "Complete at Foreigner",
          Tags: ["Foreigner", "Merchant", "Mission", "Steal"],
          LuaScript: [
            "dcount = 0",
            "tcount = 0",
            "icount = 0",
            "scount = 0",
            "famount = 0",
            "gamount = 0",
            "outlaw = 0",
            "charisma = 0",
            "wisdom = 0",
            "intellect = 0",
            "xdcount = 0",
            "xtcount = 0",
            "xicount = 1",
            "xscount = 0",
            "xfamount = 0",
            "xgamount = 9",
            "xoutlaw = 1",
          ].join("\n"),
        },
      ],
    };
    const missionKinds = {
      [missionCellKey({
        faceURL: missionDeck2.FaceURL,
        row: 0,
        col: 3,
      })]: "expedition" as const,
    };

    expect(
      extractMissions(save, "dd_all_exp", { missionKinds })["Trade Goods"][0],
    ).toMatchObject({
      kind: "expedition",
      rewards: {
        steal: {
          drawCards: { item: 1 },
          points: { gold: 9 },
          outlaw: 1,
        },
      },
    });
  });

  it("corrects the mislabeled Desert Marauder mission card from manual mappings", () => {
    const missionDeck1 = {
      ...SAMPLE_DECK,
      FaceURL: "https://dragonsdowndata.com/data/missions/AllMissionDeck1.png",
    };
    const missionDeck2 = {
      ...SAMPLE_DECK,
      FaceURL: "https://dragonsdowndata.com/data/missions/AllMissionDeck2.png",
    };
    const save = {
      ObjectStates: [
        {
          ...card("Desert Avenger", 60709, "607", missionDeck1),
          Description: "Complete at Deserts",
          Tags: ["Mission"],
        },
        {
          ...card("Desert Avenger", 60814, "608", missionDeck2),
          Description: "Complete at Nomads",
          Tags: ["Mission", "Natives", "Nomads"],
        },
      ],
    };
    const missionKinds = {
      [missionCellKey({
        faceURL: missionDeck1.FaceURL,
        row: 0,
        col: 9,
      })]: "atrocity" as const,
      [missionCellKey({
        faceURL: missionDeck2.FaceURL,
        row: 1,
        col: 4,
      })]: "quest" as const,
    };
    const missionNicknameCorrections = [
      {
        source: "dd_all_exp",
        raw: "Desert Avenger",
        faceURL: missionDeck1.FaceURL,
        row: 0,
        col: 9,
        corrected: "Desert Marauder",
      },
    ];

    const missions = extractMissions(save, "dd_all_exp", {
      missionKinds,
      missionNicknameCorrections,
    });
    expect(Object.keys(missions).sort()).toEqual([
      "Desert Avenger",
      "Desert Marauder",
    ]);
    expect(missions["Desert Marauder"][0]).toMatchObject({
      row: 0,
      col: 9,
      kind: "atrocity",
      description: "Complete at Deserts",
      completeAt: ["Deserts"],
    });
    expect(missions["Desert Avenger"][0]).toMatchObject({
      row: 1,
      col: 4,
      kind: "quest",
      description: "Complete at Nomads",
      completeAt: ["Nomads"],
    });
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
        group: "Trolls",
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
    const totals = out.map((c) => c.locations.reduce((n, l) => n + l.count, 0));
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
    expect(Object.keys(extractChips(save, "eastern"))).toEqual(["Kings Edict"]);
    expect(extractChips(save, "eastern")["Kings Edict"][0].group).toBe(
      "King’s Edict",
    );
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

  it("applies manual narrative names by group and image pair", () => {
    const save = {
      ObjectStates: [
        chip("Goblins", "king-face.png", "king-back.png"),
        chip("Goblins", "other-face.png", "other-back.png"),
      ],
    };
    const out = applyManualMonsterChipNames(extractChips(save, "eastern"), {
      Goblins: [
        {
          name: "King",
          imageURL: "king-face.png",
          imageSecondaryURL: "king-back.png",
        },
      ],
    });

    expect(out.Goblins[0].name).toBe("King");
    expect(out.Goblins[1].name).toBeUndefined();
  });
});

describe("extractSites", () => {
  const site = (
    nick: string,
    gm: string,
    secondary: string,
    opts: { face?: string } = {},
  ) => ({
    Name: "Custom_Tile",
    Nickname: nick,
    GMNotes: gm,
    CustomImage: {
      ImageURL: opts.face ?? SITE_FACE_URL,
      ImageSecondaryURL: secondary,
    },
  });

  it("extracts tiles whose ImageURL is the site face URL", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Sinister SWAMPS",
          ContainedObjects: [site("Grotto", "6", "art-grotto.png")],
        },
      ],
    };
    const out = extractSites(save, "eastern");
    expect(out["Grotto"]).toEqual([
      {
        source: "eastern",
        imageURL: SITE_FACE_URL,
        imageSecondaryURL: "art-grotto.png",
        ancestry: ["Sinister SWAMPS"],
        gmNotes: "6",
      },
    ]);
  });

  it("skips tiles whose ImageURL does not match SITE_FACE_URL", () => {
    const save = {
      ObjectStates: [site("Decoy", "1", "art.png", { face: "different.png" })],
    };
    expect(extractSites(save, "eastern")).toEqual({});
  });

  it("omits gmNotes when empty", () => {
    const save = { ObjectStates: [site("Mystery", "", "art.png")] };
    expect("gmNotes" in extractSites(save, "eastern")["Mystery"][0]).toBe(
      false,
    );
  });

  it("normalizes the nickname key", () => {
    const save = { ObjectStates: [site("King’s Hideout", "3", "art.png")] };
    expect(Object.keys(extractSites(save, "eastern"))).toEqual([
      "Kings Hideout",
    ]);
  });
});

describe("extractCivLocations", () => {
  const tile = (nick: string, sameUrl: string) => ({
    Name: "Custom_Tile",
    Nickname: nick,
    CustomImage: { ImageURL: sameUrl, ImageSecondaryURL: sameUrl },
  });
  const asymmetric = (nick: string) => ({
    Name: "Custom_Tile",
    Nickname: nick,
    CustomImage: { ImageURL: "a", ImageSecondaryURL: "b" },
  });

  it("extracts tiles where ImageURL equals ImageSecondaryURL", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Campfire",
          ContainedObjects: [tile("Campfire", "fire.png")],
        },
        tile("Inn", "inn.png"),
      ],
    };
    const out = extractCivLocations(save, "eastern");
    expect(Object.keys(out).sort()).toEqual(["Campfire", "Inn"]);
    expect(out["Campfire"]).toEqual([
      { source: "eastern", imageURL: "fire.png", ancestry: ["Campfire"] },
    ]);
  });

  it("extracts one-sided civ-location-sized tiles with empty ImageSecondaryURL", () => {
    const oneSided = (nick: string, imageURL: string) => ({
      Name: "Custom_Tile",
      Nickname: nick,
      Transform: { scaleX: 0.7543109, scaleZ: 0.7543109 },
      CustomImage: { ImageURL: imageURL, ImageSecondaryURL: "" },
    });
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Oasis",
          ContainedObjects: [oneSided("Oasis", "oasis.png")],
        },
        {
          Name: "Bag",
          Nickname: "Harbor",
          ContainedObjects: [oneSided("Harbor", "harbor.png")],
        },
      ],
    };

    const out = extractCivLocations(save, "eastern");

    expect(Object.keys(out).sort()).toEqual(["Harbor", "Oasis"]);
    expect(out["Oasis"]).toEqual([
      {
        source: "eastern",
        imageURL: "oasis.png",
        ancestry: ["Oasis"],
        terrainPack: "Dreadful Deserts",
      },
    ]);
  });

  it("ignores one-sided wilderness-token-sized tiles", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Oasis",
          ContainedObjects: [
            {
              Name: "Custom_Tile",
              Nickname: "Oasis",
              Transform: { scaleX: 0.447143137, scaleZ: 0.447143137 },
              CustomImage: {
                ImageURL: "oasis-token.png",
                ImageSecondaryURL: "",
              },
            },
          ],
        },
      ],
    };

    expect(extractCivLocations(save, "eastern")).toEqual({});
  });

  it("ignores tiles whose face and back differ", () => {
    const save = { ObjectStates: [asymmetric("Mismatch")] };
    expect(extractCivLocations(save, "eastern")).toEqual({});
  });

  it("excludes currency / point tokens (starts with a number)", () => {
    const save = {
      ObjectStates: [
        tile("5 Gold", "g.png"),
        tile("-5 Fame", "minus.png"),
        tile("1 Legend Point", "p.png"),
        tile("50 Fame", "f.png"),
        tile("Inn", "inn.png"),
      ],
    };
    expect(Object.keys(extractCivLocations(save, "eastern"))).toEqual(["Inn"]);
  });

  it("excludes attribute Tokens (nickname contains 'Token')", () => {
    const save = {
      ObjectStates: [
        tile("Cunning Token", "c.png"),
        tile("Wisdom Token", "w.png"),
        tile("Keep", "k.png"),
      ],
    };
    expect(Object.keys(extractCivLocations(save, "eastern"))).toEqual(["Keep"]);
  });

  it("skips tiles with empty Nickname", () => {
    const save = { ObjectStates: [tile("", "x.png")] };
    expect(extractCivLocations(save, "eastern")).toEqual({});
  });
});

describe("extractCivilisationTokens", () => {
  const civilisationToken = ({
    nickname = "",
    description = "",
    gmNotes = "empty",
    back = "back.png",
  }: {
    nickname?: string;
    description?: string;
    gmNotes?: string;
    back?: string;
  } = {}) => ({
    Name: "Custom_Tile",
    Nickname: nickname,
    Description: description,
    GMNotes: gmNotes,
    CustomImage: {
      ImageURL: CIVILISATION_TOKEN_FACE_URL,
      ImageSecondaryURL: back,
    },
  });

  it("extracts merchant name, gmNotes, attribute, and terrain", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Cruel CAVES",
          ContainedObjects: [
            civilisationToken({
              nickname: "Astrologer (Wisdom)",
              description: "Astrologer",
              gmNotes: "merchants",
            }),
          ],
        },
      ],
    };
    expect(extractCivilisationTokens(save, "eastern")).toEqual([
      {
        source: "eastern",
        imageURL: CIVILISATION_TOKEN_FACE_URL,
        imageSecondaryURL: "back.png",
        gmNotes: "merchants",
        name: "Astrologer",
        attribute: "Wisdom",
        terrain: "Cruel Caves",
        locations: [{ ancestry: ["Cruel CAVES"], count: 1 }],
      },
    ]);
  });

  it("keeps empty non-merchant tokens without name or attribute", () => {
    const save = { ObjectStates: [civilisationToken()] };
    expect(extractCivilisationTokens(save, "eastern")[0]).toEqual({
      source: "eastern",
      imageURL: CIVILISATION_TOKEN_FACE_URL,
      imageSecondaryURL: "back.png",
      gmNotes: "empty",
      locations: [{ ancestry: [], count: 1 }],
    });
  });

  it("leaves terrain unset when no terrain pack ancestor is present", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "NATIVES Merchants",
          ContainedObjects: [
            civilisationToken({
              nickname: "Peddler (Wisdom)",
              description: "Peddler",
              gmNotes: "merchants",
            }),
          ],
        },
      ],
    };
    expect("terrain" in extractCivilisationTokens(save, "eastern")[0]).toBe(
      false,
    );
  });

  it("dedups physical copies and records per-ancestry counts", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Oasis",
          ContainedObjects: [civilisationToken(), civilisationToken()],
        },
      ],
    };
    expect(extractCivilisationTokens(save, "eastern")[0].locations).toEqual([
      { ancestry: ["Oasis"], count: 2 },
    ]);
  });

  it("treats Oasis empty tokens as Dreadful Deserts tokens", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Oasis",
          ContainedObjects: [civilisationToken()],
        },
      ],
    };
    expect(extractCivilisationTokens(save, "eastern")[0]).toMatchObject({
      terrain: "Dreadful Deserts",
      locations: [{ ancestry: ["Oasis"], count: 1 }],
    });
  });

  it("skips custom tiles without the civilization token face", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Custom_Tile",
          CustomImage: { ImageURL: "other.png", ImageSecondaryURL: "back.png" },
        },
      ],
    };
    expect(extractCivilisationTokens(save, "eastern")).toEqual([]);
  });
});

describe("extractBoards", () => {
  const WICKED_WOODS_BOARD_URL =
    "https://steamusercontent-a.akamaihd.net/ugc/2323363479519043888/1148228148CCCE332A638EBED6176E9AE6129254/";
  const DREADFUL_DESERTS_SITES_BOARD_URL =
    "https://steamusercontent-a.akamaihd.net/ugc/15429035261550998634/62807FE48E734542B1C7C08EEA7F4EB454EA110E/";

  const board = ({
    lua = 'function onLoad()\nwest_merc = "Crone"\neast_merc = "Smith"\nend',
    secondary = "board-hard.png",
    imageURL = WICKED_WOODS_BOARD_URL,
    states = {},
  }: {
    lua?: string;
    secondary?: string;
    imageURL?: string;
    states?: object;
  } = {}) => ({
    Name: "Custom_Tile",
    Nickname: "State 1 : Standard",
    Tags: ["side1"],
    CustomImage: {
      ImageURL: imageURL,
      ImageSecondaryURL: secondary,
    },
    LuaScript: lua,
    States: states,
  });

  const singleSiteBoard = ({
    gmNotes,
    imageURL = "single-site-front.png",
    stateTwoImageURL = "single-site-back.png",
  }: {
    gmNotes: string;
    imageURL?: string;
    stateTwoImageURL?: string;
  }) => ({
    Name: "Custom_Tile",
    Nickname: "State 1 : Standard",
    GMNotes: gmNotes,
    CustomImage: {
      ImageURL: imageURL,
      ImageSecondaryURL: "",
    },
    LuaScript: "function SetMeUp() end",
    States: {
      "2": {
        Name: "Custom_Tile",
        Nickname: "Setup 2 : Optional (harder)",
        GMNotes: gmNotes.replace(/ 1$/, " 2"),
        CustomImage: { ImageURL: stateTwoImageURL, ImageSecondaryURL: "" },
      },
    },
  });

  it("extracts board terrain, images, merchants, and printed site names", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Wicked WOODS",
          ContainedObjects: [board()],
        },
      ],
    };

    expect(extractBoards(save, "eastern")).toEqual([
      {
        source: "eastern",
        terrain: "Wicked Woods",
        imageURL: WICKED_WOODS_BOARD_URL,
        imageSecondaryURL: "board-hard.png",
        merchants: ["Crone", "Smith"],
        sites: ["Secret Cache", "Shrine"],
      },
    ]);
  });

  it("does not infer add-on special locations that are not printed", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Wicked WOODS",
          ContainedObjects: [
            board(),
            {
              Name: "Custom_Tile",
              Nickname: "Grove",
              CustomImage: {
                ImageURL: Object.entries(WILDERNESS_TOKEN_FRONT_METADATA).find(
                  ([, metadata]) => metadata.name === "Grove",
                )?.[0],
                ImageSecondaryURL: WILDERNESS_TOKEN_BACK_URLS["Wicked Woods"],
              },
            },
          ],
        },
      ],
    };

    expect(extractBoards(save, "eastern")[0].sites).toEqual([
      "Secret Cache",
      "Shrine",
    ]);
  });

  it("keeps setup-card site boards even when they define no merchants", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Dreadful DESERTS",
          ContainedObjects: [
            board({
              imageURL: DREADFUL_DESERTS_SITES_BOARD_URL,
              lua: "function SetMeUp() end",
            }),
          ],
        },
      ],
    };

    expect(extractBoards(save, "eastern")).toEqual([
      {
        source: "eastern",
        terrain: "Dreadful Deserts",
        imageURL: DREADFUL_DESERTS_SITES_BOARD_URL,
        imageSecondaryURL: "board-hard.png",
        merchants: [],
        sites: ["Mausoleum", "Terrace", "Tomb", "Ziggurat"],
      },
    ]);
  });

  it("keeps single-site setup boards keyed by GMNotes", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Perilous PLAINS",
          ContainedObjects: [
            singleSiteBoard({ gmNotes: "Setup Battlefield 1" }),
          ],
        },
      ],
    };

    expect(extractBoards(save, "eastern")).toEqual([
      {
        source: "eastern",
        terrain: "Perilous Plains",
        imageURL: "single-site-front.png",
        imageSecondaryURL: "single-site-back.png",
        merchants: [],
        sites: ["Battlefield"],
      },
    ]);
  });

  it("normalizes the Grobe setup board typo to Grove", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Wicked WOODS",
          ContainedObjects: [singleSiteBoard({ gmNotes: "Setup Grobe 1" })],
        },
      ],
    };

    expect(extractBoards(save, "eastern")[0]).toMatchObject({
      terrain: "Wicked Woods",
      sites: ["Grove"],
    });
  });

  it("uses state two art as the secondary image when the board omits it", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "NATIVES Merchants",
          ContainedObjects: [
            board({
              secondary: "",
              states: {
                "2": {
                  CustomImage: { ImageURL: "board-random.png" },
                },
              },
            }),
          ],
        },
      ],
    };

    expect(extractBoards(save, "eastern")[0]).toMatchObject({
      terrain: "Neutral",
      imageSecondaryURL: "board-random.png",
    });
  });

  it("skips side1 tiles with neither merchants nor printed sites", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Dreadful DESERTS",
          ContainedObjects: [
            board({
              imageURL: "unmapped-board.png",
              lua: "function SetMeUp() end",
            }),
            board({ lua: 'east_merc = "Silk Dealer"' }),
          ],
        },
      ],
    };

    expect(extractBoards(save, "eastern")).toHaveLength(1);
  });
});

describe("extractSiteMonsters", () => {
  const chip = (guid: string, gmNotes: string) => ({
    GUID: guid,
    Name: "Custom_Tile",
    GMNotes: gmNotes,
    CustomImage: {
      ImageURL: `${guid}.png`,
      ImageSecondaryURL: `${guid}-back.png`,
    },
    LuaScript: "chipName = self.getGMNotes()",
  });

  it("uses the monster name as the group for a single generic guardian", () => {
    const save = {
      ObjectStates: [
        chip("e2155d", "DeathKnight"),
        {
          Name: "Custom_Tile",
          Nickname: "Catacombs",
          CustomImage: { ImageURL: SITE_FACE_URL },
          LuaScript:
            'function guardian()\nGuardian = getObjectFromGUID("e2155d")\nend',
        },
      ],
    };

    expect(extractSiteMonsters(save, "eastern")).toEqual({
      Catacombs: [
        {
          source: "eastern",
          group: "Death Knight",
          monsters: ["Death Knight"],
          monsterChips: [
            {
              name: "Death Knight",
              imageURL: "e2155d.png",
              imageSecondaryURL: "e2155d-back.png",
            },
          ],
        },
      ],
    });
  });

  it("groups named guardian variables by their chip group", () => {
    const save = {
      ObjectStates: [
        chip("cd6d5f", "Bandits"),
        chip("083f38", "Bandits"),
        {
          Name: "Custom_Tile",
          Nickname: "Hideout",
          CustomImage: { ImageURL: SITE_FACE_URL },
          LuaScript:
            'function guardian()\nAssassin = getObjectFromGUID("cd6d5f")\nCutthroat = getObjectFromGUID("083f38")\nend',
        },
      ],
    };

    expect(extractSiteMonsters(save, "eastern")).toEqual({
      Hideout: [
        {
          source: "eastern",
          group: "Bandits",
          monsters: ["Assassin", "Cutthroat"],
          monsterChips: [
            {
              name: "Assassin",
              imageURL: "cd6d5f.png",
              imageSecondaryURL: "cd6d5f-back.png",
            },
            {
              name: "Cutthroat",
              imageURL: "083f38.png",
              imageSecondaryURL: "083f38-back.png",
            },
          ],
        },
      ],
    });
  });

  it("extracts wilderness-token guardians and keeps missing GUID labels", () => {
    const battlefieldURL = Object.entries(WILDERNESS_TOKEN_FRONT_METADATA).find(
      ([, metadata]) => metadata.name === "Battlefield",
    )?.[0];
    const save = {
      ObjectStates: [
        chip("1bae71", "Cursed"),
        chip("a6470b", "Cursed"),
        {
          Name: "Custom_Tile",
          CustomImage: { ImageURL: battlefieldURL },
          LuaScript:
            'function guardian()\nCursedZombie1 = getObjectFromGUID("1bae71")\nCursedZombie2 = getObjectFromGUID("50b6c7")\nCursedGhast = getObjectFromGUID("a6470b")\nend',
        },
      ],
    };

    expect(extractSiteMonsters(save, "eastern")).toEqual({
      Battlefield: [
        {
          source: "eastern",
          group: "Cursed",
          monsters: ["Cursed Zombie", "Cursed Zombie", "Cursed Ghast"],
          monsterChips: [
            {
              name: "Cursed Zombie",
              imageURL: "1bae71.png",
              imageSecondaryURL: "1bae71-back.png",
            },
            {
              name: "Cursed Zombie",
            },
            {
              name: "Cursed Ghast",
              imageURL: "a6470b.png",
              imageSecondaryURL: "a6470b-back.png",
            },
          ],
        },
      ],
    });
  });

  it("corrects Lost Battalion's stale bandit guardian GUIDs", () => {
    const lostBattalionURL = Object.entries(
      WILDERNESS_TOKEN_FRONT_METADATA,
    ).find(([, metadata]) => metadata.name === "Lost Battalion")?.[0];
    const save = {
      ObjectStates: [
        chip("cd6d5f", "Bandits"),
        chip("718d57", "LostBattalion"),
        {
          Name: "Custom_Tile",
          CustomImage: { ImageURL: lostBattalionURL },
          LuaScript:
            'function guardian()\nAssassin = getObjectFromGUID("cd6d5f")\nend',
        },
      ],
    };

    expect(extractSiteMonsters(save, "eastern")).toEqual({
      "Lost Battalion": [
        {
          source: "eastern",
          group: "Lost Battalion",
          monsters: ["Lost Battalion"],
          monsterChips: [
            {
              name: "Lost Battalion",
              imageURL: "718d57.png",
              imageSecondaryURL: "718d57-back.png",
            },
          ],
        },
      ],
    });
  });
});

describe("extractNativeSummons", () => {
  const chip = (guid: string, gmNotes: string) => ({
    GUID: guid,
    Name: "Custom_Tile",
    GMNotes: gmNotes,
    CustomImage: {
      ImageURL: `${guid}.png`,
      ImageSecondaryURL: `${guid}-back.png`,
    },
    LuaScript: "chipName = self.getGMNotes()",
  });

  it("extracts exact native chip names from the root nativeGroups table", () => {
    const save = {
      LuaScript: `function onLoad()
nativeGroups = {
  knights = {
    "880810", --KnightLeader
    "5bdc4e", --Knight2
  },
  bashkirs = {
    "168365", --Leader
    "571a63", --2
  },
}
end`,
      ObjectStates: [
        chip("880810", "knights"),
        chip("5bdc4e", "knights"),
        chip("168365", "bashkirs"),
        chip("571a63", "bashkirs"),
      ],
    };

    expect(extractNativeSummons(save, "eastern")).toEqual({
      "Native Setup": [
        {
          source: "eastern",
          group: "Bashkirs",
          natives: ["Bashkirs Leader", "Bashkirs 2"],
          nativeChips: [
            {
              name: "Bashkirs Leader",
              imageURL: "168365.png",
              imageSecondaryURL: "168365-back.png",
            },
            {
              name: "Bashkirs 2",
              imageURL: "571a63.png",
              imageSecondaryURL: "571a63-back.png",
            },
          ],
        },
        {
          source: "eastern",
          group: "Knights",
          natives: ["Knight Leader", "Knight 2"],
          nativeChips: [
            {
              name: "Knight Leader",
              imageURL: "880810.png",
              imageSecondaryURL: "880810-back.png",
            },
            {
              name: "Knight 2",
              imageURL: "5bdc4e.png",
              imageSecondaryURL: "5bdc4e-back.png",
            },
          ],
        },
      ],
    });
  });

  it("extracts native summons from civ-location setup functions", () => {
    const save = {
      ObjectStates: [
        chip("c3bbc1", "consul"),
        chip("272a3e", "consul"),
        chip("600fe8", "wardens"),
        chip("fb9509", "wardens"),
        {
          Name: "Custom_Tile",
          Nickname: "Outpost",
          LuaScript: `function setupOutpost(clearing, rotation)
Outpost = getObjectFromGUID("372ac8")
end
function setupWardens(clearing, rotation)
NativesDie = getObjectFromGUID("caeb2c")
Consul = getObjectFromGUID("c3bbc1")
Bodyguard = getObjectFromGUID("272a3e")
WardenLeader = getObjectFromGUID("600fe8")
Warden2 = getObjectFromGUID("fb9509")
WardenLeader = getObjectFromGUID("600fe8")
end`,
        },
      ],
    };

    expect(extractNativeSummons(save, "eastern")).toEqual({
      Outpost: [
        {
          source: "eastern",
          group: "Consul",
          natives: ["Consul", "Bodyguard"],
          nativeChips: [
            {
              name: "Consul",
              imageURL: "c3bbc1.png",
              imageSecondaryURL: "c3bbc1-back.png",
            },
            {
              name: "Bodyguard",
              imageURL: "272a3e.png",
              imageSecondaryURL: "272a3e-back.png",
            },
          ],
        },
        {
          source: "eastern",
          group: "Wardens",
          natives: ["Warden Leader", "Warden 2"],
          nativeChips: [
            {
              name: "Warden Leader",
              imageURL: "600fe8.png",
              imageSecondaryURL: "600fe8-back.png",
            },
            {
              name: "Warden 2",
              imageURL: "fb9509.png",
              imageSecondaryURL: "fb9509-back.png",
            },
          ],
        },
      ],
    });
  });

  it("extracts native summons from token summonNatives functions", () => {
    const save = {
      LuaScript: `function onLoad()
nativeGroups = {
  bashkirs = {
    "168365", --Leader
    "571a63", --2
  },
  elves = {
    "593e1c", --ElfLeader
    "94a1a2", --Elf2
  },
}
end`,
      ObjectStates: [
        chip("168365", "bashkirs"),
        chip("571a63", "bashkirs"),
        chip("593e1c", "elves"),
        chip("94a1a2", "elves"),
        {
          Name: "Custom_Tile",
          Nickname: "Campfire",
          LuaScript: `function summonNatives()
local _params = {
  location = self.guid,
  group = "bashkirs",
}
Global.call("setupNativeGroup", _params)
_params = {
  location = self.guid,
  group = "elves",
}
Global.call("setupNativeGroup", _params)
_params = {
  location = self.guid,
  group = "tribe",
}
Global.call("setupNativeGroup", _params)
end`,
        },
      ],
    };

    expect(extractNativeSummons(save, "eastern")).toEqual({
      Campfire: [
        {
          source: "eastern",
          group: "Bashkirs",
          natives: ["Bashkirs Leader", "Bashkirs 2"],
          nativeChips: [
            {
              name: "Bashkirs Leader",
              imageURL: "168365.png",
              imageSecondaryURL: "168365-back.png",
            },
            {
              name: "Bashkirs 2",
              imageURL: "571a63.png",
              imageSecondaryURL: "571a63-back.png",
            },
          ],
        },
        {
          source: "eastern",
          group: "Elves",
          natives: ["Elf Leader", "Elf 2"],
          nativeChips: [
            {
              name: "Elf Leader",
              imageURL: "593e1c.png",
              imageSecondaryURL: "593e1c-back.png",
            },
            {
              name: "Elf 2",
              imageURL: "94a1a2.png",
              imageSecondaryURL: "94a1a2-back.png",
            },
          ],
        },
      ],
      "Native Setup": [
        {
          source: "eastern",
          group: "Bashkirs",
          natives: ["Bashkirs Leader", "Bashkirs 2"],
          nativeChips: [
            {
              name: "Bashkirs Leader",
              imageURL: "168365.png",
              imageSecondaryURL: "168365-back.png",
            },
            {
              name: "Bashkirs 2",
              imageURL: "571a63.png",
              imageSecondaryURL: "571a63-back.png",
            },
          ],
        },
        {
          source: "eastern",
          group: "Elves",
          natives: ["Elf Leader", "Elf 2"],
          nativeChips: [
            {
              name: "Elf Leader",
              imageURL: "593e1c.png",
              imageSecondaryURL: "593e1c-back.png",
            },
            {
              name: "Elf 2",
              imageURL: "94a1a2.png",
              imageSecondaryURL: "94a1a2-back.png",
            },
          ],
        },
      ],
    });
  });
});

describe("extractNatives", () => {
  const chip = (guid: string, gmNotes: string) => ({
    GUID: guid,
    Name: "Custom_Tile",
    GMNotes: gmNotes,
    CustomImage: {
      ImageURL: `${guid}.png`,
      ImageSecondaryURL: `${guid}-back.png`,
    },
    LuaScript: "chipName = self.getGMNotes()",
  });

  const civCard = (nickname: string, cardID: number) => ({
    Name: "Card",
    Nickname: nickname,
    CardID: cardID,
    CustomDeck: {
      "610": {
        FaceURL: CIVILISATION_REFERENCE_CARD_FACE_URL,
        BackURL: "backs.png",
        NumWidth: 10,
        NumHeight: 2,
        UniqueBack: false,
      },
    },
  });

  it("combines native setup chips with their civilisation card", () => {
    const save = {
      LuaScript: `nativeGroups = {
  bashkirs = {
    "168365", --Leader
    "571a63", --2
  },
}`,
      ObjectStates: [
        chip("168365", "bashkirs"),
        chip("571a63", "bashkirs"),
        civCard("Bashkirs", 61002),
      ],
    };

    expect(extractNatives(save, "eastern")).toEqual({
      Bashkirs: [
        {
          source: "eastern",
          group: "Bashkirs",
          natives: ["Bashkirs Leader", "Bashkirs 2"],
          nativeChips: [
            {
              name: "Bashkirs Leader",
              imageURL: "168365.png",
              imageSecondaryURL: "168365-back.png",
            },
            {
              name: "Bashkirs 2",
              imageURL: "571a63.png",
              imageSecondaryURL: "571a63-back.png",
            },
          ],
          civilisationCard: {
            source: "eastern",
            faceURL: CIVILISATION_REFERENCE_CARD_FACE_URL,
            backURL: "backs.png",
            numWidth: 10,
            numHeight: 2,
            row: 0,
            col: 2,
            uniqueBack: false,
          },
        },
      ],
    });
  });

  it("infers blank TTS native card names from printed sheet cells", () => {
    const save = {
      LuaScript: `nativeGroups = {
  wardens = {
    "600fe8", --WardenLeader
  },
}`,
      ObjectStates: [chip("600fe8", "wardens"), civCard("", 61017)],
    };

    expect(
      extractNatives(save, "eastern").Wardens[0].civilisationCard,
    ).toMatchObject({ row: 1, col: 7 });
  });
});

describe("extractMapTileMonsters", () => {
  const mapTile = ({
    guid = "abc123",
    nickname = "Ancient Hole",
    lua = `function setupM(rotation)
local mBags = Global.getTable("bagsMonsters")
MixedBag = getObjectFromGUID(mBags["AdultDragons"])
end
function setupW(rotation)
local mBags = Global.getTable("bagsMonsters")
GiantBatBag = getObjectFromGUID(mBags["GiantBats"])
end
function setupL(rotation)
local mBags = Global.getTable("bagsMonsters")
TrollsBag = getObjectFromGUID(mBags["Trolls"])
end`,
  }: {
    guid?: string;
    nickname?: string;
    lua?: string;
  } = {}) => ({
    GUID: guid,
    Name: "Custom_Tile",
    Nickname: nickname,
    LuaScript: lua,
    CustomImage: {
      ImageURL: "front.png",
      ImageSecondaryURL: "back.png",
      CustomTile: { Type: 1 },
    },
  });

  const saveWithTile = (tile: object) => ({
    LuaScript: `OffsetsTable = {
["abc123"] = {
{0, 0, 0},
}, -- Ancient Hole
}`,
    ObjectStates: [
      {
        Name: "Bag",
        Nickname: "Cruel CAVES",
        ContainedObjects: [tile],
      },
    ],
  });

  it("extracts wandering and local monster groups from map tile setup functions", () => {
    expect(extractMapTileMonsters(saveWithTile(mapTile()), "eastern")).toEqual({
      "Ancient Hole": [
        {
          source: "eastern",
          terrain: "Cruel Caves",
          wandering: ["Giant Bats"],
          local: ["Trolls"],
        },
      ],
    });
  });

  it("does not classify mixed setupM monster references as wandering or local", () => {
    const out = extractMapTileMonsters(saveWithTile(mapTile()), "eastern");
    expect(out["Ancient Hole"][0].wandering).not.toContain("Adult Dragons");
    expect(out["Ancient Hole"][0].local).not.toContain("Adult Dragons");
  });

  it("skips map tiles without wandering or local monster bag references", () => {
    const lua = `function setupW(rotation)
end
function setupL(rotation)
end`;
    expect(
      extractMapTileMonsters(saveWithTile(mapTile({ lua })), "eastern"),
    ).toEqual({});
  });
});

describe("extractWildernessTokens", () => {
  const cavesBack = WILDERNESS_TOKEN_BACK_URLS["Cruel Caves"];
  const plainsBack = WILDERNESS_TOKEN_BACK_URLS["Perilous Plains"];
  const wildernessToken = (front: string, back = cavesBack, nick = "") => ({
    Name: "Custom_Tile",
    Nickname: nick,
    CustomImage: { ImageURL: front, ImageSecondaryURL: back },
  });

  it("extracts unnamed Custom_Tile objects by terrain back image", () => {
    const save = {
      ObjectStates: [wildernessToken("front.png")],
    };
    expect(extractWildernessTokens(save, "eastern")).toEqual({
      "Cruel Caves": [
        {
          source: "eastern",
          terrain: "Cruel Caves",
          imageURL: "front.png",
          imageSecondaryURL: cavesBack,
          locations: [{ ancestry: [], count: 1 }],
        },
      ],
    });
  });

  it("keeps terrain buckets separate", () => {
    const save = {
      ObjectStates: [
        wildernessToken("caves.png"),
        wildernessToken("plains.png", plainsBack),
      ],
    };
    expect(
      Object.keys(extractWildernessTokens(save, "eastern")).sort(),
    ).toEqual(["Cruel Caves", "Perilous Plains"]);
  });

  it("preserves nicknames when the source has them", () => {
    const save = {
      ObjectStates: [wildernessToken("ruins.png", cavesBack, "Dwarven Ruins")],
    };
    expect(
      extractWildernessTokens(save, "eastern")["Cruel Caves"][0].nicknames,
    ).toEqual(["Dwarven Ruins"]);
  });

  it("augments tokens with front-image metadata", () => {
    const siteFront = Object.entries(WILDERNESS_TOKEN_FRONT_METADATA).find(
      ([, metadata]) => metadata.name === "Site",
    )?.[0];
    if (!siteFront) throw new Error("Missing Site metadata fixture");

    const save = {
      ObjectStates: [wildernessToken(siteFront)],
    };
    expect(
      extractWildernessTokens(save, "eastern")["Cruel Caves"][0],
    ).toMatchObject({
      name: "Site",
    });
  });

  it("maps clearing and draw suffixes from front-image metadata", () => {
    const zigguratFront = Object.entries(WILDERNESS_TOKEN_FRONT_METADATA).find(
      ([, metadata]) => metadata.name === "Ziggurat",
    )?.[0];
    const buriedTempleFront = Object.entries(
      WILDERNESS_TOKEN_FRONT_METADATA,
    ).find(([, metadata]) => metadata.name === "Buried Temple")?.[0];
    if (!zigguratFront || !buriedTempleFront) {
      throw new Error("Missing wilderness token metadata fixture");
    }

    const save = {
      ObjectStates: [
        wildernessToken(zigguratFront),
        wildernessToken(buriedTempleFront),
      ],
    };
    const tokens = extractWildernessTokens(save, "eastern")["Cruel Caves"];
    expect(tokens.find((token) => token.name === "Ziggurat")).toMatchObject({
      clearing: 1,
    });
    expect(
      tokens.find((token) => token.name === "Buried Temple"),
    ).toMatchObject({
      draw: "X",
    });
  });

  it("matches front metadata by Steam image hash when the UGC path differs", () => {
    const save = {
      ObjectStates: [
        wildernessToken(
          "https://steamusercontent-a.akamaihd.net/ugc/different/92271F5B049D41D87CAEFC6C88E785D6F39B4DED/",
        ),
      ],
    };
    expect(
      extractWildernessTokens(save, "eastern")["Cruel Caves"][0],
    ).toMatchObject({
      name: "Item",
    });
  });

  it("dedups physical copies and records per-ancestry counts", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Caves Wilderness Tokens",
          ContainedObjects: [
            wildernessToken("front.png"),
            wildernessToken("front.png"),
          ],
        },
        {
          Name: "Bag",
          Nickname: "BT Caves",
          ContainedObjects: [wildernessToken("front.png")],
        },
      ],
    };
    expect(
      extractWildernessTokens(save, "eastern")["Cruel Caves"][0],
    ).toMatchObject({
      imageURL: "front.png",
      locations: [
        { ancestry: ["Caves Wilderness Tokens"], count: 2 },
        { ancestry: ["BT Caves"], count: 1 },
      ],
    });
  });

  it("skips non-token custom tiles whose back is not a known terrain back", () => {
    const save = {
      ObjectStates: [wildernessToken("front.png", "other-back.png")],
    };
    expect(extractWildernessTokens(save, "eastern")).toEqual({});
  });
});

describe("extractItems", () => {
  const ITEM_DECK = { ...SAMPLE_DECK, BackURL: ITEM_CARD_BACK_URL };

  it("extracts item cards by shared item back URL", () => {
    const save = {
      ObjectStates: [card("Buckler", 100, "1", ITEM_DECK)],
    };
    const out = extractItems(save, "dd_all_exp");
    expect(out["Buckler"][0]).toMatchObject({
      source: "dd_all_exp",
      backURL: ITEM_CARD_BACK_URL,
      copies: 1,
      boxes: [{ name: "Dragons Down", count: 1 }],
      locations: [{ ancestry: [], count: 1 }],
    });
  });

  it("skips cards with other backs", () => {
    const save = {
      ObjectStates: [card("Not An Item", 100, "1", SAMPLE_DECK)],
    };
    expect(extractItems(save, "dd_all_exp")).toEqual({});
  });

  it("counts duplicate physical copies by ancestry and box", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "DESOLATION Items",
          ContainedObjects: [
            card("Buckler", 100, "1", ITEM_DECK),
            card("Buckler", 100, "1", ITEM_DECK),
          ],
        },
        card("Buckler", 100, "1", ITEM_DECK),
      ],
    };
    const out = extractItems(save, "dd_all_exp");
    expect(out["Buckler"]).toHaveLength(1);
    expect(out["Buckler"][0].copies).toBe(3);
    expect(out["Buckler"][0].locations).toEqual([
      { ancestry: ["DESOLATION Items"], count: 2 },
      { ancestry: [], count: 1 },
    ]);
    expect(out["Buckler"][0].boxes).toEqual([
      { name: "Desolation", count: 2 },
      { name: "Dragons Down", count: 1 },
    ]);
  });

  it("attributes horse item cards to Eastern Reaches", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Horses",
          ContainedObjects: [card("War Horse", 100, "1", ITEM_DECK)],
        },
      ],
    };
    const out = extractItems(save, "dd_all_exp");
    expect(out["War Horse"][0]).toMatchObject({
      copies: 1,
      locations: [{ ancestry: ["Horses"], count: 1 }],
      boxes: [{ name: "Eastern Reaches", count: 1 }],
    });
  });
});

describe("extractTreasures", () => {
  const TREASURE_DECK = { ...SAMPLE_DECK, BackURL: TREASURE_CARD_BACK_URL };
  const DEEP_TREASURE_DECK = {
    ...SAMPLE_DECK,
    BackURL: DEEP_TREASURE_CARD_BACK_URL,
  };

  it("extracts treasure cards with their source deck", () => {
    const save = {
      ObjectStates: [
        card("Potion of Energy", 100, "1", TREASURE_DECK),
        card("Staff of Souls", 100, "1", DEEP_TREASURE_DECK),
        {
          Name: "Bag",
          Nickname: "LEGENDS Cards",
          ContainedObjects: [card("The Lamp", 100, "1", DEEP_TREASURE_DECK)],
        },
      ],
    };

    const out = extractTreasures(save, "dd_all_exp");

    expect(out["Potion of Energy"][0]).toMatchObject({
      deck: "treasure",
      copies: 1,
      locations: [{ ancestry: [], count: 1 }],
    });
    expect(out["Staff of Souls"][0]).toMatchObject({
      deck: "deep-treasure",
      copies: 1,
      locations: [{ ancestry: [], count: 1 }],
    });
    expect(out["The Lamp"][0]).toMatchObject({
      deck: "legendary",
      copies: 1,
      locations: [{ ancestry: ["LEGENDS Cards"], count: 1 }],
    });
  });

  it("counts duplicate physical copies per treasure deck", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Deserts Chips",
          ContainedObjects: [
            card("Potion of Energy", 100, "1", TREASURE_DECK),
            card("Potion of Energy", 100, "1", TREASURE_DECK),
          ],
        },
      ],
    };

    const out = extractTreasures(save, "dd_all_exp");

    expect(out["Potion of Energy"]).toHaveLength(1);
    expect(out["Potion of Energy"][0]).toMatchObject({
      deck: "treasure",
      terrainPack: "Dreadful Deserts",
      copies: 2,
      locations: [{ ancestry: ["Deserts Chips"], count: 2 }],
    });
  });

  it("extracts enchantments from treasure card Lua", () => {
    const save = {
      ObjectStates: [
        {
          ...card("Enchanted Treasure", 100, "1", TREASURE_DECK),
          LuaScript:
            'function replace_treasure()\n draw_cube("green", 1, -2)\nend',
        },
      ],
    };

    expect(outFirstTreasure(save, "Enchanted Treasure")).toMatchObject({
      enchantments: [{ color: "green", count: 1, offset: -2 }],
    });
  });

  it("extracts multiple enchantments from treasure Lua", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "LEGENDS Cards",
          ContainedObjects: [
            {
              ...card("Infernal Glyphs", 100, "1", DEEP_TREASURE_DECK),
              LuaScript: 'draw_cube("black", 1, 0)\n draw_cube("grey", 1, 0.5)',
            },
          ],
        },
      ],
    };

    expect(outFirstTreasure(save, "Infernal Glyphs")).toMatchObject({
      deck: "deep-treasure",
      enchantments: [
        { color: "black", count: 1, offset: 0 },
        { color: "grey", count: 1, offset: 0.5 },
      ],
    });
  });

  it("extracts cube placement anchors from attached snap points", () => {
    const save = {
      ObjectStates: [
        {
          ...card("Arcane Sword", 160, "1", DEEP_TREASURE_DECK),
          AttachedSnapPoints: [
            { Position: { x: 0.433399439, y: 0.209305763, z: 0.9863894 } },
            { Position: { x: -0.4534923, y: 0.209305346, z: 0.977348268 } },
            { Position: { x: -0.000186612539, y: 0.209305555, z: 0.9869081 } },
          ],
        },
      ],
    };

    expect(outFirstTreasure(save, "Arcane Sword")).toMatchObject({
      cubePlacements: [
        { x: -0.4534923, y: 0.209305346, z: 0.977348268 },
        { x: -0.000186612539, y: 0.209305555, z: 0.9869081 },
        { x: 0.433399439, y: 0.209305763, z: 0.9863894 },
      ],
    });
  });

  it("extracts spell-card draw links from treasure Lua", () => {
    const save = {
      ObjectStates: [
        {
          ...card("Spell Book", 100, "1", TREASURE_DECK),
          LuaScript: `function fill_book()
    Zones = Global.getTable("deckZones")
    local zone = getObjectFromGUID(Zones["sZone"])
    if spellsDeck then
        for i = 1, 3 do
            spellsDeck.takeObject({position = self.getPosition()})
        end
    end
end`,
        },
        {
          ...card("Spell Scroll", 101, "1", TREASURE_DECK),
          LuaScript: `function fill_scroll()
    Zones = Global.getTable("deckZones")
    local zone = getObjectFromGUID(Zones["sZone"])
    if spellsDeck then
        for i = 1, 1 do
            spellsDeck.takeObject({position = self.getPosition()})
        end
    end
end`,
        },
      ],
    };

    expect(outFirstTreasure(save, "Spell Book")).toMatchObject({
      cardLinks: [
        { type: "spell-card", relationship: "draws", count: 3, source: "lua" },
      ],
    });
    expect(outFirstTreasure(save, "Spell Scroll")).toMatchObject({
      cardLinks: [
        { type: "spell-card", relationship: "draws", count: 1, source: "lua" },
      ],
    });
  });

  it("extracts fixed spell cast links from treasure descriptions", () => {
    const save = {
      ObjectStates: [
        {
          ...card("Elemental Spherule", 100, "1", TREASURE_DECK),
          Description:
            "When this attack is resolved, the spell, Call Elemental is cast.",
        },
        {
          ...card("Horn of the Dark Angel", 101, "1", TREASURE_DECK),
          Description:
            "When this attack is resolved the Fiery Chasm spell is cast.",
        },
      ],
    };

    expect(outFirstTreasure(save, "Elemental Spherule")).toMatchObject({
      cardLinks: [
        {
          type: "spell",
          relationship: "casts",
          name: "Elemental",
          source: "description",
        },
      ],
    });
    expect(outFirstTreasure(save, "Horn of the Dark Angel")).toMatchObject({
      cardLinks: [
        {
          type: "spell",
          relationship: "casts",
          name: "Fiery Chasm",
          source: "description",
        },
      ],
    });
  });

  it("does not extract generic selected-spell text as a fixed spell link", () => {
    const save = {
      ObjectStates: [
        {
          ...card("The Lamp", 100, "1", DEEP_TREASURE_DECK),
          Description:
            "When this attack is resolved, the selected spell is cast.",
        },
      ],
    };

    expect(outFirstTreasure(save, "The Lamp")).not.toHaveProperty("cardLinks");
  });

  it("leaves terrainPack unset for shared treasure decks", () => {
    const save = {
      ObjectStates: [card("Potion of Energy", 100, "1", TREASURE_DECK)],
    };

    expect(
      extractTreasures(save, "dd_all_exp")["Potion of Energy"][0],
    ).not.toHaveProperty("terrainPack");
  });

  it("skips non-treasure card backs", () => {
    const save = {
      ObjectStates: [card("Not A Treasure", 100, "1", SAMPLE_DECK)],
    };

    expect(extractTreasures(save, "dd_all_exp")).toEqual({});
  });

  function outFirstTreasure(save: unknown, name: string) {
    return extractTreasures(save, "dd_all_exp")[name][0];
  }
});

describe("extractLegendaryLocations", () => {
  const LEGENDARY_DECK = {
    ...SAMPLE_DECK,
    FaceURL: "https://dragonsdowndata.com/data/treasures/AllDeepTreasures2.png",
    BackURL: DEEP_TREASURE_CARD_BACK_URL,
  };

  it("links Natives & Legends site tokens and monster chips from Lua comments", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "LEGENDS Cards",
          ContainedObjects: [
            {
              ...card("Riddle of the Imp", 100, "1", LEGENDARY_DECK),
              LuaScript: "--Token abc123\n--Imp def456",
              Description: "A hero that has found the Riddle of the Imp.",
            },
          ],
        },
        {
          Name: "Bag",
          Nickname: "LEGENDS Tokens",
          ContainedObjects: [
            {
              Name: "Custom_Tile",
              GUID: "abc123",
              CustomImage: {
                ImageURL: "site-front.png",
                ImageSecondaryURL: "site-back.png",
              },
            },
            {
              Name: "Custom_Tile",
              GUID: "def456",
              CustomImage: {
                ImageURL: "imp-front.png",
                ImageSecondaryURL: "imp-back.png",
              },
            },
          ],
        },
      ],
    };

    const out = extractLegendaryLocations(save, "dd_all_exp");
    expect(out["Riddle of the Imp"]).toHaveLength(1);
    expect(out["Riddle of the Imp"][0]).toMatchObject({
      name: "Riddle of the Imp",
      kind: "test",
      siteToken: {
        guid: "abc123",
        imageURL: "site-front.png",
        imageSecondaryURL: "site-back.png",
        connection: "lua-token-comment",
      },
      monsterChips: [
        {
          name: "Imp",
          guid: "def456",
          imageURL: "imp-front.png",
          imageSecondaryURL: "imp-back.png",
          connection: "lua-monster-comment",
        },
      ],
    });
  });

  it("links Eastern named tokens and named Legendary Treasure rewards", () => {
    const save = {
      ObjectStates: [
        {
          Name: "Bag",
          Nickname: "Legends EASTERN",
          ContainedObjects: [
            card("Lamp of the Djinni", 100, "1", LEGENDARY_DECK),
            card("The Lamp", 101, "1", LEGENDARY_DECK),
            {
              Name: "Custom_Tile",
              GUID: "eee111",
              Nickname: "Lamp of the Djinni",
              CustomImage: {
                ImageURL: "lamp-token.png",
                ImageSecondaryURL: "",
              },
            },
          ],
        },
      ],
    };

    const out = extractLegendaryLocations(save, "dd_all_exp");
    expect(out["Lamp of the Djinni"][0].siteToken).toMatchObject({
      guid: "eee111",
      name: "Lamp of the Djinni",
      imageURL: "lamp-token.png",
      connection: "matching-name",
    });
    expect(out["Lamp of the Djinni"][0].rewards?.namedTreasures).toEqual([
      {
        name: "The Lamp",
        card: expect.objectContaining({ row: 0, col: 1 }),
      },
    ]);
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

  it("matches rulebook title variants to TTS card names", () => {
    const disenchanter = { ...sampleCard, source: "disenchanter" };
    const alchemist = { ...sampleCard, source: "alchemist" };
    const index = {
      Disenchanter: [disenchanter],
      "Alchemists mixture": [alchemist],
    };

    expect(
      resolveCards("DisEnchanter", index, {
        DisEnchanter: "Disenchanter",
      }),
    ).toEqual([disenchanter]);
    expect(
      resolveCards("Alchemist’s Mixture", index, {
        [normalizeTitle("Alchemist’s Mixture")]: "Alchemists mixture",
      }),
    ).toEqual([alchemist]);
  });

  it("matches the Shekels rulebook title to all Shekel cards", () => {
    const captivation = { ...sampleCard, source: "captivation" };
    const subjugation = { ...sampleCard, source: "subjugation" };
    const other = { ...sampleCard, source: "other" };

    const out = resolveCards(
      "Shekels",
      {
        "Shekel of Subjucation": [subjugation],
        "Shekel of Captivation": [captivation],
        "Symbol of Recruitment": [other],
      },
      {},
    );

    expect(out.map((card) => card.source)).toEqual([
      "captivation",
      "subjugation",
    ]);
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
