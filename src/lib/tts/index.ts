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

function isCivLocationNickname(nick: string): boolean {
  if (!nick) return false;
  // Reject token-shaped names: "5 Gold", "1 Legend Point", "Cunning Token", ...
  if (/^\d/.test(nick)) return false;
  if (/\bToken\b/i.test(nick)) return false;
  return true;
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
