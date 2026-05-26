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
};

/** Output written to data/tts/cards.json. Keyed by normalized `Nickname`. */
export type CardIndex = Record<string, TTSCardImage[]>;

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
  Name: "Card";
  Nickname?: string;
  CardID: number;
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
export function extractCards(root: unknown, source: string): CardIndex {
  const index: CardIndex = {};
  const cards: TTSCardObject[] = [];
  walk(root, cards);
  for (const card of cards) {
    const raw = (card.Nickname ?? "").trim();
    if (!raw) continue;
    const key = normalizeTitle(raw);
    const image = imageFor(card, source);
    if (!image) continue;
    const bucket = (index[key] ??= []);
    // De-duplicate within a source: same nickname can map to multiple physical
    // cards in TTS (e.g. multiple copies of the same card in a bag), but they
    // point at the same sheet cell. Keep only one entry per cell.
    if (!bucket.some((c) => isSameCell(c, image))) bucket.push(image);
  }
  return index;
}

function isSameCell(a: TTSCardImage, b: TTSCardImage): boolean {
  return (
    a.faceURL === b.faceURL &&
    a.row === b.row &&
    a.col === b.col
  );
}

function walk(obj: unknown, out: TTSCardObject[]): void {
  if (!isRecord(obj)) return;
  if (obj.Name === "Card" && obj.CustomDeck && typeof obj.CardID === "number") {
    out.push(obj as unknown as TTSCardObject);
  }
  // ObjectStates is the top-level array; ContainedObjects is the nested one.
  const states = obj.ObjectStates;
  if (Array.isArray(states)) for (const s of states) walk(s, out);
  const contained = (obj as TTSContainer).ContainedObjects;
  if (Array.isArray(contained)) for (const s of contained) walk(s, out);
}

function imageFor(card: TTSCardObject, source: string): TTSCardImage | null {
  const deckId = Object.keys(card.CustomDeck)[0];
  if (!deckId) return null;
  const deck = card.CustomDeck[deckId];
  const index = card.CardID - Number.parseInt(deckId, 10) * 100;
  if (!Number.isFinite(index) || index < 0) return null;
  return {
    source,
    faceURL: deck.FaceURL,
    backURL: deck.BackURL,
    numWidth: deck.NumWidth,
    numHeight: deck.NumHeight,
    row: Math.floor(index / deck.NumWidth),
    col: index % deck.NumWidth,
    uniqueBack: Boolean(deck.UniqueBack),
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
