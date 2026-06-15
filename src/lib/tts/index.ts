/**
 * Parses Tabletop Simulator save JSON to extract the card → image mapping.
 *
 * TTS represents each card's art as a cell within a sprite sheet:
 *  - `CustomDeck.<deckId>.FaceURL` + `BackURL` are sprite-sheet URLs
 *  - `NumWidth` × `NumHeight` is the grid layout (cards per row × rows)
 *  - `CardID` encodes the cell: `cardID % 100` is the row-major index
 *  - Multiple cards in different sheets can share a Nickname; we emit a list
 */

export type TTSCardImage = {
  /** Identifier of the source TTS file the card came from. */
  source: string;
  /** Sprite-sheet URL containing the card front. */
  faceURL: string;
  /** Sprite-sheet URL (or single image if `uniqueBack` is false). */
  backURL: string;
  /** Grid width of the face sheet (cards per row). */
  numWidth: number;
  /** Grid height of the face sheet (rows). */
  numHeight: number;
  /** Row of this card within the face sheet, 0-indexed. */
  row: number;
  /** Column of this card within the face sheet, 0-indexed. */
  col: number;
  /** When false, `backURL` is a single shared back (no positioning). */
  uniqueBack: boolean;
  /** TTS `Tags` array (e.g. ["Item", "Merchant", "Steal"]). Omitted when empty. */
  tags?: string[];
  /**
   * Nicknames of every enclosing container, outermost first, that had a
   * non-empty `Nickname`. Container kind doesn't matter — any object the
   * walker descended through is considered. Useful for grouping or
   * disambiguating cards by their physical location in the TTS save.
   */
  ancestry?: string[];
};

/** Output written to data/extracted-from-tts/cards.json. Keyed by normalized `Nickname`. */
export type CardIndex = Record<string, TTSCardImage[]>;

export const ITEM_CARD_BACK_URL =
  "https://steamusercontent-a.akamaihd.net/ugc/2002465601769297962/3DBE963BB5D70759F403013C25FB056102A6C998/";

export const DEEP_TREASURE_CARD_BACK_URL =
  "https://steamusercontent-a.akamaihd.net/ugc/2002465601767702784/21574D78B42D3F86BBA7C9653D7F90B98C37247F/";

export const SPELL_CARD_BACK_URL =
  "https://steamusercontent-a.akamaihd.net/ugc/2002465601770884602/F1189AD6357FAE4A248EFC3A247A558F6B5A8E3E/";

export const HERO_STARTING_SPELL_CARD_BACK_URL =
  "https://steamusercontent-a.akamaihd.net/ugc/2002465601770890258/32254FF7A0F7C612D59FBD76A3EFBA8FB6AE8A72/";

export type TTSItemCard = TTSCardImage & {
  /** Total number of physical copies found for this exact card image cell. */
  copies: number;
  /** Per-container physical-copy breakdown. */
  locations: { ancestry: string[]; count: number }[];
  /** Product/box rollup derived from the TTS container ancestry. */
  boxes: { name: string; count: number }[];
};

/** Output written to data/extracted-from-tts/items.json. Keyed by normalized `Nickname`. */
export type ItemIndex = Record<string, TTSItemCard[]>;

export type TTSLegendarySiteToken = {
  source: string;
  guid?: string;
  name?: string;
  imageURL: string;
  imageSecondaryURL: string;
  ancestry?: string[];
  connection: "lua-token-comment" | "matching-name";
};

export type TTSLegendaryMonsterChip = {
  source: string;
  name: string;
  guid?: string;
  imageURL?: string;
  imageSecondaryURL?: string;
  ancestry?: string[];
  connection: "lua-monster-comment";
};

export type TTSLegendaryTreasureCard = {
  name: string;
  card?: TTSCardImage;
};

export type TTSLegendaryLocationTreasureSetup = {
  deepTreasureCards?: number;
  usesContainingSiteDeepTreasures?: boolean;
  namedTreasures?: TTSLegendaryTreasureCard[];
};

export type TTSLegendaryLocationReward = {
  namedTreasures?: TTSLegendaryTreasureCard[];
  other?: string[];
};

export type TTSLegendaryLocation = {
  source: string;
  name: string;
  kind: "site" | "test";
  card: TTSCardImage;
  description?: string;
  treasureSetup?: TTSLegendaryLocationTreasureSetup;
  rewards?: TTSLegendaryLocationReward;
  monsterChips?: TTSLegendaryMonsterChip[];
  siteToken?: TTSLegendarySiteToken;
};

/** Output written to data/extracted-from-tts/legendary-locations.json. Keyed by normalized `Nickname`. */
export type LegendaryLocationIndex = Record<string, TTSLegendaryLocation[]>;

export type TTSMissionCard = TTSCardImage & {
  /** Mission banner type printed on the card: red, white, or brown. */
  kind?: MissionKind;
  /** Terrain pack or neutral mission bucket derived from TTS container ancestry. */
  terrainPack?: MissionTerrainPack;
  /** Raw TTS card description, e.g. `Complete at Mariners`. */
  description?: string;
  /** Parsed names from `Complete at ...` description text. */
  completeAt?: string[];
  /** Printed mission payout and mission-dice attribute from the card face. */
  stats?: TTSMissionStats;
  /** Scripted mission effects encoded in the card Lua. */
  rewards?: TTSMissionRewards;
};

export type MissionKind = "atrocity" | "quest" | "expedition";

export type MissionAttribute = "charisma" | "wisdom" | "cunning";

export type TTSMissionStats = {
  gold: number;
  fame: number;
  legend: number;
  attribute: MissionAttribute;
};

export type MissionTerrainPack =
  | "neutral"
  | "plains"
  | "woods"
  | "mountains"
  | "caves"
  | "swamps"
  | "riverlands"
  | "deserts"
  | "oasis";

export type MissionKindMap = Record<string, MissionKind>;

export type MissionNicknameCorrection = {
  source: string;
  raw: string;
  faceURL: string;
  row: number;
  col: number;
  corrected: string;
};

export type MissionStatsMapping = {
  source: string;
  raw: string;
  faceURL: string;
  row: number;
  col: number;
  stats: TTSMissionStats;
};

export type TTSMissionRewards = {
  drawCards?: Partial<Record<"deep" | "treasure" | "item" | "spell", number>>;
  points?: Partial<Record<"fame" | "gold", number>>;
  attributes?: Partial<Record<"charisma" | "wisdom" | "intellect", number>>;
  outlaw?: number;
  steal?: {
    drawCards?: Partial<Record<"deep" | "treasure" | "item" | "spell", number>>;
    points?: Partial<Record<"fame" | "gold", number>>;
    outlaw?: number;
  };
};

/** Output written to data/extracted-from-tts/missions.json. Keyed by normalized `Nickname`. */
export type MissionIndex = Record<string, TTSMissionCard[]>;

export type ExtractMissionsOptions = {
  missionKinds?: MissionKindMap;
  missionNicknameCorrections?: readonly MissionNicknameCorrection[];
  missionStats?: readonly MissionStatsMapping[];
};

export type SpellManifestReference = {
  source?: string;
  title: string;
  tags?: string[];
};

export type TTSSpell = {
  source: string;
  name: string;
  rulebookSource?: string;
  magic: string[];
  decks: TTSSpellDeck[];
  cards: TTSSpellCard[];
  spellCards: TTSSpellCard[];
  startingSpellCards: TTSSpellCard[];
};

export type TTSSpellCard = TTSCardImage & {
  copies: number;
  locations: { ancestry: string[]; count: number }[];
};

export type TTSSpellDeck = "spells" | "heroStartingSpells";

/** Output written to data/extracted-from-tts/spells.json. Keyed by spell name. */
export type SpellIndex = Record<string, TTSSpell[]>;

export type ClassAdvantageReference = {
  title: string;
};

export type LineageAdvantageReference = {
  source?: string;
  title: string;
};

export type TTSClassTile = {
  source: string;
  name: string;
  imageURL: string;
  imageSecondaryURL: string;
  ancestry: string[];
  gmNotes?: string;
};

export type TTSClassSetupItem = {
  name: string;
  slot: string;
};

export type TTSClassSetupCube = {
  type: string;
  color: string;
  count: number;
};

export type TTSClassSetupSide = {
  items: TTSClassSetupItem[];
  cubes: TTSClassSetupCube[];
  gold?: number;
};

export type TTSClassSetup = {
  front?: TTSClassSetupSide;
  back?: TTSClassSetupSide;
};

export type TTSLineage = {
  source: string;
  name: string;
  box?: string;
  advantageTitle: string;
  cards: TTSCardImage[];
  setup?: TTSClassSetup;
};

export type TTSClass = {
  source: string;
  name: string;
  box?: string;
  advantageTitle: string;
  advantageCard?: TTSCardImage;
  classToken?: TTSClassTile;
  targetingTokens: TTSClassTile[];
  setup?: TTSClassSetup;
};

/** Output written to data/extracted-from-tts/classes.json. Keyed by class name. */
export type ClassIndex = Record<string, TTSClass[]>;

/** Output written to data/extracted-from-tts/lineages.json. Keyed by lineage name. */
export type LineageIndex = Record<string, TTSLineage[]>;

/**
 * A "chip" is a TTS Custom_Tile whose `LuaScript` begins with `chipName =` —
 * a convention the mod uses to mark game chips (monster counters etc). Unlike
 * cards, chips don't use a sprite sheet; they have full face/back images.
 */
export type TTSChip = {
  source: string;
  /** Raw monster/group name stored in the chip's TTS `GMNotes`. */
  group: string;
  imageURL: string;
  imageSecondaryURL: string;
  /**
   * Per-ancestry breakdown of physical copies. Each entry is one unique
   * ancestry (same shape as a Card's `ancestry`, outermost first; empty
   * array for chips with no nicknamed ancestors) and the number of copies
   * residing there. The total physical count is the sum across entries.
   */
  locations: { ancestry: string[]; count: number }[];
};

/** Sum of physical copies across every `locations` entry. */
export function chipTotalCount(chip: TTSChip): number {
  return chip.locations.reduce((n, l) => n + l.count, 0);
}

/** Output written to data/extracted-from-tts/chips.json. Keyed by normalized `GMNotes`. */
export type ChipIndex = Record<string, TTSChip[]>;

export type TTSSiteMonsterChip = {
  name: string;
  imageURL?: string;
  imageSecondaryURL?: string;
};

export type TTSSiteMonsterGroup = {
  source: string;
  group: string;
  monsters: string[];
  monsterChips: TTSSiteMonsterChip[];
};

/** Output written to data/extracted-from-tts/site-monsters.json. Keyed by site/token name. */
export type SiteMonsterIndex = Record<string, TTSSiteMonsterGroup[]>;

export type TTSNativeChip = {
  name: string;
  imageURL?: string;
  imageSecondaryURL?: string;
};

export type TTSNativeSummonGroup = {
  source: string;
  group: string;
  natives: string[];
  nativeChips: TTSNativeChip[];
};

/** Output written to data/extracted-from-tts/native-summons.json. Keyed by setup source. */
export type NativeSummonIndex = Record<string, TTSNativeSummonGroup[]>;

export type TTSNativeGroup = TTSNativeSummonGroup & {
  civilisationCard?: TTSCardImage;
};

/** Output written to data/extracted-from-tts/natives.json. Keyed by native group name. */
export type NativeIndex = Record<string, TTSNativeGroup[]>;

export const CIVILISATION_REFERENCE_CARD_FACE_URL =
  "https://dragonsdowndata.com/data/titles/AllCivilizationandReferenceCardsFront.png";

export const CIVILISATION_TOKEN_FACE_URL =
  "https://steamusercontent-a.akamaihd.net/ugc/2260307376260337788/3F69B873CF0531BF7F3A5E8C17200B626A98F19D/";

export type TTSCivilisationToken = {
  source: string;
  imageURL: string;
  imageSecondaryURL: string;
  locations: { ancestry: string[]; count: number }[];
  gmNotes?: string;
  name?: string;
  attribute?: string;
  terrain?: string;
};

export type TTSBoard = {
  source: string;
  terrain: string;
  imageURL: string;
  imageSecondaryURL: string;
  merchants: string[];
  sites: string[];
};

/**
 * A "site" is a Custom_Tile whose front (`ImageURL`) is the generic site card
 * back. Each site has a unique Nickname (`Grotto`, `Tarn`, ...) and a unique
 * `ImageSecondaryURL` showing the actual site art.
 */
export type TTSSite = {
  source: string;
  imageURL: string;
  imageSecondaryURL: string;
  ancestry: string[];
  /** GMNotes string from the TTS tile, often a small numeric tag. */
  gmNotes?: string;
};

/** Output written to data/extracted-from-tts/sites.json. Keyed by normalized `Nickname`. */
export type SiteIndex = Record<string, TTSSite[]>;

/**
 * The face URL the TTS mod uses for every site card-back. Tiles with this
 * URL as their `ImageURL` are sites; their unique art is in
 * `ImageSecondaryURL`.
 */
export const SITE_FACE_URL =
  "https://steamusercontent-a.akamaihd.net/ugc/2002465601773647040/CFBF0601BB9E72CCACAD1CC46B210D3CBFB9D370/";

/**
 * A "civ location" is a double-sided Custom_Tile where face and back URL are
 * identical. The mod also uses double-sided tiles for currency / point
 * tokens (`5 Gold`, `1 Fame`, attribute tokens, ...), so we exclude those by
 * rejecting nicknames that start with a digit or contain "Token".
 */
export type TTSCivLocation = {
  source: string;
  imageURL: string;
  ancestry: string[];
};

/** Output written to data/extracted-from-tts/civlocations.json. Keyed by normalized `Nickname`. */
export type CivLocationIndex = Record<string, TTSCivLocation[]>;

export const WILDERNESS_TOKEN_BACK_URLS: Record<string, string> = {
  "Cruel Caves":
    "https://steamusercontent-a.akamaihd.net/ugc/2260307376260351024/6CF77C9E8D346A1E95D9661ED39603A18B7CE05D/",
  "Dreadful Deserts":
    "https://steamusercontent-a.akamaihd.net/ugc/9991230868268597569/6E69E7B591B526F02AA2E6C7153256D809FBE2DE/",
  "Malevolent Mountains":
    "https://steamusercontent-a.akamaihd.net/ugc/2458481068953948516/DA5AD395AB771B3C28E3311E23961413D550EF53/",
  "Perilous Plains":
    "https://steamusercontent-a.akamaihd.net/ugc/2261434080453712948/88CEDE2FC86DE2F96C2C6DB56EBF647FDCB45CBC/",
  "Ruthless Riverlands":
    "https://steamusercontent-a.akamaihd.net/ugc/16048769196775711127/40EEC30C00B227F8842FD729C1E718016C490D02/",
  "Sinister Swamps":
    "https://steamusercontent-a.akamaihd.net/ugc/2261434080453722963/DD6BB1FC4CADB87E954A85E7309B0186E7951033/",
  "Wicked Woods":
    "https://steamusercontent-a.akamaihd.net/ugc/2260307376260373279/394607BD68A2660A3317FFA8F22DF9490FBA436B/",
};

export type WildernessTokenMetadata = {
  name: string;
  clearing?: number;
  draw?: 1 | "X";
};

export const WILDERNESS_TOKEN_FRONT_METADATA: Record<
  string,
  WildernessTokenMetadata
> = {
  "https://steamusercontent-a.akamaihd.net/ugc/2458481068953907206/14E2A089F4937F3C97AE2E94E921153BB2D482CD/":
    {
      name: "Site",
    },
  "https://steamusercontent-a.akamaihd.net/ugc/2458481068953902435/92271F5B049D41D87CAEFC6C88E785D6F39B4DED/":
    {
      name: "Item",
    },
  "https://steamusercontent-a.akamaihd.net/ugc/2458481068953899651/49C1F47CEAE1797A54C8869D58CDA1065635ED9C/":
    {
      name: "Treasure",
    },
  "https://steamusercontent-a.akamaihd.net/ugc/2458481068953930761/8987958A6C56605B278E20F0F63330E848A84CF7/":
    {
      name: "Gate",
      clearing: 1,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/2459607511012543663/6D5ED9F87F6AEC0C8337E9AF4638372EBA43F7B5/":
    {
      name: "Mission",
      draw: 1,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/11350614834800396847/2258D418AC0CAD7C823E7B1397A0133A81EB3C7F/":
    {
      name: "Oasis",
      draw: 1,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/16226642573503589325/F1816E8BA056667DAD67CE97AAAC45BF8FACFBFE/":
    {
      name: "Gate",
      clearing: 6,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/2458481068953950180/5A867E0E1700B5C931AD563C57A9917A43FA14E4/":
    {
      name: "Gate",
      clearing: 4,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/2459607511012539007/FDA70B289C0C55BF28CCB46DC03774C4336ACFB8/":
    {
      name: "Mission",
      draw: 1,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/10311233951381901798/B711DEEAB2FF2908367B1CB18B3FE7E37DD50265/":
    {
      name: "Battlefield",
      clearing: 3,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/2458481068953904510/E20DAE1CE5C0E52F5F0F1B4C96A87B0345ECECEC/":
    {
      name: "Gate",
      clearing: 2,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/2458481068953905396/BF9F863CE55BD7D3DD01CAE876EA050395403085/":
    {
      name: "Wrecked Wagons",
      clearing: 1,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/2458481068953908897/BC773FB63D1582EE29D0BFA26E4278B82BA29752/":
    {
      name: "Mission",
    },
  "https://steamusercontent-a.akamaihd.net/ugc/51329810045297576/72C99BA10F336999632077D3425591AA40825828/":
    {
      name: "Inn",
      draw: 1,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/13758592113855128350/394CC0FECC062A027769EB995F775698FFCAC23D/":
    {
      name: "Wreck",
      clearing: 5,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/14623211079001957653/B77D201D746C306063ADB07B6B07D276CC12B13C/":
    {
      name: "Mission",
      draw: 1,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/17179738774063635109/30D521BBEDDAB9EEE999EF45EAEE915167F46BB4/":
    {
      name: "Gate",
      clearing: 1,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/9330123526560797570/8C243FD0E0E805F1484AD3A2BB40D8AAD2CDA593/":
    {
      name: "Abyss",
      clearing: 4,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/2458481068953915477/4EE861753077D5749A6B767A1777B2A691489D4A/":
    {
      name: "Gate",
      clearing: 5,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/2458481068953916248/A2F46CF655E00E63A0F33FA8CC977B042922EAD2/":
    {
      name: "Lost Battalion",
      clearing: 6,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/2459607511012554060/FCF832CF54F4B867B14627AC9AA8007B141E572A/":
    {
      name: "Encampment",
      draw: 1,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/17615672600507115914/CB46632C6CF7D7D3AECCFD0F55E13661D4DC603B/":
    {
      name: "Grove",
      clearing: 1,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/2458481068953921405/AAA1B4B5447C32E44B70C4AD68525B43379079B7/":
    {
      name: "Mission",
    },
  "https://steamusercontent-a.akamaihd.net/ugc/2458481068953922171/BE2E08C27C4648D3D69EA52A08AE28F505E1D01D/":
    {
      name: "Secret Cache",
      clearing: 5,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/2458481068953923113/F1816E8BA056667DAD67CE97AAAC45BF8FACFBFE/":
    {
      name: "Gate",
      clearing: 6,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/2459607511012552946/0A32A559659DF2E14A5FBF3F510EC6598E79A1D4/":
    {
      name: "Campfire",
      draw: 1,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/14510350798267980535/CCE4246CCC7D306CFFCC17C1665541C33145BF19/":
    {
      name: "Buried Temple",
      draw: "X",
    },
  "https://steamusercontent-a.akamaihd.net/ugc/9507195990435619424/69E580B794BFFF631D2CC1D0FB4EA64AA52D98C9/":
    {
      name: "Mausoleum",
      clearing: 4,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/9594046903796325970/1C922450DBE9BB16229432E8D316FEA095D24BFC/":
    {
      name: "Terrace",
      clearing: 2,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/16068744120689205546/39909D19B4EA98B752961D7F8793F29B7BBF9213/":
    {
      name: "Ziggurat",
      clearing: 1,
    },
  "https://steamusercontent-a.akamaihd.net/ugc/2458481068953952846/111606C60546C7120C6DF6AE3C2D90192A2FA487/":
    {
      name: "Forgotten City",
      draw: "X",
    },
  "https://steamusercontent-a.akamaihd.net/ugc/2458481068953931806/B13DFDA0F48081D8704C74FC36455F1F3C2128A2/":
    {
      name: "Dwarven Ruins",
      draw: "X",
    },
};

export type TTSWildernessToken = {
  source: string;
  terrain: string;
  name?: string;
  clearing?: number;
  draw?: 1 | "X";
  imageURL: string;
  imageSecondaryURL: string;
  nicknames?: string[];
  locations: { ancestry: string[]; count: number }[];
};

/** Output written to data/extracted-from-tts/wilderness-tokens.json. Keyed by terrain name. */
export type WildernessTokenIndex = Record<string, TTSWildernessToken[]>;

/** Output written to data/extracted-from-tts/boards.json. */
export type BoardIndex = TTSBoard[];

export type TTSMapTile = {
  name: string;
  terrain: string;
  imageUrl: string;
  imageSecondaryUrl: string;
  clearings: { x: number; y: number }[];
};

export type TTSMapTileMonsterGroup = {
  source: string;
  terrain: string;
  wandering: string[];
  local: string[];
};

/** Output written to data/extracted-from-tts/map-tile-monsters.json. Keyed by map tile name. */
export type MapTileMonsterIndex = Record<string, TTSMapTileMonsterGroup[]>;

/**
 * Turn a chip's raw GMNotes key into a display name. The mod's GMNotes are
 * mostly PascalCase (`AdultDragons` → `Adult Dragons`), with a handful of
 * lowercase ones (`aurorans` → `Aurorans`). We split at lower→upper
 * boundaries and then capitalize each word.
 */
export function prettifyChipName(s: string): string {
  const alias = CHIP_NAME_ALIASES[s];
  if (alias) return alias;
  return s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(
      /(^|\s)([a-z])/g,
      (_, sep: string, c: string) => sep + c.toUpperCase(),
    );
}

const CHIP_NAME_ALIASES: Record<string, string> = {
  Cylops: "Cyclops",
};

/**
 * Manually-curated aliases for cases that normalization can't handle:
 * word-boundary differences ("Ripple Strike" → "Ripplestrike"), typos in the
 * source data ("Subjugation" → "Subjucation"), or one section that maps to
 * multiple cards ("Spell Book and Spell Scroll" → ["Spell Book", "Spell Scroll"]).
 *
 * Keys are PDF spellings, values are TTS spellings (scalar or array). Loaded
 * from `aliases.json`.
 */
export type AliasMap = Record<string, string | string[]>;

/**
 * Resolve a section title to its matching card entries. Tries the index
 * directly (after normalization), then falls back to the alias map. When an
 * alias value is an array, results from every listed target are concatenated.
 */
export function resolveCards<T extends TTSCardImage>(
  title: string,
  index: Record<string, T[]>,
  aliases: AliasMap,
): T[] {
  const key = normalizeTitle(title);
  const direct = index[key];
  if (direct?.length) return direct;
  const aliased = aliases[key];
  if (aliased === undefined) return [];
  const targets = Array.isArray(aliased) ? aliased : [aliased];
  const results: T[] = [];
  for (const target of targets) {
    const hits = index[normalizeTitle(target)];
    if (hits) results.push(...hits);
  }
  return results;
}

/**
 * Normalize a title for matching. Folds away three sources of mismatch:
 *
 *  1. Quote variants: PDF text uses ’ “ ”, TTS uses ASCII ' ".
 *  2. Presence/absence of apostrophes: e.g. `Adventurer's Toolkit` (PDF) vs
 *     `Adventurers Toolkit` (TTS). Apostrophes are stripped entirely after
 *     quote normalization.
 *  3. Unicode form: NFC.
 *
 * If you spot a new mismatch pattern, extend here — the canonical form is an
 * implementation detail of the index.
 */
export function normalizeTitle(s: string): string {
  return s
    .normalize("NFC")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/'/g, "");
}

type TTSCardObject = {
  Name: "Card" | "CardCustom";
  Nickname?: string;
  Description?: string;
  CardID: number;
  Tags?: string[];
  LuaScript?: string;
  CustomDeck: Record<
    string,
    {
      FaceURL: string;
      BackURL: string;
      NumWidth: number;
      NumHeight: number;
      UniqueBack?: boolean;
    }
  >;
};

type TTSContainer = {
  Name?: string;
  ContainedObjects?: unknown[];
};

/**
 * Walk a TTS save object recursively and return every Card.
 * Bags and Decks contain nested ContainedObjects.
 */
type CardWithAncestry = { card: TTSCardObject; ancestry: string[] };

export function extractCards(root: unknown, source: string): CardIndex {
  const index: CardIndex = {};
  const cards: CardWithAncestry[] = [];
  walk(root, [], cards);
  for (const { card, ancestry } of cards) {
    const raw = (card.Nickname ?? "").trim();
    if (!raw) continue;
    const key = normalizeTitle(raw);
    const image = imageFor(card, source, ancestry);
    if (!image) continue;
    const bucket = (index[key] ??= []);
    // De-duplicate within a source: same nickname can map to multiple physical
    // cards in TTS (e.g. multiple copies of the same card in a bag), but they
    // point at the same sheet cell. Keep one entry per cell; merge tags
    // across copies, and capture an ancestry if the first copy lacked one.
    const existing = bucket.find((c) => isSameCell(c, image));
    if (existing) {
      existing.tags = mergeTags(existing.tags, image.tags);
      if (!existing.ancestry?.length && image.ancestry?.length) {
        existing.ancestry = image.ancestry;
      }
    } else {
      bucket.push(image);
    }
  }
  return index;
}

export function extractItems(root: unknown, source: string): ItemIndex {
  const index: ItemIndex = {};
  const cards: CardWithAncestry[] = [];
  walk(root, [], cards);
  for (const { card, ancestry } of cards) {
    const raw = (card.Nickname ?? "").trim();
    if (!raw) continue;
    const image = imageFor(card, source, ancestry);
    if (!image || image.backURL !== ITEM_CARD_BACK_URL) continue;
    const box = itemBoxFromAncestry(ancestry);
    const key = normalizeTitle(raw);
    const bucket = (index[key] ??= []);
    const existing = bucket.find((c) => isSameCell(c, image));
    if (existing) {
      existing.copies += 1;
      existing.tags = mergeTags(existing.tags, image.tags);
      addToLocations(existing.locations, ancestry);
      addToBoxes(existing.boxes, box);
    } else {
      bucket.push({
        ...image,
        copies: 1,
        locations: [{ ancestry, count: 1 }],
        boxes: [{ name: box, count: 1 }],
      });
    }
  }
  return index;
}

export function extractSpells(
  root: unknown,
  source: string,
  spellManifest: readonly SpellManifestReference[],
  aliases: AliasMap = {},
): SpellIndex {
  const cardIndex = extractSpellCardIndex(root, source);
  const normalizedAliases = normalizeAliasMap(aliases);
  const index: SpellIndex = {};

  for (const entry of spellManifest) {
    if (!entry.tags?.includes("spell")) continue;
    const cards = resolveCards(entry.title, cardIndex, normalizedAliases);
    const spellCards = cards.filter(
      (card) => card.backURL === SPELL_CARD_BACK_URL,
    );
    const startingSpellCards = cards.filter(
      (card) => card.backURL === HERO_STARTING_SPELL_CARD_BACK_URL,
    );
    index[entry.title] = [
      {
        source,
        name: entry.title,
        ...(entry.source ? { rulebookSource: entry.source } : {}),
        magic: magicTags(entry.tags),
        decks: spellDecksFor(spellCards, startingSpellCards),
        cards,
        spellCards,
        startingSpellCards,
      },
    ];
  }

  return index;
}

function extractSpellCardIndex(
  root: unknown,
  source: string,
): Record<string, TTSSpellCard[]> {
  const index: Record<string, TTSSpellCard[]> = {};
  const cards: CardWithAncestry[] = [];
  walk(root, [], cards);
  for (const { card, ancestry } of cards) {
    const raw = (card.Nickname ?? "").trim();
    if (!raw) continue;
    const image = imageFor(card, source, ancestry);
    if (!image || !isSpellBack(image.backURL)) continue;
    const bucket = (index[normalizeTitle(raw)] ??= []);
    const existing = bucket.find((entry) => isSameSpellCard(entry, image));
    if (existing) {
      existing.copies += 1;
      existing.tags = mergeTags(existing.tags, image.tags);
      addToLocations(existing.locations, ancestry);
      if (!existing.ancestry?.length && image.ancestry?.length) {
        existing.ancestry = image.ancestry;
      }
    } else {
      bucket.push({
        ...image,
        copies: 1,
        locations: [{ ancestry, count: 1 }],
      });
    }
  }
  return index;
}

function isSpellBack(backURL: string): boolean {
  return (
    backURL === SPELL_CARD_BACK_URL ||
    backURL === HERO_STARTING_SPELL_CARD_BACK_URL
  );
}

function isSameSpellCard(a: TTSCardImage, b: TTSCardImage): boolean {
  return isSameCell(a, b) && a.backURL === b.backURL;
}

function spellDecksFor(
  spellCards: TTSSpellCard[],
  startingSpellCards: TTSSpellCard[],
): TTSSpellDeck[] {
  return [
    ...(spellCards.length > 0 ? (["spells"] as const) : []),
    ...(startingSpellCards.length > 0 ? (["heroStartingSpells"] as const) : []),
  ];
}

function normalizeAliasMap(aliases: AliasMap): AliasMap {
  const normalized: AliasMap = {};
  for (const [from, to] of Object.entries(aliases)) {
    normalized[normalizeTitle(from)] = Array.isArray(to)
      ? to.map(normalizeTitle)
      : normalizeTitle(to);
  }
  return normalized;
}

function magicTags(tags: readonly string[] | undefined): string[] {
  return (tags ?? [])
    .filter((tag) => tag.endsWith("Magic"))
    .map((tag) => tag.replace(/Magic$/, ""));
}

export function extractLegendaryLocations(
  root: unknown,
  source: string,
): LegendaryLocationIndex {
  const index: LegendaryLocationIndex = {};
  const cards: CardWithAncestry[] = [];
  walk(root, [], cards);
  const tokenByGuid = collectLegendarySiteTokensByGuid(root, source);
  const tileByGuid = collectLegendaryTilesByGuid(root, source);
  const namedTokens = collectNamedLegendarySiteTokens(root, source);
  const treasureCards = collectLegendaryTreasureCards(cards, source);

  for (const { card, ancestry } of cards) {
    const raw = (card.Nickname ?? "").trim();
    if (!raw || !LEGENDARY_LOCATION_DETAILS[normalizeTitle(raw)]) continue;
    if (!isLegendaryContainer(ancestry[0])) continue;
    const image = imageFor(card, source, ancestry);
    if (!image || image.backURL !== DEEP_TREASURE_CARD_BACK_URL) continue;

    const details = LEGENDARY_LOCATION_DETAILS[normalizeTitle(raw)];
    const location: TTSLegendaryLocation = {
      source,
      name: raw,
      kind: details.kind,
      card: image,
    };
    const description = (card.Description ?? "").trim();
    if (description) location.description = description;
    const treasureSetup = legendaryTreasureSetup(details, treasureCards);
    if (treasureSetup) location.treasureSetup = treasureSetup;
    const rewards = legendaryRewards(details, treasureCards);
    if (rewards) location.rewards = rewards;
    const monsterChips = legendaryMonsterChipsFromLua(
      card.LuaScript ?? "",
      tileByGuid,
      source,
    );
    if (monsterChips.length > 0) location.monsterChips = monsterChips;

    const tokenGuid = legendaryTokenGuidFromLua(card.LuaScript ?? "");
    const token = tokenGuid
      ? tokenByGuid.get(tokenGuid)
      : namedTokens.get(normalizeTitle(raw));
    if (token) location.siteToken = token;

    const key = normalizeTitle(raw);
    const bucket = (index[key] ??= []);
    const existing = bucket.find((entry) => isSameCell(entry.card, image));
    if (existing) {
      if (!existing.description && location.description) {
        existing.description = location.description;
      }
      existing.card.tags = mergeTags(existing.card.tags, image.tags);
      existing.monsterChips = mergeLegendaryMonsterChips(
        existing.monsterChips,
        location.monsterChips,
      );
      existing.siteToken ??= location.siteToken;
    } else {
      bucket.push(location);
    }
  }

  return index;
}

export function extractMissions(
  root: unknown,
  source: string,
  options: ExtractMissionsOptions = {},
): MissionIndex {
  const index: MissionIndex = {};
  const cards: CardWithAncestry[] = [];
  walk(root, [], cards);
  for (const { card, ancestry } of cards) {
    if (!Array.isArray(card.Tags) || !card.Tags.includes("Mission")) continue;
    const raw = (card.Nickname ?? "").trim();
    if (!raw) continue;
    const image = imageFor(card, source, ancestry);
    if (!image) continue;
    const mission: TTSMissionCard = { ...image };
    const kind = options.missionKinds?.[missionCellKey(mission)];
    if (kind) mission.kind = kind;
    const terrainPack = missionTerrainPackFromAncestry(mission.ancestry);
    if (terrainPack) mission.terrainPack = terrainPack;
    const stats = missionStatsFor(raw, mission, options.missionStats);
    if (stats) mission.stats = stats;
    const rewards = missionRewardsFromLua(card.LuaScript ?? "");
    if (rewards) mission.rewards = rewards;
    const description = (card.Description ?? "").trim();
    if (description) {
      mission.description = description;
      const completeAt = missionCompleteAtTargets(description);
      if (completeAt.length > 0) mission.completeAt = completeAt;
    }
    const key = normalizeTitle(
      correctMissionNickname(raw, mission, options.missionNicknameCorrections),
    );
    const bucket = (index[key] ??= []);
    const existing = bucket.find((c) => isSameCell(c, mission));
    if (existing) {
      existing.tags = mergeTags(existing.tags, mission.tags);
      if (!existing.description && mission.description) {
        existing.description = mission.description;
      }
      existing.completeAt = mergeStringValues(
        existing.completeAt,
        mission.completeAt,
      );
      if (!existing.kind && mission.kind) existing.kind = mission.kind;
      if (!existing.terrainPack && mission.terrainPack) {
        existing.terrainPack = mission.terrainPack;
      }
      existing.stats ??= mission.stats;
      existing.rewards = mergeMissionRewards(existing.rewards, mission.rewards);
      if (!existing.ancestry?.length && mission.ancestry?.length) {
        existing.ancestry = mission.ancestry;
      }
    } else {
      bucket.push(mission);
    }
  }
  return index;
}

export function extractClasses(
  root: unknown,
  source: string,
  classAdvantages: readonly ClassAdvantageReference[],
): ClassIndex {
  const definitions = classAdvantages.map((entry) => ({
    name: classNameFromAdvantageTitle(entry.title),
    title: entry.title,
  }));
  const namesByKey = new Map(
    definitions.map((entry) => [classComponentKey(entry.name), entry.name]),
  );
  const index: ClassIndex = {};
  for (const definition of definitions) {
    index[definition.name] = [
      {
        source,
        name: definition.name,
        advantageTitle: definition.title,
        targetingTokens: [],
      },
    ];
  }

  const cards: CardWithAncestry[] = [];
  walk(root, [], cards);
  for (const { card, ancestry } of cards) {
    if (!isClassAncestry(ancestry)) continue;
    const raw = (card.Nickname ?? "").trim();
    if (!raw) continue;
    const className = namesByKey.get(
      classComponentKey(classNameFromAdvantageTitle(raw)),
    );
    if (!className) continue;
    const image = imageFor(card, source, ancestry);
    if (image) {
      index[className][0].box ??= classBoxFromAncestry(ancestry);
      index[className][0].advantageCard = image;
      const setup = classSetupFromLua(card.LuaScript ?? "");
      if (setup) index[className][0].setup = setup;
    }
  }

  const tiles: TileWithAncestry[] = [];
  walkTiles(root, [], tiles);
  for (const { tile, ancestry } of tiles) {
    if (!isClassAncestry(ancestry)) continue;
    const image = classTileImage(tile, source, ancestry);
    if (!image) continue;
    const className = namesByKey.get(
      classComponentKey(classTileClassName(tile)),
    );
    if (!className) continue;
    index[className][0].box ??= classBoxFromAncestry(ancestry);
    if (isClassTargetingToken(tile)) {
      index[className][0].targetingTokens.push(image);
    } else {
      index[className][0].classToken ??= image;
    }
  }

  for (const entries of Object.values(index)) {
    entries[0].targetingTokens.sort(compareClassTiles);
  }

  return index;
}

export function extractLineages(
  root: unknown,
  source: string,
  lineageAdvantages: readonly LineageAdvantageReference[],
): LineageIndex {
  const definitions = lineageAdvantages.map((entry) => ({
    name: lineageNameFromAdvantageTitle(entry.title),
    box: lineageBoxFromSource(entry.source),
    title: entry.title,
  }));
  const namesByKey = new Map(
    definitions.map((entry) => [lineageAdvantageKey(entry.title), entry.name]),
  );
  const index: LineageIndex = {};
  for (const definition of definitions) {
    index[definition.name] = [
      {
        source,
        name: definition.name,
        ...(definition.box ? { box: definition.box } : {}),
        advantageTitle: definition.title,
        cards: [],
      },
    ];
  }

  const cards: CardWithAncestry[] = [];
  walk(root, [], cards);
  for (const { card, ancestry } of cards) {
    const raw = (card.Nickname ?? "").trim();
    if (!raw) continue;
    const lineageName = namesByKey.get(lineageAdvantageKey(raw));
    if (!lineageName) continue;
    const image = imageFor(card, source, ancestry);
    if (!image) continue;
    const entry = index[lineageName][0];
    entry.box ??= lineageBoxFromAncestry(ancestry);
    if (!entry.cards.some((existing) => isSameCell(existing, image))) {
      entry.cards.push(image);
    }
    const setup = classSetupFromLua(card.LuaScript ?? "");
    if (setup) entry.setup ??= setup;
  }

  for (const entries of Object.values(index)) {
    entries[0].cards.sort(compareCardCells);
  }

  return index;
}

function classNameFromAdvantageTitle(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function lineageNameFromAdvantageTitle(title: string): string {
  const name = classNameFromAdvantageTitle(title);
  return LINEAGE_NAME_ALIASES[name] ?? name;
}

const LINEAGE_NAME_ALIASES: Record<string, string> = {
  "Half-Elves": "Half-Elf",
};

function lineageAdvantageKey(title: string): string {
  return normalizeTitle(title.replace(/-/g, " "));
}

function lineageBoxFromSource(source: string | undefined): string | undefined {
  if (!source) return undefined;
  return LINEAGE_SOURCE_BOX_NAMES[source] ?? titleCaseWords(source);
}

const LINEAGE_SOURCE_BOX_NAMES: Record<string, string> = {
  core: "Dragons Down",
  desolation: "Desolation",
  "natives-and-legends": "Natives and Legends",
  "eastern-reaches": "Eastern Reaches",
};

function lineageBoxFromAncestry(ancestry: string[]): string | undefined {
  const lineageBag = ancestry.find((entry) => /^Lineage\s+/i.test(entry));
  if (!lineageBag) return "Dragons Down";
  const raw = lineageBag
    .replace(/^Lineage\s+/i, "")
    .trim()
    .toLowerCase();
  return CLASS_BOX_NAMES[raw] ?? titleCaseWords(raw);
}

function compareCardCells(a: TTSCardImage, b: TTSCardImage): number {
  return (
    a.faceURL.localeCompare(b.faceURL) ||
    a.row - b.row ||
    a.col - b.col ||
    a.backURL.localeCompare(b.backURL)
  );
}

function classComponentKey(name: string): string {
  const key = name
    .replace(/\btoken\b(?:\s+\d+)?$/i, "")
    .replace(/\bcounter\s*\([^)]*\)$/i, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return CLASS_COMPONENT_ALIASES[key] ?? key;
}

const CLASS_COMPONENT_ALIASES: Record<string, string> = {
  battlemage: "battle mage",
  conjuror: "conjurer",
  "pit fighter": "pit fighter",
  "pit fighter token": "pit fighter",
  "pit fighter token 2": "pit fighter",
  "warrior counter": "warrior",
};

function isClassAncestry(ancestry: string[]): boolean {
  return ancestry.some((entry) => /^Class\s+/i.test(entry));
}

function classBoxFromAncestry(ancestry: string[]): string | undefined {
  const classBag = ancestry.find((entry) => /^Class\s+/i.test(entry));
  if (!classBag) return undefined;
  const raw = classBag
    .replace(/^Class\s+/i, "")
    .trim()
    .toLowerCase();
  return CLASS_BOX_NAMES[raw] ?? titleCaseWords(raw);
}

const CLASS_BOX_NAMES: Record<string, string> = {
  "dragons down": "Dragons Down",
  desolation: "Desolation",
  natives: "Natives and Legends",
  eastern: "Eastern Reaches",
};

type LegendaryLocationDetails = {
  kind: "site" | "test";
  setup?: {
    deepTreasureCards?: number;
    usesContainingSiteDeepTreasures?: boolean;
    namedTreasures?: string[];
  };
  rewards?: {
    namedTreasures?: string[];
    other?: string[];
  };
};

const LEGENDARY_LOCATION_DETAILS: Record<string, LegendaryLocationDetails> = {
  [normalizeTitle("Adventurer's Corpse")]: {
    kind: "test",
    setup: {
      usesContainingSiteDeepTreasures: true,
      namedTreasures: ["Holdfast Leathers", "Skull Splitter"],
    },
    rewards: { other: ["One random curse"] },
  },
  [normalizeTitle("Arcanis Engima")]: {
    kind: "test",
    rewards: { namedTreasures: ["Mageshift Medallion"] },
  },
  [normalizeTitle("Cavernous Pit")]: {
    kind: "test",
    setup: { deepTreasureCards: 2 },
  },
  [normalizeTitle("Collapsed Passage")]: {
    kind: "test",
    setup: { deepTreasureCards: 2 },
  },
  [normalizeTitle("Grave of the Champion")]: {
    kind: "site",
    setup: {
      deepTreasureCards: 1,
      namedTreasures: ["Champion's Plate", "Champion's Blade"],
    },
  },
  [normalizeTitle("Infernal Glyphs")]: {
    kind: "test",
    rewards: { other: ["Learn a spell"] },
  },
  [normalizeTitle("Lamp of the Djinni")]: {
    kind: "site",
    rewards: { namedTreasures: ["The Lamp"] },
  },
  [normalizeTitle("Lost Captains Locker")]: {
    kind: "site",
    setup: { deepTreasureCards: 4 },
  },
  [normalizeTitle("Riddle of the Imp")]: {
    kind: "test",
    rewards: { other: ["Chosen magic cube", "Imp chip"] },
  },
  [normalizeTitle("Spellcaster's Simulacrum")]: {
    kind: "site",
    setup: {
      deepTreasureCards: 1,
      namedTreasures: ["Eternium Grimoire", "Arcane Sword"],
    },
  },
  [normalizeTitle("Statue of the Templar")]: {
    kind: "test",
    rewards: { other: ["Statue chip"] },
  },
  [normalizeTitle("Treacherous Ledge")]: {
    kind: "test",
    setup: { deepTreasureCards: 2 },
  },
};

const LEGENDARY_TREASURE_NAMES = new Set(
  [
    "Arcane Sword",
    "Champion's Blade",
    "Champion's Plate",
    "Eternium Grimoire",
    "Holdfast Leathers",
    "Mageshift Medallion",
    "Skull Splitter",
    "The Lamp",
  ].map(normalizeTitle),
);

function itemBoxFromAncestry(ancestry: string[]): string {
  const itemBag = ancestry[0]?.trim().toLowerCase() ?? "";
  if (itemBag.includes("desolation")) return "Desolation";
  if (itemBag === "horses") return "Eastern Reaches";
  return "Dragons Down";
}

function isLegendaryContainer(name: string | undefined): boolean {
  return name === "LEGENDS Cards" || name === "Legends EASTERN";
}

function isLegendaryTokenContainer(name: string | undefined): boolean {
  return name === "LEGENDS Tokens" || name === "Legends EASTERN";
}

function collectLegendaryTreasureCards(
  cards: CardWithAncestry[],
  source: string,
): Map<string, TTSLegendaryTreasureCard> {
  const treasures = new Map<string, TTSLegendaryTreasureCard>();
  for (const { card, ancestry } of cards) {
    const raw = (card.Nickname ?? "").trim();
    const key = normalizeTitle(raw);
    if (!raw || !LEGENDARY_TREASURE_NAMES.has(key)) continue;
    if (!isLegendaryContainer(ancestry[0])) continue;
    const image = imageFor(card, source, ancestry);
    if (!image || image.backURL !== DEEP_TREASURE_CARD_BACK_URL) continue;
    treasures.set(key, { name: raw, card: image });
  }
  return treasures;
}

function legendaryTreasureSetup(
  details: LegendaryLocationDetails,
  treasureCards: Map<string, TTSLegendaryTreasureCard>,
): TTSLegendaryLocationTreasureSetup | undefined {
  if (!details.setup) return undefined;
  const setup: TTSLegendaryLocationTreasureSetup = {};
  if (details.setup.deepTreasureCards !== undefined) {
    setup.deepTreasureCards = details.setup.deepTreasureCards;
  }
  if (details.setup.usesContainingSiteDeepTreasures) {
    setup.usesContainingSiteDeepTreasures = true;
  }
  if (details.setup.namedTreasures?.length) {
    setup.namedTreasures = details.setup.namedTreasures.map((name) =>
      legendaryTreasureCard(name, treasureCards),
    );
  }
  return setup;
}

function legendaryRewards(
  details: LegendaryLocationDetails,
  treasureCards: Map<string, TTSLegendaryTreasureCard>,
): TTSLegendaryLocationReward | undefined {
  if (!details.rewards) return undefined;
  const rewards: TTSLegendaryLocationReward = {};
  if (details.rewards.namedTreasures?.length) {
    rewards.namedTreasures = details.rewards.namedTreasures.map((name) =>
      legendaryTreasureCard(name, treasureCards),
    );
  }
  if (details.rewards.other?.length) {
    rewards.other = [...details.rewards.other].sort((a, b) =>
      a.localeCompare(b),
    );
  }
  return rewards;
}

function legendaryTreasureCard(
  name: string,
  treasureCards: Map<string, TTSLegendaryTreasureCard>,
): TTSLegendaryTreasureCard {
  return treasureCards.get(normalizeTitle(name)) ?? { name };
}

function legendaryTokenGuidFromLua(luaScript: string): string {
  return luaScript.match(/--\s*Token\s+([0-9a-f]{6})/i)?.[1] ?? "";
}

function legendaryMonsterChipsFromLua(
  luaScript: string,
  tileByGuid: Map<string, TileWithAncestry>,
  source: string,
): TTSLegendaryMonsterChip[] {
  const chips: TTSLegendaryMonsterChip[] = [];
  for (const match of luaScript.matchAll(
    /--\s*([A-Za-z][A-Za-z0-9 ]*)\s+([0-9a-f]{6})/gi,
  )) {
    const name = match[1].trim();
    if (name.toLowerCase() === "token") continue;
    const guid = match[2];
    const tile = tileByGuid.get(guid);
    const chip: TTSLegendaryMonsterChip = {
      source,
      name,
      guid,
      connection: "lua-monster-comment",
    };
    if (tile) {
      chip.imageURL = text(tile.tile.CustomImage.ImageURL);
      chip.imageSecondaryURL = text(tile.tile.CustomImage.ImageSecondaryURL);
      if (tile.ancestry.length > 0) chip.ancestry = tile.ancestry;
    }
    chips.push(chip);
  }
  return chips.sort((a, b) => a.name.localeCompare(b.name));
}

function mergeLegendaryMonsterChips(
  a: TTSLegendaryMonsterChip[] | undefined,
  b: TTSLegendaryMonsterChip[] | undefined,
): TTSLegendaryMonsterChip[] | undefined {
  if (!a?.length && !b?.length) return undefined;
  const chips = [...(a ?? [])];
  for (const chip of b ?? []) {
    if (
      chips.some(
        (entry) => entry.guid === chip.guid && entry.name === chip.name,
      )
    ) {
      continue;
    }
    chips.push(chip);
  }
  return chips.sort((left, right) => left.name.localeCompare(right.name));
}

function collectLegendaryTilesByGuid(
  root: unknown,
  source: string,
): Map<string, TileWithAncestry> {
  void source;
  const tilesByGuid = new Map<string, TileWithAncestry>();
  const tiles: TileWithAncestry[] = [];
  walkTiles(root, [], tiles);
  for (const tile of tiles) {
    if (!isLegendaryTokenContainer(tile.ancestry[0])) continue;
    const guid = text((tile.tile as unknown as Record<string, unknown>).GUID);
    if (guid) tilesByGuid.set(guid, tile);
  }
  return tilesByGuid;
}

function collectLegendarySiteTokensByGuid(
  root: unknown,
  source: string,
): Map<string, TTSLegendarySiteToken> {
  const tokens = new Map<string, TTSLegendarySiteToken>();
  const tiles: TileWithAncestry[] = [];
  walkTiles(root, [], tiles);
  for (const { tile, ancestry } of tiles) {
    if (!isLegendaryTokenContainer(ancestry[0])) continue;
    const guid = text((tile as unknown as Record<string, unknown>).GUID);
    const imageURL = text(tile.CustomImage.ImageURL);
    if (!guid || !imageURL) continue;
    const token: TTSLegendarySiteToken = {
      source,
      guid,
      imageURL,
      imageSecondaryURL: text(tile.CustomImage.ImageSecondaryURL),
      connection: "lua-token-comment",
    };
    const name = text(tile.Nickname);
    if (name) token.name = name;
    if (ancestry.length > 0) token.ancestry = ancestry;
    tokens.set(guid, token);
  }
  return tokens;
}

function collectNamedLegendarySiteTokens(
  root: unknown,
  source: string,
): Map<string, TTSLegendarySiteToken> {
  const tokens = new Map<string, TTSLegendarySiteToken>();
  const tiles: TileWithAncestry[] = [];
  walkTiles(root, [], tiles);
  for (const { tile, ancestry } of tiles) {
    if (!isLegendaryTokenContainer(ancestry[0])) continue;
    const name = text(tile.Nickname);
    const imageURL = text(tile.CustomImage.ImageURL);
    if (!name || !imageURL) continue;
    const token: TTSLegendarySiteToken = {
      source,
      name,
      imageURL,
      imageSecondaryURL: text(tile.CustomImage.ImageSecondaryURL),
      connection: "matching-name",
    };
    const guid = text((tile as unknown as Record<string, unknown>).GUID);
    if (guid) token.guid = guid;
    if (ancestry.length > 0) token.ancestry = ancestry;
    tokens.set(normalizeTitle(name), token);
  }
  return tokens;
}

export function addToBoxes(
  boxes: { name: string; count: number }[],
  name: string,
  count = 1,
): void {
  const match = boxes.find((box) => box.name === name);
  if (match) {
    match.count += count;
  } else {
    boxes.push({ name, count });
  }
}

function titleCaseWords(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function classTileClassName(tile: TileObject): string {
  const nickname = (tile.Nickname ?? "").trim();
  const gmNotes = (tile.GMNotes ?? "").trim();
  return gmNotes || nickname;
}

function isClassTargetingToken(tile: TileObject): boolean {
  return /\btoken\b/i.test((tile.Nickname ?? "").trim());
}

function classTileImage(
  tile: TileObject,
  source: string,
  ancestry: string[],
): TTSClassTile | null {
  const imageURL = tile.CustomImage.ImageURL?.trim() ?? "";
  const imageSecondaryURL = tile.CustomImage.ImageSecondaryURL?.trim() ?? "";
  if (!imageURL) return null;
  const name = (tile.Nickname ?? "").trim();
  const out: TTSClassTile = {
    source,
    name,
    imageURL,
    imageSecondaryURL,
    ancestry,
  };
  const gmNotes = (tile.GMNotes ?? "").trim();
  if (gmNotes) out.gmNotes = gmNotes;
  return out;
}

function compareClassTiles(a: TTSClassTile, b: TTSClassTile): number {
  return a.name.localeCompare(b.name) || a.imageURL.localeCompare(b.imageURL);
}

function classSetupFromLua(luaScript: string): TTSClassSetup | undefined {
  const front = classSetupSideFromLua(luaScript, "front_setup");
  const back = classSetupSideFromLua(luaScript, "back_setup");
  if (!front && !back) return undefined;
  return { ...(front ? { front } : {}), ...(back ? { back } : {}) };
}

function classSetupSideFromLua(
  luaScript: string,
  functionName: "front_setup" | "back_setup",
): TTSClassSetupSide | undefined {
  const body = classSetupFunctionBody(luaScript, functionName);
  if (!body) return undefined;

  const items: TTSClassSetupItem[] = [];
  const itemPattern = /take_card\([^,]+,\s*"([^"]+)"\s*,\s*"([^"]+)"/g;
  let itemMatch: RegExpExecArray | null;
  while ((itemMatch = itemPattern.exec(body))) {
    items.push({ name: itemMatch[1], slot: itemMatch[2] });
  }

  const cubes: TTSClassSetupCube[] = [];
  const cubePattern =
    /take_cube(?:_race)?\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*(\d+)/g;
  let cubeMatch: RegExpExecArray | null;
  while ((cubeMatch = cubePattern.exec(body))) {
    cubes.push({
      type: cubeMatch[1],
      color: cubeMatch[2],
      count: Number(cubeMatch[3]),
    });
  }

  const side: TTSClassSetupSide = { items, cubes };
  const gold = body.match(/set_gold\(\s*(\d+)/);
  if (gold) side.gold = Number(gold[1]);

  if (items.length === 0 && cubes.length === 0 && side.gold === undefined) {
    return undefined;
  }
  return side;
}

function classSetupFunctionBody(
  luaScript: string,
  functionName: string,
): string {
  const escaped = functionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = luaScript
    .replace(/\r/g, "")
    .match(
      new RegExp(
        `function\\s+${escaped}\\s*\\([^)]*\\)([\\s\\S]*?)(?=\\nfunction\\s|$)`,
      ),
    );
  return match?.[1] ?? "";
}

export function missionCellKey(
  card: Pick<TTSCardImage, "faceURL" | "row" | "col">,
): string {
  return `${card.faceURL}#${card.row}:${card.col}`;
}

const MISSION_TERRAIN_PACKS: Record<string, MissionTerrainPack> = {
  "natives groups": "neutral",
  "plains chips": "plains",
  "woods chips": "woods",
  "mountains chips": "mountains",
  "caves chips": "caves",
  "swamps chips": "swamps",
  "riverlands chips": "riverlands",
  "deserts chips": "deserts",
  oasis: "oasis",
};

function missionTerrainPackFromAncestry(
  ancestry: string[] | undefined,
): MissionTerrainPack | undefined {
  const bucket = ancestry?.[0];
  if (!bucket) return undefined;
  return MISSION_TERRAIN_PACKS[
    bucket.replace(/\s+/g, " ").trim().toLowerCase()
  ];
}

function missionRewardsFromLua(
  luaScript: string,
): TTSMissionRewards | undefined {
  const drawCards = cleanNumericRecord({
    deep: luaNumber(luaScript, "dcount"),
    treasure: luaNumber(luaScript, "tcount"),
    item: luaNumber(luaScript, "icount"),
    spell: luaNumber(luaScript, "scount"),
  });
  const points = cleanNumericRecord({
    fame: luaNumber(luaScript, "famount"),
    gold: luaNumber(luaScript, "gamount"),
  });
  const attributes = cleanNumericRecord({
    charisma: luaNumber(luaScript, "charisma"),
    wisdom: luaNumber(luaScript, "wisdom"),
    intellect: luaNumber(luaScript, "intellect"),
  });
  const stealDrawCards = cleanNumericRecord({
    deep: luaNumber(luaScript, "xdcount"),
    treasure: luaNumber(luaScript, "xtcount"),
    item: luaNumber(luaScript, "xicount"),
    spell: luaNumber(luaScript, "xscount"),
  });
  const stealPoints = cleanNumericRecord({
    fame: luaNumber(luaScript, "xfamount"),
    gold: luaNumber(luaScript, "xgamount"),
  });
  const outlaw = positiveLuaNumber(luaScript, "outlaw");
  const stealOutlaw = positiveLuaNumber(luaScript, "xoutlaw");

  const rewards: TTSMissionRewards = {};
  if (drawCards) rewards.drawCards = drawCards;
  if (points) rewards.points = points;
  if (attributes) rewards.attributes = attributes;
  if (outlaw) rewards.outlaw = outlaw;
  const steal: NonNullable<TTSMissionRewards["steal"]> = {};
  if (stealDrawCards) steal.drawCards = stealDrawCards;
  if (stealPoints) steal.points = stealPoints;
  if (stealOutlaw) steal.outlaw = stealOutlaw;
  if (Object.keys(steal).length > 0) rewards.steal = steal;
  return Object.keys(rewards).length > 0 ? rewards : undefined;
}

function positiveLuaNumber(
  luaScript: string,
  name: string,
): number | undefined {
  const value = luaNumber(luaScript, name);
  return value && value > 0 ? value : undefined;
}

function luaNumber(luaScript: string, name: string): number | undefined {
  const match = luaScript.match(
    new RegExp(`(?:^|\\n)\\s*${name}\\s*=\\s*(-?\\d+)`),
  );
  if (!match) return undefined;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : undefined;
}

function cleanNumericRecord<T extends string>(
  values: Partial<Record<T, number | undefined>>,
): Partial<Record<T, number>> | undefined {
  const out: Partial<Record<T, number>> = {};
  for (const [key, value] of Object.entries(values) as [
    T,
    number | undefined,
  ][]) {
    if (typeof value === "number" && value > 0) out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function mergeMissionRewards(
  a: TTSMissionRewards | undefined,
  b: TTSMissionRewards | undefined,
): TTSMissionRewards | undefined {
  if (!a) return b;
  if (!b) return a;
  return {
    drawCards: mergeNumericRecords(a.drawCards, b.drawCards),
    points: mergeNumericRecords(a.points, b.points),
    attributes: mergeNumericRecords(a.attributes, b.attributes),
    outlaw: a.outlaw ?? b.outlaw,
    steal: mergeMissionStealRewards(a.steal, b.steal),
  };
}

function mergeMissionStealRewards(
  a: TTSMissionRewards["steal"],
  b: TTSMissionRewards["steal"],
): TTSMissionRewards["steal"] {
  if (!a) return b;
  if (!b) return a;
  return {
    drawCards: mergeNumericRecords(a.drawCards, b.drawCards),
    points: mergeNumericRecords(a.points, b.points),
    outlaw: a.outlaw ?? b.outlaw,
  };
}

function mergeNumericRecords<T extends string>(
  a: Partial<Record<T, number>> | undefined,
  b: Partial<Record<T, number>> | undefined,
): Partial<Record<T, number>> | undefined {
  if (!a) return b;
  if (!b) return a;
  const out: Partial<Record<T, number>> = { ...a };
  for (const [key, value] of Object.entries(b) as [T, number][]) {
    out[key] ??= value;
  }
  return out;
}

function correctMissionNickname(
  raw: string,
  mission: TTSMissionCard,
  corrections: readonly MissionNicknameCorrection[] = [],
): string {
  const correction = corrections.find(
    (entry) =>
      entry.source === mission.source &&
      entry.raw === raw &&
      entry.faceURL === mission.faceURL &&
      entry.row === mission.row &&
      entry.col === mission.col,
  );
  return correction?.corrected ?? raw;
}

function missionStatsFor(
  raw: string,
  mission: TTSMissionCard,
  mappings: readonly MissionStatsMapping[] = [],
): TTSMissionStats | undefined {
  return mappings.find(
    (mapping) =>
      mapping.source === mission.source &&
      mapping.raw === raw &&
      mapping.faceURL === mission.faceURL &&
      mapping.row === mission.row &&
      mapping.col === mission.col,
  )?.stats;
}

function missionCompleteAtTargets(description: string): string[] {
  const targets: string[] = [];
  const re = /(?:^|\b)Complete at\s+([^\n.]+)/gi;
  for (const match of description.matchAll(re)) {
    const target = match[1]
      .replace(/\s+/g, " ")
      .replace(/[;:,.]+$/g, "")
      .trim();
    if (target) targets.push(target);
  }
  return [...new Set(targets)].sort((a, b) => a.localeCompare(b));
}

export function isSameCell(a: TTSCardImage, b: TTSCardImage): boolean {
  return a.faceURL === b.faceURL && a.row === b.row && a.col === b.col;
}

export function mergeTags(
  a: string[] | undefined,
  b: string[] | undefined,
): string[] | undefined {
  return mergeStringValues(a, b);
}

function mergeStringValues(
  a: string[] | undefined,
  b: string[] | undefined,
): string[] | undefined {
  if (!a?.length && !b?.length) return undefined;
  const set = new Set<string>([...(a ?? []), ...(b ?? [])]);
  return [...set].sort();
}

type ChipObject = {
  GMNotes?: string;
  LuaScript?: string;
  CustomImage: { ImageURL?: string; ImageSecondaryURL?: string };
};

type ChipWithAncestry = { chip: ChipObject; ancestry: string[] };

type TileObject = {
  Name: "Custom_Tile";
  Nickname?: string;
  GMNotes?: string;
  CustomImage: { ImageURL?: string; ImageSecondaryURL?: string };
};

type TileWithAncestry = { tile: TileObject; ancestry: string[] };

/**
 * Walk a TTS save object recursively and return every Chip. The mod tags
 * chip-tiles with a `LuaScript` starting `chipName =`, distinguishing them
 * from other Custom_Tile objects.
 *
 * Physical copies are deduped by `(imageURL, imageSecondaryURL)`, with their
 * count broken down per unique ancestry (nicknamed-container path).
 */
export function extractChips(root: unknown, source: string): ChipIndex {
  const index: ChipIndex = {};
  const chips: ChipWithAncestry[] = [];
  walkChips(root, [], chips);
  for (const { chip, ancestry } of chips) {
    const gm = (chip.GMNotes ?? "").trim();
    if (!gm) continue;
    const key = normalizeTitle(gm);
    const imageURL = chip.CustomImage.ImageURL ?? "";
    const imageSecondaryURL = chip.CustomImage.ImageSecondaryURL ?? "";
    if (!imageURL) continue;
    const bucket = (index[key] ??= []);
    const existing = bucket.find(
      (c) =>
        c.imageURL === imageURL && c.imageSecondaryURL === imageSecondaryURL,
    );
    if (existing) {
      addToLocations(existing.locations, ancestry);
    } else {
      bucket.push({
        source,
        group: gm,
        imageURL,
        imageSecondaryURL,
        locations: [{ ancestry, count: 1 }],
      });
    }
  }
  return index;
}

export function addToLocations(
  locations: { ancestry: string[]; count: number }[],
  ancestry: string[],
): void {
  const match = locations.find((l) => sameAncestry(l.ancestry, ancestry));
  if (match) {
    match.count += 1;
  } else {
    locations.push({ ancestry, count: 1 });
  }
}

export function sameAncestry(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Walk a TTS save object recursively and return every Site — identified by
 * `CustomImage.ImageURL === SITE_FACE_URL`. Each site is keyed by its
 * normalized `Nickname`; the unique art lives in `ImageSecondaryURL`.
 */
export function extractSites(root: unknown, source: string): SiteIndex {
  const index: SiteIndex = {};
  type SiteObj = {
    Nickname?: string;
    GMNotes?: string;
    CustomImage: { ImageURL?: string; ImageSecondaryURL?: string };
  };
  const sites: { site: SiteObj; ancestry: string[] }[] = [];
  const walkSites = (obj: unknown, ancestry: string[]) => {
    if (!isRecord(obj)) return;
    const ci = obj.CustomImage as
      | { ImageURL?: string; ImageSecondaryURL?: string }
      | undefined;
    if (ci && ci.ImageURL === SITE_FACE_URL) {
      sites.push({ site: obj as unknown as SiteObj, ancestry });
    }
    const nick = typeof obj.Nickname === "string" ? obj.Nickname.trim() : "";
    const childAncestry = nick ? [...ancestry, nick] : ancestry;
    const states = obj.ObjectStates;
    if (Array.isArray(states))
      for (const s of states) walkSites(s, childAncestry);
    const contained = (obj as TTSContainer).ContainedObjects;
    if (Array.isArray(contained))
      for (const s of contained) walkSites(s, childAncestry);
  };
  walkSites(root, []);
  for (const { site, ancestry } of sites) {
    const nick = (site.Nickname ?? "").trim();
    if (!nick) continue;
    const key = normalizeTitle(nick);
    const entry: TTSSite = {
      source,
      imageURL: site.CustomImage.ImageURL ?? "",
      imageSecondaryURL: site.CustomImage.ImageSecondaryURL ?? "",
      ancestry,
    };
    const gm = (site.GMNotes ?? "").trim();
    if (gm) entry.gmNotes = gm;
    (index[key] ??= []).push(entry);
  }
  return index;
}

/**
 * Walk a TTS save and return every civ-location tile: a Custom_Tile whose
 * `ImageURL === ImageSecondaryURL` (the same art on both sides). We also
 * require a non-token-shaped Nickname so currency/point/attribute tokens —
 * which share the same double-sided convention — are excluded.
 */
export function extractCivLocations(
  root: unknown,
  source: string,
): CivLocationIndex {
  const index: CivLocationIndex = {};
  type LocObj = {
    Nickname?: string;
    CustomImage: { ImageURL?: string; ImageSecondaryURL?: string };
  };
  const tiles: { obj: LocObj; ancestry: string[] }[] = [];
  const walkLocs = (obj: unknown, ancestry: string[]) => {
    if (!isRecord(obj)) return;
    const ci = obj.CustomImage as
      | { ImageURL?: string; ImageSecondaryURL?: string }
      | undefined;
    if (
      ci?.ImageURL &&
      (ci.ImageURL === ci.ImageSecondaryURL ||
        (ci.ImageSecondaryURL === "" &&
          (obj.Nickname === "Port" || obj.Nickname === "Medina")))
    ) {
      tiles.push({ obj: obj as unknown as LocObj, ancestry });
    }
    const nick = typeof obj.Nickname === "string" ? obj.Nickname.trim() : "";
    const childAncestry = nick ? [...ancestry, nick] : ancestry;
    const states = obj.ObjectStates;
    if (Array.isArray(states))
      for (const s of states) walkLocs(s, childAncestry);
    const contained = (obj as TTSContainer).ContainedObjects;
    if (Array.isArray(contained))
      for (const s of contained) walkLocs(s, childAncestry);
  };
  walkLocs(root, []);
  for (const { obj, ancestry } of tiles) {
    const nick = (obj.Nickname ?? "").trim();
    if (!isCivLocationNickname(nick)) continue;
    const key = normalizeTitle(nick);
    (index[key] ??= []).push({
      source,
      imageURL: obj.CustomImage.ImageURL ?? "",
      ancestry,
    });
  }
  return index;
}

export function extractCivilisationTokens(
  root: unknown,
  source: string,
): TTSCivilisationToken[] {
  const tokens: TTSCivilisationToken[] = [];
  const walkTokens = (obj: unknown, ancestry: string[]) => {
    if (!isRecord(obj)) return;

    if (obj.Name === "Custom_Tile" && isRecord(obj.CustomImage)) {
      const imageURL = text(obj.CustomImage.ImageURL);
      const imageSecondaryURL = text(obj.CustomImage.ImageSecondaryURL);
      if (imageURL === CIVILISATION_TOKEN_FACE_URL && imageSecondaryURL) {
        const candidate = civilisationTokenFor(
          obj,
          source,
          imageURL,
          imageSecondaryURL,
          ancestry,
        );
        const existing = tokens.find((token) =>
          isSameCivilisationToken(token, candidate),
        );
        if (existing) {
          addToLocations(existing.locations, ancestry);
        } else {
          tokens.push(candidate);
        }
      }
    }

    const nick = typeof obj.Nickname === "string" ? obj.Nickname.trim() : "";
    const childAncestry = nick ? [...ancestry, nick] : ancestry;
    const states = obj.ObjectStates;
    if (Array.isArray(states))
      for (const s of states) walkTokens(s, childAncestry);
    const contained = (obj as TTSContainer).ContainedObjects;
    if (Array.isArray(contained))
      for (const s of contained) walkTokens(s, childAncestry);
  };

  walkTokens(root, []);
  return tokens.sort(compareCivilisationTokens);
}

export function extractBoards(root: unknown, source: string): BoardIndex {
  const boards: TTSBoard[] = [];

  const walkBoards = (obj: unknown, ancestry: string[]) => {
    if (!isRecord(obj)) return;

    if (isBoardCandidate(obj)) {
      const board = boardFor(obj, source, ancestry);
      if (board) boards.push(board);
    }

    const nick = typeof obj.Nickname === "string" ? obj.Nickname.trim() : "";
    const childAncestry = nick ? [...ancestry, nick] : ancestry;
    const states = obj.ObjectStates;
    if (Array.isArray(states))
      for (const s of states) walkBoards(s, childAncestry);
    const contained = (obj as TTSContainer).ContainedObjects;
    if (Array.isArray(contained))
      for (const s of contained) walkBoards(s, childAncestry);
  };

  walkBoards(root, []);
  return boards.sort((a, b) => a.terrain.localeCompare(b.terrain));
}

export function extractSiteMonsters(
  root: unknown,
  source: string,
): SiteMonsterIndex {
  type SiteMonsterChipInfo = {
    group: string;
    imageURL: string;
    imageSecondaryURL: string;
  };
  const chipsByGuid = new Map<string, SiteMonsterChipInfo>();
  const chipsByGroup = new Map<string, SiteMonsterChipInfo[]>();
  const index: SiteMonsterIndex = {};
  const objects: Record<string, unknown>[] = [];

  collectObjects(root, objects);
  for (const obj of objects) {
    const guid = text(obj.GUID);
    if (!guid) continue;
    const luaScript = text(obj.LuaScript);
    const gmNotes = text(obj.GMNotes);
    if (gmNotes && luaScript.startsWith("chipName =")) {
      const customImage = isRecord(obj.CustomImage) ? obj.CustomImage : {};
      const chipInfo = {
        group: prettifyChipName(gmNotes),
        imageURL: text(customImage.ImageURL),
        imageSecondaryURL: text(customImage.ImageSecondaryURL),
      };
      chipsByGuid.set(guid, chipInfo);
      const bucket = chipsByGroup.get(chipInfo.group) ?? [];
      bucket.push(chipInfo);
      chipsByGroup.set(chipInfo.group, bucket);
    }
  }

  for (const obj of objects) {
    const siteName = siteMonsterSourceName(obj);
    if (!siteName) continue;
    const guardian = guardianFunctionBody(text(obj.LuaScript));
    if (!guardian) continue;

    const override = siteMonsterOverride(siteName, source, chipsByGroup);
    if (override) {
      (index[siteName] ??= []).push(override);
      continue;
    }

    const groups = new Map<
      string,
      { monsters: string[]; monsterChips: TTSSiteMonsterChip[] }
    >();
    for (const match of guardian.matchAll(
      /\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*getObjectFromGUID\("([0-9a-f]{6})"\)/g,
    )) {
      const variable = match[1];
      if (variable === "Black1") continue;
      const guid = match[2];
      const chip = chipsByGuid.get(guid);
      const chipName = chip?.group;
      const monsterName = monsterNameForGuardianVariable(variable, chipName);
      const group = groupNameForGuardianVariable(variable, chipName);
      const bucket = groups.get(group) ?? { monsters: [], monsterChips: [] };
      bucket.monsters.push(monsterName);
      bucket.monsterChips.push(siteMonsterChipFor(monsterName, chip));
      groups.set(group, bucket);
    }

    const entries = [...groups.entries()]
      .map(([group, { monsters, monsterChips }]) => ({
        source,
        group,
        monsters,
        monsterChips,
      }))
      .sort((a, b) => a.group.localeCompare(b.group));
    if (entries.length > 0) (index[siteName] ??= []).push(...entries);
  }

  return Object.fromEntries(
    Object.entries(index).sort(([a], [b]) => a.localeCompare(b)),
  );
}

export function extractMapTileMonsters(
  root: unknown,
  source: string,
): MapTileMonsterIndex {
  const clearingOffsets = extractClearingOffsets(root);
  const index: MapTileMonsterIndex = {};

  const walkTiles = (obj: unknown, ancestors: MapTileAncestor[]) => {
    if (!isRecord(obj)) return;

    const tile = mapTileFor(obj, ancestors, clearingOffsets);
    if (tile) {
      const luaScript = text(obj.LuaScript);
      const wandering = monsterGroupsFromLuaFunction(luaScript, "setupW");
      const local = monsterGroupsFromLuaFunction(luaScript, "setupL");
      if (wandering.length > 0 || local.length > 0) {
        (index[tile.name] ??= []).push({
          source,
          terrain: tile.terrain,
          wandering,
          local,
        });
      }
    }

    const nextAncestors = [...ancestors, ancestorForMapTile(obj)];
    const states = obj.ObjectStates;
    if (Array.isArray(states)) {
      for (const child of states) walkTiles(child, nextAncestors);
    }
    const contained = (obj as TTSContainer).ContainedObjects;
    if (Array.isArray(contained)) {
      for (const child of contained) walkTiles(child, nextAncestors);
    }
  };

  walkTiles(root, []);
  return Object.fromEntries(
    Object.entries(index).sort(([a], [b]) => a.localeCompare(b)),
  );
}

export function extractNativeSummons(
  root: unknown,
  source: string,
): NativeSummonIndex {
  const objects: Record<string, unknown>[] = [];
  collectObjects(root, objects);
  const chipsByGuid = chipInfoByGuid(objects);
  const index: NativeSummonIndex = {};

  const rootLua = isRecord(root) ? text(root.LuaScript) : "";
  const nativeGroups = nativeGroupsFromRootLua(rootLua, chipsByGuid, source);
  const nativeGroupsByGroup = new Map(
    nativeGroups.map((group) => [group.group, group]),
  );
  if (nativeGroups.length > 0) index["Native Setup"] = nativeGroups;

  for (const obj of objects) {
    const locationName = text(obj.Nickname);
    if (!locationName) continue;
    const groups = nativeGroupsFromSetupLua(
      text(obj.LuaScript),
      chipsByGuid,
      source,
    );
    addNativeSummonGroups(index, locationName, groups);
  }

  for (const obj of objects) {
    const locationName = text(obj.Nickname);
    if (!locationName) continue;
    const groups = nativeGroupsFromSummonNativesLua(
      text(obj.LuaScript),
      nativeGroupsByGroup,
    );
    addNativeSummonGroups(index, locationName, groups);
  }

  return Object.fromEntries(
    Object.entries(index).sort(([a], [b]) => a.localeCompare(b)),
  );
}

export function extractNatives(root: unknown, source: string): NativeIndex {
  const objects: Record<string, unknown>[] = [];
  collectObjects(root, objects);
  const chipsByGuid = chipInfoByGuid(objects);
  const rootLua = isRecord(root) ? text(root.LuaScript) : "";
  const nativeGroups = nativeGroupsFromRootLua(rootLua, chipsByGuid, source);
  const civilisationCards = nativeCivilisationCards(root, source);
  const index: NativeIndex = {};

  for (const group of nativeGroups) {
    const card = civilisationCards.get(normalizeTitle(group.group));
    index[group.group] = [
      {
        ...group,
        natives: [...group.natives],
        nativeChips: group.nativeChips.map((chip) => ({ ...chip })),
        ...(card ? { civilisationCard: card } : {}),
      },
    ];
  }

  return Object.fromEntries(
    Object.entries(index).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function nativeCivilisationCards(
  root: unknown,
  source: string,
): Map<string, TTSCardImage> {
  const cards: CardWithAncestry[] = [];
  walk(root, [], cards);
  const index = new Map<string, TTSCardImage>();
  for (const { card, ancestry } of cards) {
    const image = imageFor(card, source, ancestry);
    if (!image || image.faceURL !== CIVILISATION_REFERENCE_CARD_FACE_URL) {
      continue;
    }
    const name = nativeCivilisationCardName(card, image);
    if (!name || !NATIVE_CIVILISATION_CARD_NAMES.has(normalizeTitle(name))) {
      continue;
    }
    const key = normalizeTitle(name);
    if (!index.has(key)) index.set(key, image);
  }
  return index;
}

const NATIVE_CIVILISATION_CARD_NAMES = new Set(
  [
    "Aurorans",
    "Bashkirs",
    "Consul",
    "Dwarves",
    "Elves",
    "Knights",
    "Mariners",
    "Nomads",
    "Priests",
    "Rogues",
    "Sellswords",
    "Soldiers",
    "Villagers",
    "Wardens",
    "Watch",
  ].map(normalizeTitle),
);

const NATIVE_CIVILISATION_CARD_NAMES_BY_CELL: Record<string, string> = {
  "0:1": "Aurorans",
  "1:1": "Priests",
  "1:6": "Villagers",
  "1:7": "Wardens",
  "1:8": "Watch",
};

function nativeCivilisationCardName(
  card: TTSCardObject,
  image: TTSCardImage,
): string {
  const raw = text(card.Nickname).replace(/^The\s+/i, "");
  return (
    raw ||
    NATIVE_CIVILISATION_CARD_NAMES_BY_CELL[`${image.row}:${image.col}`] ||
    ""
  );
}

function monsterGroupsFromLuaFunction(
  luaScript: string,
  functionName: string,
): string[] {
  const body = luaFunctionBody(luaScript, functionName);
  const groups = new Set<string>();
  for (const match of body.matchAll(/\bmBags\s*\[\s*"([^"]+)"\s*\]/g)) {
    groups.add(prettifyChipName(match[1]));
  }
  return [...groups];
}

type ChipInfo = {
  group: string;
  imageURL: string;
  imageSecondaryURL: string;
};

function chipInfoByGuid(
  objects: Record<string, unknown>[],
): Map<string, ChipInfo> {
  const chipsByGuid = new Map<string, ChipInfo>();
  for (const obj of objects) {
    const guid = text(obj.GUID);
    if (!guid) continue;
    const luaScript = text(obj.LuaScript);
    const gmNotes = text(obj.GMNotes);
    if (!gmNotes || !luaScript.startsWith("chipName =")) continue;
    const customImage = isRecord(obj.CustomImage) ? obj.CustomImage : {};
    chipsByGuid.set(guid, {
      group: prettifyChipName(gmNotes),
      imageURL: text(customImage.ImageURL),
      imageSecondaryURL: text(customImage.ImageSecondaryURL),
    });
  }
  return chipsByGuid;
}

function nativeGroupsFromRootLua(
  luaScript: string,
  chipsByGuid: Map<string, ChipInfo>,
  source: string,
): TTSNativeSummonGroup[] {
  const table = luaTableBody(luaScript, "nativeGroups");
  if (!table) return [];
  const groups: TTSNativeSummonGroup[] = [];
  for (const groupMatch of table.matchAll(
    /\b([a-z]+)\s*=\s*\{([\s\S]*?)\n\s*\},/g,
  )) {
    const group = prettifyChipName(groupMatch[1]);
    const natives: string[] = [];
    const nativeChips: TTSNativeChip[] = [];
    for (const chipMatch of groupMatch[2].matchAll(
      /"([0-9a-f]{6})"\s*,?\s*--\s*([^\n\r]+)/g,
    )) {
      const guid = chipMatch[1];
      const chip = chipsByGuid.get(guid);
      const name = nativeNameForLabel(chipMatch[2], group);
      natives.push(name);
      nativeChips.push(nativeChipFor(name, chip));
    }
    if (natives.length > 0)
      groups.push({ source, group, natives, nativeChips });
  }
  return groups.sort((a, b) => a.group.localeCompare(b.group));
}

function nativeGroupsFromSetupLua(
  luaScript: string,
  chipsByGuid: Map<string, ChipInfo>,
  source: string,
): TTSNativeSummonGroup[] {
  const groups = new Map<
    string,
    { seen: Set<string>; nativeChips: TTSNativeChip[] }
  >();
  for (const functionMatch of luaScript.matchAll(
    /function\s+setup[A-Z][A-Za-z]+\(clearing,\s*rotation\)([\s\S]*?)(?=\nfunction\s|$)/g,
  )) {
    for (const match of functionMatch[1].matchAll(
      /\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*getObjectFromGUID\("([0-9a-f]{6})"\)/g,
    )) {
      const variable = match[1];
      const guid = match[2];
      const chip = chipsByGuid.get(guid);
      if (!chip) continue;
      const bucket = groups.get(chip.group) ?? {
        seen: new Set<string>(),
        nativeChips: [],
      };
      if (bucket.seen.has(guid)) continue;
      const name = nativeNameForLabel(variable, chip.group);
      bucket.seen.add(guid);
      bucket.nativeChips.push(nativeChipFor(name, chip));
      groups.set(chip.group, bucket);
    }
  }
  return [...groups.entries()]
    .map(([group, { nativeChips }]) => {
      const sortedChips = sortNativeChips(nativeChips);
      return {
        source,
        group,
        natives: sortedChips.map((chip) => chip.name),
        nativeChips: sortedChips,
      };
    })
    .sort((a, b) => a.group.localeCompare(b.group));
}

function nativeGroupsFromSummonNativesLua(
  luaScript: string,
  nativeGroupsByGroup: Map<string, TTSNativeSummonGroup>,
): TTSNativeSummonGroup[] {
  const body = luaFunctionBody(luaScript, "summonNatives");
  if (!body) return [];
  const groups = new Map<string, TTSNativeSummonGroup>();
  for (const match of body.matchAll(/\bgroup\s*=\s*"([^"]+)"/g)) {
    const group = prettifyChipName(match[1]);
    const entry = nativeGroupsByGroup.get(group);
    if (!entry || groups.has(group)) continue;
    groups.set(group, {
      ...entry,
      natives: [...entry.natives],
      nativeChips: entry.nativeChips.map((chip) => ({ ...chip })),
    });
  }
  return [...groups.values()].sort((a, b) => a.group.localeCompare(b.group));
}

function addNativeSummonGroups(
  index: NativeSummonIndex,
  locationName: string,
  groups: TTSNativeSummonGroup[],
): void {
  if (groups.length === 0) return;
  const bucket = (index[locationName] ??= []);
  for (const group of groups) {
    if (bucket.some((existing) => existing.group === group.group)) continue;
    bucket.push(group);
  }
  bucket.sort((a, b) => a.group.localeCompare(b.group));
}

function sortNativeChips(chips: TTSNativeChip[]): TTSNativeChip[] {
  return chips
    .map((chip, index) => ({ chip, index }))
    .sort(
      (a, b) =>
        nativeSortValue(a.chip.name) - nativeSortValue(b.chip.name) ||
        a.index - b.index,
    )
    .map(({ chip }) => chip);
}

function nativeSortValue(name: string): number {
  if (/\bleader\b/i.test(name)) return 0;
  const match = name.match(/\b(\d+)$/);
  if (match) return Number(match[1]);
  return 1000;
}

function nativeChipFor(
  name: string,
  chip: ChipInfo | undefined,
): TTSNativeChip {
  if (!chip) return { name };
  return {
    name,
    imageURL: chip.imageURL,
    imageSecondaryURL: chip.imageSecondaryURL,
  };
}

function nativeNameForLabel(label: string, group: string): string {
  const trimmed = label.trim();
  if (/^\d+$/.test(trimmed) || /^leader$/i.test(trimmed)) {
    return `${group} ${prettifyNativeLabel(trimmed)}`;
  }
  return prettifyNativeLabel(trimmed);
}

function prettifyNativeLabel(label: string): string {
  return prettifyChipName(label.replace(/([A-Za-z])(\d+)/g, "$1 $2"));
}

function luaTableBody(luaScript: string, tableName: string): string {
  const start = luaScript.indexOf(`${tableName} = {`);
  if (start < 0) return "";
  let depth = 0;
  for (let i = start; i < luaScript.length; i++) {
    const ch = luaScript[i];
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return luaScript.slice(start, i + 1);
    }
  }
  return "";
}

function collectObjects(obj: unknown, out: Record<string, unknown>[]): void {
  if (!isRecord(obj)) return;
  out.push(obj);
  const states = obj.ObjectStates;
  if (Array.isArray(states))
    for (const state of states) collectObjects(state, out);
  const contained = (obj as TTSContainer).ContainedObjects;
  if (Array.isArray(contained))
    for (const child of contained) collectObjects(child, out);
  const objectStates = obj.States;
  if (isRecord(objectStates)) {
    for (const state of Object.values(objectStates)) collectObjects(state, out);
  }
}

function siteMonsterSourceName(obj: Record<string, unknown>): string {
  if (!isRecord(obj.CustomImage)) return "";
  const imageURL = text(obj.CustomImage.ImageURL);
  if (imageURL === SITE_FACE_URL) return text(obj.Nickname);
  return WILDERNESS_TOKEN_FRONT_METADATA[imageURL]?.name ?? "";
}

function siteMonsterOverride(
  siteName: string,
  source: string,
  chipsByGroup: Map<
    string,
    { group: string; imageURL: string; imageSecondaryURL: string }[]
  >,
): TTSSiteMonsterGroup | null {
  if (siteName !== "Lost Battalion") return null;
  const group = "Lost Battalion";
  const chips = chipsByGroup.get(group) ?? [];
  return {
    source,
    group,
    monsters: [group],
    monsterChips:
      chips.length > 0
        ? chips.map((chip) => siteMonsterChipFor(group, chip))
        : [{ name: group }],
  };
}

function siteMonsterChipFor(
  name: string,
  chip: { imageURL: string; imageSecondaryURL: string } | undefined,
): TTSSiteMonsterChip {
  if (!chip) return { name };
  return {
    name,
    imageURL: chip.imageURL,
    imageSecondaryURL: chip.imageSecondaryURL,
  };
}

function guardianFunctionBody(luaScript: string): string {
  return luaFunctionBody(luaScript, "guardian");
}

function luaFunctionBody(luaScript: string, functionName: string): string {
  const start = luaScript.indexOf(`function ${functionName}`);
  if (start < 0) return "";
  const end = luaScript.indexOf("\nfunction ", start + 1);
  return luaScript.slice(start, end < 0 ? luaScript.length : end);
}

function monsterNameForGuardianVariable(
  variable: string,
  chipName: string | undefined,
): string {
  if (isGenericGuardianVariable(variable))
    return chipName ?? prettifyChipName(variable);
  return prettifyGuardianVariable(variable);
}

function groupNameForGuardianVariable(
  variable: string,
  chipName: string | undefined,
): string {
  if (chipName && !isGenericGuardianVariable(variable)) return chipName;
  if (!chipName && !isGenericGuardianVariable(variable)) {
    return prettifyGuardianVariable(variable).split(" ")[0];
  }
  return monsterNameForGuardianVariable(variable, chipName);
}

function isGenericGuardianVariable(variable: string): boolean {
  return /^Guardian\d*$/i.test(variable);
}

function prettifyGuardianVariable(variable: string): string {
  return prettifyChipName(variable.replace(/\d+$/g, ""));
}

function isBoardCandidate(obj: Record<string, unknown>): boolean {
  return (
    obj.Name === "Custom_Tile" &&
    isRecord(obj.CustomImage) &&
    ((Array.isArray(obj.Tags) && obj.Tags.includes("side1")) ||
      singleSiteBoardName(text(obj.GMNotes)) !== "")
  );
}

function boardFor(
  obj: Record<string, unknown>,
  source: string,
  ancestry: string[],
): TTSBoard | null {
  const image = obj.CustomImage as Record<string, unknown>;
  const imageURL = text(image.ImageURL);
  if (!imageURL) return null;

  const merchants = merchantNamesFromBoardLua(text(obj.LuaScript));
  const singleSite = singleSiteBoardName(text(obj.GMNotes));
  const sites = singleSite
    ? [singleSite]
    : (SETUP_CARD_PRINTED_SITES_BY_IMAGE_URL[imageURL] ?? []);
  if (merchants.length === 0 && sites.length === 0) return null;

  const terrain = terrainPackForAncestry(ancestry) || "Neutral";
  const imageSecondaryURL =
    text(image.ImageSecondaryURL) || stateTwoImageURL(obj) || "";
  return {
    source,
    terrain,
    imageURL,
    imageSecondaryURL,
    merchants,
    sites,
  };
}

function singleSiteBoardName(gmNotes: string): string {
  const match = gmNotes.match(/^Setup (Battlefield|Grove|Grobe) 1$/i);
  if (!match) return "";
  return match[1].toLowerCase() === "battlefield" ? "Battlefield" : "Grove";
}

function merchantNamesFromBoardLua(luaScript: string): string[] {
  return [
    ...new Set(
      [...luaScript.matchAll(/\b[a-z_]*merc\s*=\s*"([^"]+)"/g)].map((match) =>
        match[1].trim(),
      ),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

function stateTwoImageURL(obj: Record<string, unknown>): string {
  const states = obj.States;
  if (!isRecord(states)) return "";
  const stateTwo = states["2"];
  if (!isRecord(stateTwo) || !isRecord(stateTwo.CustomImage)) return "";
  return text(stateTwo.CustomImage.ImageURL);
}

const SETUP_CARD_PRINTED_SITES_BY_IMAGE_URL: Record<string, string[]> = {
  "https://steamusercontent-a.akamaihd.net/ugc/2323363479518849040/26D7E5834ED773BD8179A21C5D4B5EC2886A9F89/":
    ["Altar", "Catacombs", "Trove"],
  "https://steamusercontent-a.akamaihd.net/ugc/15429035261550998634/62807FE48E734542B1C7C08EEA7F4EB454EA110E/":
    ["Mausoleum", "Terrace", "Tomb", "Ziggurat"],
  "https://steamusercontent-a.akamaihd.net/ugc/2323363479519039329/41E3FD0F7E9C8A95B83A525FC80B0919F23D3563/":
    ["Chamber", "Crypt", "Hoard"],
  "https://steamusercontent-a.akamaihd.net/ugc/2323363479519118348/443D7796425167A331EC30CB6EB39F7881BA543F/":
    ["Monolith", "Wrecked Wagons"],
  "https://steamusercontent-a.akamaihd.net/ugc/16948278958954043783/FC338D6BDE29FE6BD3D2EB5E3CFD64D0E82F59F5/":
    ["Abyss", "Tarn", "Wreck"],
  "https://steamusercontent-a.akamaihd.net/ugc/2323363479519120254/77809A8879191279ADBE84BC48A9E12C272548A7/":
    ["Grotto", "Hideout", "Lost Battalion"],
  "https://steamusercontent-a.akamaihd.net/ugc/2323363479519043888/1148228148CCCE332A638EBED6176E9AE6129254/":
    ["Secret Cache", "Shrine"],
};

function civilisationTokenFor(
  obj: Record<string, unknown>,
  source: string,
  imageURL: string,
  imageSecondaryURL: string,
  ancestry: string[],
): TTSCivilisationToken {
  const token: TTSCivilisationToken = {
    source,
    imageURL,
    imageSecondaryURL,
    locations: [{ ancestry, count: 1 }],
  };
  const gmNotes = text(obj.GMNotes);
  const name = text(obj.Description);
  const attribute = attributeFromCivilisationTokenNickname(text(obj.Nickname));
  const terrain = terrainPackForAncestry(ancestry);
  if (gmNotes) token.gmNotes = gmNotes;
  if (name) token.name = name;
  if (attribute) token.attribute = attribute;
  if (terrain) token.terrain = terrain;
  return token;
}

function attributeFromCivilisationTokenNickname(nickname: string): string {
  return nickname.match(/\(([^)]+)\)\s*$/)?.[1]?.trim() ?? "";
}

function terrainPackForAncestry(ancestry: string[]): string {
  for (const nickname of ancestry) {
    const terrain = terrainPackForNickname(nickname);
    if (terrain) return terrain;
  }
  return "";
}

function isSameCivilisationToken(
  a: TTSCivilisationToken,
  b: TTSCivilisationToken,
): boolean {
  return (
    a.imageURL === b.imageURL &&
    a.imageSecondaryURL === b.imageSecondaryURL &&
    a.gmNotes === b.gmNotes &&
    a.name === b.name &&
    a.attribute === b.attribute &&
    a.terrain === b.terrain
  );
}

function compareCivilisationTokens(
  a: TTSCivilisationToken,
  b: TTSCivilisationToken,
): number {
  return (
    (a.terrain ?? "").localeCompare(b.terrain ?? "") ||
    (a.gmNotes ?? "").localeCompare(b.gmNotes ?? "") ||
    (a.name ?? "").localeCompare(b.name ?? "") ||
    (a.attribute ?? "").localeCompare(b.attribute ?? "") ||
    a.imageSecondaryURL.localeCompare(b.imageSecondaryURL)
  );
}

export function extractMapTiles(root: unknown): TTSMapTile[] {
  const clearingOffsets = extractClearingOffsets(root);
  const tiles: TTSMapTile[] = [];
  walkMapTiles(root, [], clearingOffsets, tiles);
  return tiles.sort(
    (a, b) =>
      a.terrain.localeCompare(b.terrain) || a.name.localeCompare(b.name),
  );
}

/**
 * Walk a TTS save and return wilderness tokens, identified by the terrain pack
 * back image in `CustomImage.ImageSecondaryURL`. Most of these tiles have no
 * stable nickname, so entries are keyed by terrain and de-duped by URL pair.
 */
export function extractWildernessTokens(
  root: unknown,
  source: string,
): WildernessTokenIndex {
  const terrainByBackUrl = new Map(
    Object.entries(WILDERNESS_TOKEN_BACK_URLS).map(([terrain, url]) => [
      url,
      terrain,
    ]),
  );
  const index: WildernessTokenIndex = {};

  const walkTokens = (obj: unknown, ancestry: string[]) => {
    if (!isRecord(obj)) return;

    if (obj.Name === "Custom_Tile" && isRecord(obj.CustomImage)) {
      const imageURL = text(obj.CustomImage.ImageURL);
      const imageSecondaryURL = text(obj.CustomImage.ImageSecondaryURL);
      const terrain = terrainByBackUrl.get(imageSecondaryURL);
      if (terrain && imageURL) {
        const bucket = (index[terrain] ??= []);
        const existing = bucket.find(
          (token) =>
            token.imageURL === imageURL &&
            token.imageSecondaryURL === imageSecondaryURL,
        );
        const nickname = text(obj.Nickname);
        const metadata = wildernessTokenMetadataFor(imageURL);
        if (existing) {
          applyWildernessTokenMetadata(existing, metadata);
          addToLocations(existing.locations, ancestry);
          addNickname(existing, nickname);
        } else {
          const entry: TTSWildernessToken = {
            source,
            terrain,
            imageURL,
            imageSecondaryURL,
            locations: [{ ancestry, count: 1 }],
          };
          applyWildernessTokenMetadata(entry, metadata);
          addNickname(entry, nickname);
          bucket.push(entry);
        }
      }
    }

    const nick = typeof obj.Nickname === "string" ? obj.Nickname.trim() : "";
    const childAncestry = nick ? [...ancestry, nick] : ancestry;
    const states = obj.ObjectStates;
    if (Array.isArray(states))
      for (const s of states) walkTokens(s, childAncestry);
    const contained = (obj as TTSContainer).ContainedObjects;
    if (Array.isArray(contained))
      for (const s of contained) walkTokens(s, childAncestry);
  };

  walkTokens(root, []);
  for (const bucket of Object.values(index)) {
    bucket.sort(
      (a, b) =>
        (a.name ?? a.nicknames?.[0] ?? "").localeCompare(
          b.name ?? b.nicknames?.[0] ?? "",
        ) ||
        (a.clearing ?? 0) - (b.clearing ?? 0) ||
        String(a.draw ?? "").localeCompare(String(b.draw ?? "")) ||
        a.imageURL.localeCompare(b.imageURL),
    );
  }
  return index;
}

function applyWildernessTokenMetadata(
  token: TTSWildernessToken,
  metadata: WildernessTokenMetadata | undefined,
): void {
  if (!metadata) return;
  token.name = metadata.name;
  if (metadata.clearing !== undefined) token.clearing = metadata.clearing;
  if (metadata.draw !== undefined) token.draw = metadata.draw;
}

function wildernessTokenMetadataFor(
  imageURL: string,
): WildernessTokenMetadata | undefined {
  const exact = WILDERNESS_TOKEN_FRONT_METADATA[imageURL];
  if (exact) return exact;

  const imageHash = steamImageHash(imageURL);
  if (!imageHash) return undefined;
  return Object.entries(WILDERNESS_TOKEN_FRONT_METADATA).find(
    ([url]) => steamImageHash(url) === imageHash,
  )?.[1];
}

function steamImageHash(url: string): string {
  return url.split("/").filter(Boolean).at(-1) ?? "";
}

function addNickname(token: TTSWildernessToken, nickname: string): void {
  if (!nickname) return;
  const nicknames = (token.nicknames ??= []);
  if (!nicknames.includes(nickname)) nicknames.push(nickname);
  nicknames.sort((a, b) => a.localeCompare(b));
}

function isCivLocationNickname(nick: string): boolean {
  if (!nick) return false;
  // Reject token-shaped names: "5 Gold", "1 Legend Point", "Cunning Token", ...
  if (/^\d/.test(nick)) return false;
  if (/\bToken\b/i.test(nick)) return false;
  return true;
}

type MapTileAncestor = {
  name?: string;
  nickname?: string;
};

function walkMapTiles(
  obj: unknown,
  ancestors: MapTileAncestor[],
  clearingOffsets: Map<string, { x: number; y: number }[]>,
  out: TTSMapTile[],
): void {
  if (!isRecord(obj)) return;

  const tile = mapTileFor(obj, ancestors, clearingOffsets);
  if (tile) out.push(tile);

  const nextAncestors = [...ancestors, ancestorForMapTile(obj)];
  const states = obj.ObjectStates;
  if (Array.isArray(states)) {
    for (const child of states) {
      walkMapTiles(child, nextAncestors, clearingOffsets, out);
    }
  }
  const contained = (obj as TTSContainer).ContainedObjects;
  if (Array.isArray(contained)) {
    for (const child of contained) {
      walkMapTiles(child, nextAncestors, clearingOffsets, out);
    }
  }
}

function mapTileFor(
  obj: Record<string, unknown>,
  ancestors: MapTileAncestor[],
  clearingOffsets: Map<string, { x: number; y: number }[]>,
): TTSMapTile | null {
  if (obj.Name !== "Custom_Tile") return null;

  const guid = text(obj.GUID);
  const clearings = clearingOffsets.get(guid);
  if (!clearings) return null;

  const customImage = obj.CustomImage;
  if (!isRecord(customImage)) return null;
  const customTile = customImage.CustomTile;
  if (!isRecord(customTile) || customTile.Type !== 1) return null;

  const parentBag = [...ancestors]
    .reverse()
    .find((ancestor) => ancestor.name === "Bag" && ancestor.nickname);
  if (!parentBag?.nickname) return null;

  const name = text(obj.Nickname);
  const imageUrl = text(customImage.ImageURL);
  const imageSecondaryUrl = text(customImage.ImageSecondaryURL);
  if (!guid || !name || !imageUrl || !imageSecondaryUrl) return null;

  return {
    name,
    terrain: terrainForMapTile(parentBag.nickname),
    imageUrl,
    imageSecondaryUrl,
    clearings,
  };
}

function extractClearingOffsets(
  root: unknown,
): Map<string, { x: number; y: number }[]> {
  if (!isRecord(root)) return new Map();
  const luaScript = text(root.LuaScript);
  const offsets = new Map<string, { x: number; y: number }[]>();
  const tableEntry = /\["([0-9a-f]{6})"\]\s*=\s*\{([\s\S]*?)\}\s*,?\s*--/g;
  const coordinate =
    /\{\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\}/g;

  let entry: RegExpExecArray | null;
  while ((entry = tableEntry.exec(luaScript))) {
    const [, guid, body] = entry;
    const clearings: { x: number; y: number }[] = [];
    let match: RegExpExecArray | null;
    while ((match = coordinate.exec(body))) {
      clearings.push({
        x: Number(match[1]),
        y: Number(match[3]),
      });
    }
    if (clearings.length > 0) offsets.set(guid, clearings);
  }

  return offsets;
}

function terrainForMapTile(parentNickname: string): string {
  return terrainPackForNickname(parentNickname) ?? parentNickname;
}

function terrainPackForNickname(nickname: string): string | undefined {
  switch (nickname) {
    case "Cruel CAVES":
      return "Cruel Caves";
    case "Dreadful DESERTS":
    case "Oasis":
      return "Dreadful Deserts";
    case "Malevolent MOUNTAINS":
      return "Malevolent Mountains";
    case "Perilous PLAINS":
      return "Perilous Plains";
    case "Riverlands Tiles":
    case "Ruthless RIVERLANDS":
    case "Headwaters Tile":
      return "Ruthless Riverlands";
    case "Sinister SWAMPS":
      return "Sinister Swamps";
    case "Wicked WOODS":
      return "Wicked Woods";
    default:
      return undefined;
  }
}

function ancestorForMapTile(obj: Record<string, unknown>): MapTileAncestor {
  return {
    name: text(obj.Name) || undefined,
    nickname: text(obj.Nickname) || undefined,
  };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function walkChips(
  obj: unknown,
  ancestry: string[],
  out: ChipWithAncestry[],
): void {
  if (!isRecord(obj)) return;
  const ls = obj.LuaScript;
  if (
    typeof ls === "string" &&
    ls.startsWith("chipName =") &&
    isRecord(obj.CustomImage)
  ) {
    out.push({ chip: obj as unknown as ChipObject, ancestry });
  }
  const nick = typeof obj.Nickname === "string" ? obj.Nickname.trim() : "";
  const childAncestry = nick ? [...ancestry, nick] : ancestry;
  const states = obj.ObjectStates;
  if (Array.isArray(states))
    for (const s of states) walkChips(s, childAncestry, out);
  const contained = (obj as TTSContainer).ContainedObjects;
  if (Array.isArray(contained))
    for (const s of contained) walkChips(s, childAncestry, out);
}

/**
 * Walk the TTS tree depth-first, capturing each Card together with the
 * ancestry of nicknamed ancestors (outermost first). Any object whose
 * `Nickname` is non-empty contributes to the ancestry; Card's own Nickname
 * is not included (only its ancestors).
 */
function walk(obj: unknown, ancestry: string[], out: CardWithAncestry[]): void {
  if (!isRecord(obj)) return;
  if (
    (obj.Name === "Card" || obj.Name === "CardCustom") &&
    obj.CustomDeck &&
    typeof obj.CardID === "number"
  ) {
    out.push({ card: obj as unknown as TTSCardObject, ancestry });
  }
  const nick = typeof obj.Nickname === "string" ? obj.Nickname.trim() : "";
  const childAncestry = nick ? [...ancestry, nick] : ancestry;
  // ObjectStates is the top-level array; ContainedObjects is the nested one.
  const states = obj.ObjectStates;
  if (Array.isArray(states))
    for (const s of states) walk(s, childAncestry, out);
  const contained = (obj as TTSContainer).ContainedObjects;
  if (Array.isArray(contained))
    for (const s of contained) walk(s, childAncestry, out);
}

function walkTiles(
  obj: unknown,
  ancestry: string[],
  out: TileWithAncestry[],
): void {
  if (!isRecord(obj)) return;
  if (obj.Name === "Custom_Tile" && isRecord(obj.CustomImage)) {
    out.push({ tile: obj as unknown as TileObject, ancestry });
  }
  const nick = typeof obj.Nickname === "string" ? obj.Nickname.trim() : "";
  const childAncestry = nick ? [...ancestry, nick] : ancestry;
  const states = obj.ObjectStates;
  if (Array.isArray(states))
    for (const s of states) walkTiles(s, childAncestry, out);
  const contained = (obj as TTSContainer).ContainedObjects;
  if (Array.isArray(contained))
    for (const s of contained) walkTiles(s, childAncestry, out);
}

function imageFor(
  card: TTSCardObject,
  source: string,
  ancestry: string[],
): TTSCardImage | null {
  const deckId = Object.keys(card.CustomDeck)[0];
  if (!deckId) return null;
  const deck = card.CustomDeck[deckId];
  const index = card.CardID - Number.parseInt(deckId, 10) * 100;
  if (!Number.isFinite(index) || index < 0) return null;
  const out: TTSCardImage = {
    source,
    faceURL: deck.FaceURL,
    backURL: deck.BackURL,
    numWidth: deck.NumWidth,
    numHeight: deck.NumHeight,
    row: Math.floor(index / deck.NumWidth),
    col: index % deck.NumWidth,
    uniqueBack: Boolean(deck.UniqueBack),
  };
  if (Array.isArray(card.Tags) && card.Tags.length > 0) {
    out.tags = [...card.Tags].sort();
  }
  if (ancestry.length > 0) out.ancestry = ancestry;
  return out;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
