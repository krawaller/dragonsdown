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

/** Output written to data/tts/cards.json. Keyed by normalized `Nickname`. */
export type CardIndex = Record<string, TTSCardImage[]>;

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

/** Output written to data/tts/chips.json. Keyed by normalized `GMNotes`. */
export type ChipIndex = Record<string, TTSChip[]>;

export type TTSSiteMonsterGroup = {
  source: string;
  group: string;
  monsters: string[];
};

/** Output written to data/tts/site-monsters.json. Keyed by site/token name. */
export type SiteMonsterIndex = Record<string, TTSSiteMonsterGroup[]>;

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

/** Output written to data/tts/sites.json. Keyed by normalized `Nickname`. */
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

/** Output written to data/tts/civlocations.json. Keyed by normalized `Nickname`. */
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

/** Output written to data/tts/wilderness-tokens.json. Keyed by terrain name. */
export type WildernessTokenIndex = Record<string, TTSWildernessToken[]>;

/** Output written to data/tts/boards.json. */
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

/** Output written to data/tts/map-tile-monsters.json. Keyed by map tile name. */
export type MapTileMonsterIndex = Record<string, TTSMapTileMonsterGroup[]>;

/**
 * Turn a chip's raw GMNotes key into a display name. The mod's GMNotes are
 * mostly PascalCase (`AdultDragons` → `Adult Dragons`), with a handful of
 * lowercase ones (`aurorans` → `Aurorans`). We split at lower→upper
 * boundaries and then capitalize each word.
 */
export function prettifyChipName(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(
      /(^|\s)([a-z])/g,
      (_, sep: string, c: string) => sep + c.toUpperCase(),
    );
}

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
export function resolveCards(
  title: string,
  index: CardIndex,
  aliases: AliasMap,
): TTSCardImage[] {
  const key = normalizeTitle(title);
  const direct = index[key];
  if (direct?.length) return direct;
  const aliased = aliases[key];
  if (aliased === undefined) return [];
  const targets = Array.isArray(aliased) ? aliased : [aliased];
  const results: TTSCardImage[] = [];
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
  CardID: number;
  Tags?: string[];
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

export function isSameCell(a: TTSCardImage, b: TTSCardImage): boolean {
  return a.faceURL === b.faceURL && a.row === b.row && a.col === b.col;
}

export function mergeTags(
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
  const chipsByGuid = new Map<string, string>();
  const index: SiteMonsterIndex = {};
  const objects: Record<string, unknown>[] = [];

  collectObjects(root, objects);
  for (const obj of objects) {
    const guid = text(obj.GUID);
    if (!guid) continue;
    const luaScript = text(obj.LuaScript);
    const gmNotes = text(obj.GMNotes);
    if (gmNotes && luaScript.startsWith("chipName =")) {
      chipsByGuid.set(guid, prettifyChipName(gmNotes));
    }
  }

  for (const obj of objects) {
    const siteName = siteMonsterSourceName(obj);
    if (!siteName) continue;
    const guardian = guardianFunctionBody(text(obj.LuaScript));
    if (!guardian) continue;

    const override = siteMonsterOverride(siteName, source);
    if (override) {
      (index[siteName] ??= []).push(override);
      continue;
    }

    const groups = new Map<string, string[]>();
    for (const match of guardian.matchAll(
      /\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*getObjectFromGUID\("([0-9a-f]{6})"\)/g,
    )) {
      const variable = match[1];
      if (variable === "Black1") continue;
      const guid = match[2];
      const chipName = chipsByGuid.get(guid);
      const monsterName = monsterNameForGuardianVariable(variable, chipName);
      const group = groupNameForGuardianVariable(variable, chipName);
      const bucket = groups.get(group) ?? [];
      bucket.push(monsterName);
      groups.set(group, bucket);
    }

    const entries = [...groups.entries()]
      .map(([group, monsters]) => ({ source, group, monsters }))
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
): TTSSiteMonsterGroup | null {
  if (siteName !== "Lost Battalion") return null;
  return { source, group: "Lost Battalion", monsters: ["Lost Battalion"] };
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
