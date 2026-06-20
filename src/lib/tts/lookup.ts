/**
 * Server-side lookup over the baked TTS indexes (cards and chips).
 *
 * Loaded once at module init (like RULEBOOKS); used by SectionView to decide
 * whether to render a "view card" button for a given section title.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { slugify } from "@/lib/slug";
import {
  normalizeTitle,
  prettifyChipName,
  resolveCards,
  type AliasMap,
  type TTSBoard,
  type CardIndex,
  type ChipIndex,
  type ClassIndex,
  type CivLocationIndex,
  type ItemIndex,
  type LegendaryLocationIndex,
  type LineageIndex,
  type MapTileMonsterIndex,
  type MissionIndex,
  type MissionKind,
  type MissionTerrainPack,
  type NativeIndex,
  type NativeSummonIndex,
  type SiteIndex,
  type SpellIndex,
  type TTSCardImage,
  type TTSChip,
  type TTSClass,
  type TTSClassSetupCube,
  type TTSItemCard,
  type TTSLegendaryLocation,
  type TTSLegendaryMonsterChip,
  type TTSLineage,
  type TTSMissionCard,
  type TTSMissionRewards,
  type TTSMapTile,
  type TTSTreasureCard,
  type TTSTreasureDeck,
  type TTSCivLocation,
  type TTSCivilisationToken,
  type TTSSpell,
  type TTSSiteMonsterGroup,
  type TTSSite,
  type TreasureIndex,
  type TTSWildernessToken,
  type WildernessTokenIndex,
} from ".";
import aliasesData from "./aliases.json";

const EXTRACTED_TTS_DIR = path.join(
  process.cwd(),
  "data",
  "extracted-from-tts",
);
const CARDS_FILE = path.join(EXTRACTED_TTS_DIR, "cards.json");
const CLASSES_FILE = path.join(EXTRACTED_TTS_DIR, "classes.json");
const LINEAGES_FILE = path.join(EXTRACTED_TTS_DIR, "lineages.json");
const SPELLS_FILE = path.join(EXTRACTED_TTS_DIR, "spells.json");
const CHIPS_FILE = path.join(EXTRACTED_TTS_DIR, "chips.json");
const ITEMS_FILE = path.join(EXTRACTED_TTS_DIR, "items.json");
const TREASURES_FILE = path.join(process.cwd(), "data", "treasures.json");
const LEGENDARY_LOCATIONS_FILE = path.join(
  EXTRACTED_TTS_DIR,
  "legendary-locations.json",
);
const SITES_FILE = path.join(EXTRACTED_TTS_DIR, "sites.json");
const CIVLOCS_FILE = path.join(EXTRACTED_TTS_DIR, "civlocations.json");
const WILDERNESS_TOKENS_FILE = path.join(
  EXTRACTED_TTS_DIR,
  "wilderness-tokens.json",
);
const CIVILISATION_TOKENS_FILE = path.join(
  EXTRACTED_TTS_DIR,
  "civilisation-tokens.json",
);
const BOARDS_FILE = path.join(EXTRACTED_TTS_DIR, "boards.json");
const SITE_MONSTERS_FILE = path.join(EXTRACTED_TTS_DIR, "site-monsters.json");
const MAP_TILE_MONSTERS_FILE = path.join(
  EXTRACTED_TTS_DIR,
  "map-tile-monsters.json",
);
const MAP_TILES_FILE = path.join(EXTRACTED_TTS_DIR, "map-tiles.json");
const NATIVE_SUMMONS_FILE = path.join(EXTRACTED_TTS_DIR, "native-summons.json");
const NATIVES_FILE = path.join(EXTRACTED_TTS_DIR, "natives.json");
const MISSIONS_FILE = path.join(EXTRACTED_TTS_DIR, "missions.json");
const MISSION_FEATURE_FILE = path.join(
  process.cwd(),
  "data",
  "manual",
  "mission-feature.json",
);
const MONSTER_CHIP_NAMES_FILE = path.join(
  process.cwd(),
  "data",
  "manual",
  "monster-chip-names.json",
);
const SPELL_CASTERS_FILE = path.join(
  process.cwd(),
  "data",
  "manual",
  "spell-casters.json",
);

export const CIVILISATION_TOKEN_NEUTRAL_TERRAIN = "Neutral";

let cachedCardIndex: CardIndex | null = null;
let cachedClassIndex: ClassIndex | null = null;
let cachedLineageIndex: LineageIndex | null = null;
let cachedSpellIndex: SpellIndex | null = null;
let cachedChipIndex: ChipIndex | null = null;
let cachedItemIndex: ItemIndex | null = null;
let cachedTreasureIndex: TreasureIndex | null = null;
let cachedLegendaryLocationIndex: LegendaryLocationIndex | null = null;
let cachedSiteIndex: SiteIndex | null = null;
let cachedCivLocIndex: CivLocationIndex | null = null;
let cachedWildernessTokenIndex: WildernessTokenIndex | null = null;
let cachedCivilisationTokenIndex: TTSCivilisationToken[] | null = null;
let cachedBoardIndex: TTSBoard[] | null = null;
let cachedSiteMonsterIndex: Record<string, TTSSiteMonsterGroup[]> | null = null;
let cachedMapTileMonsterIndex: MapTileMonsterIndex | null = null;
let cachedMapTiles: TTSMapTile[] | null = null;
let cachedNativeIndex: NativeIndex | null = null;
let cachedNativeSummonIndex: NativeSummonIndex | null = null;
let cachedMissionIndex: MissionIndex | null = null;
let cachedMissionFeatureIndex: Record<string, string | string[]> | null = null;
let cachedSpellCasters: Record<
  string,
  { front?: string[]; back?: string[] }
> | null = null;
let cachedManualMonsterChipNameIndex: ManualMonsterChipNameIndex | null = null;
let cachedAliases: AliasMap | null = null;

type ManualMonsterChipName = {
  name: string;
  imageURL: string;
  imageSecondaryURL?: string;
};

type ManualMonsterChipNameIndex = Record<string, ManualMonsterChipName[]>;

function getCardIndex(): CardIndex {
  if (cachedCardIndex !== null) return cachedCardIndex;
  cachedCardIndex = readJsonOrEmpty<CardIndex>(CARDS_FILE);
  return cachedCardIndex;
}

function getClassIndex(): ClassIndex {
  if (cachedClassIndex !== null) return cachedClassIndex;
  cachedClassIndex = readJsonOrEmpty<ClassIndex>(CLASSES_FILE);
  return cachedClassIndex;
}

function getLineageIndex(): LineageIndex {
  if (cachedLineageIndex !== null) return cachedLineageIndex;
  cachedLineageIndex = readJsonOrEmpty<LineageIndex>(LINEAGES_FILE);
  return cachedLineageIndex;
}

function getSpellIndex(): SpellIndex {
  if (cachedSpellIndex !== null) return cachedSpellIndex;
  cachedSpellIndex = readJsonOrEmpty<SpellIndex>(SPELLS_FILE);
  return cachedSpellIndex;
}

function getChipIndex(): ChipIndex {
  if (cachedChipIndex !== null) return cachedChipIndex;
  cachedChipIndex = readJsonOrEmpty<ChipIndex>(CHIPS_FILE);
  return cachedChipIndex;
}

function getItemIndex(): ItemIndex {
  if (cachedItemIndex !== null) return cachedItemIndex;
  cachedItemIndex = readJsonOrEmpty<ItemIndex>(ITEMS_FILE);
  return cachedItemIndex;
}

function getTreasureIndex(): TreasureIndex {
  if (cachedTreasureIndex !== null) return cachedTreasureIndex;
  cachedTreasureIndex = readJsonOrEmpty<TreasureIndex>(TREASURES_FILE);
  return cachedTreasureIndex;
}

function getLegendaryLocationIndex(): LegendaryLocationIndex {
  if (cachedLegendaryLocationIndex !== null)
    return cachedLegendaryLocationIndex;
  cachedLegendaryLocationIndex = readJsonOrEmpty<LegendaryLocationIndex>(
    LEGENDARY_LOCATIONS_FILE,
  );
  return cachedLegendaryLocationIndex;
}

function getSiteIndex(): SiteIndex {
  if (cachedSiteIndex !== null) return cachedSiteIndex;
  cachedSiteIndex = readJsonOrEmpty<SiteIndex>(SITES_FILE);
  return cachedSiteIndex;
}

function getCivLocationIndex(): CivLocationIndex {
  if (cachedCivLocIndex !== null) return cachedCivLocIndex;
  cachedCivLocIndex = readJsonOrEmpty<CivLocationIndex>(CIVLOCS_FILE);
  return cachedCivLocIndex;
}

function getWildernessTokenIndex(): WildernessTokenIndex {
  if (cachedWildernessTokenIndex !== null) return cachedWildernessTokenIndex;
  const data = readJsonOrEmpty<WildernessTokenIndex>(WILDERNESS_TOKENS_FILE);
  for (const [terrain, tokens] of Object.entries(data)) {
    for (const token of tokens) {
      if (!token.terrain) token.terrain = terrain;
    }
  }
  cachedWildernessTokenIndex = data;
  return cachedWildernessTokenIndex;
}

function getCivilisationTokenIndex(): TTSCivilisationToken[] {
  if (cachedCivilisationTokenIndex !== null)
    return cachedCivilisationTokenIndex;
  const data = readJsonOrEmpty<unknown>(CIVILISATION_TOKENS_FILE);
  cachedCivilisationTokenIndex = Array.isArray(data)
    ? (data as TTSCivilisationToken[]).map((token) => ({
        ...token,
        terrain:
          token.terrain ??
          token.terrainPack ??
          CIVILISATION_TOKEN_NEUTRAL_TERRAIN,
      }))
    : [];
  return cachedCivilisationTokenIndex;
}

function getBoardIndex(): TTSBoard[] {
  if (cachedBoardIndex !== null) return cachedBoardIndex;
  const data = readJsonOrEmpty<unknown>(BOARDS_FILE);
  cachedBoardIndex = Array.isArray(data)
    ? (data as TTSBoard[]).map((board) => ({
        ...board,
        terrain: board.terrain ?? board.terrainPack ?? "Neutral",
      }))
    : [];
  return cachedBoardIndex;
}

function getSiteMonsterIndex(): Record<string, TTSSiteMonsterGroup[]> {
  if (cachedSiteMonsterIndex !== null) return cachedSiteMonsterIndex;
  cachedSiteMonsterIndex =
    readJsonOrEmpty<Record<string, TTSSiteMonsterGroup[]>>(SITE_MONSTERS_FILE);
  return cachedSiteMonsterIndex;
}

function getMapTileMonsterIndex(): MapTileMonsterIndex {
  if (cachedMapTileMonsterIndex !== null) return cachedMapTileMonsterIndex;
  cachedMapTileMonsterIndex = readJsonOrEmpty<MapTileMonsterIndex>(
    MAP_TILE_MONSTERS_FILE,
  );
  return cachedMapTileMonsterIndex;
}

function getMapTiles(): TTSMapTile[] {
  if (cachedMapTiles !== null) return cachedMapTiles;
  const data = readJsonOrEmpty<unknown>(MAP_TILES_FILE);
  cachedMapTiles = Array.isArray(data) ? (data as TTSMapTile[]) : [];
  return cachedMapTiles;
}

function getNativeSummonIndex(): NativeSummonIndex {
  if (cachedNativeSummonIndex !== null) return cachedNativeSummonIndex;
  cachedNativeSummonIndex =
    readJsonOrEmpty<NativeSummonIndex>(NATIVE_SUMMONS_FILE);
  return cachedNativeSummonIndex;
}

function getNativeIndex(): NativeIndex {
  if (cachedNativeIndex !== null) return cachedNativeIndex;
  cachedNativeIndex = readJsonOrEmpty<NativeIndex>(NATIVES_FILE);
  return cachedNativeIndex;
}

function getMissionIndex(): MissionIndex {
  if (cachedMissionIndex !== null) return cachedMissionIndex;
  cachedMissionIndex = readJsonOrEmpty<MissionIndex>(MISSIONS_FILE);
  return cachedMissionIndex;
}

function getMissionFeatureIndex(): Record<string, string | string[]> {
  if (cachedMissionFeatureIndex !== null) return cachedMissionFeatureIndex;
  cachedMissionFeatureIndex =
    readJsonOrEmpty<Record<string, string | string[]>>(MISSION_FEATURE_FILE);
  return cachedMissionFeatureIndex;
}

function getManualMonsterChipNameIndex(): ManualMonsterChipNameIndex {
  if (cachedManualMonsterChipNameIndex !== null)
    return cachedManualMonsterChipNameIndex;
  cachedManualMonsterChipNameIndex =
    readJsonOrEmpty<ManualMonsterChipNameIndex>(MONSTER_CHIP_NAMES_FILE);
  return cachedManualMonsterChipNameIndex;
}

function getSpellCastersIndex(): Record<
  string,
  { front?: string[]; back?: string[] }
> {
  if (cachedSpellCasters !== null) return cachedSpellCasters;
  cachedSpellCasters =
    readJsonOrEmpty<Record<string, { front?: string[]; back?: string[] }>>(
      SPELL_CASTERS_FILE,
    );
  return cachedSpellCasters;
}

/** Sides on which a monster casts a given spell. */
export type SpellCasterEntry = {
  monsterName: string;
  sides: ("front" | "back")[];
  monsterSlug: string;
};

/** Spells cast by a given monster, keyed by side. */
export type MonsterSpellEntry = {
  spellName: string;
  sides: ("front" | "back")[];
  spellSlug: string;
  /** Individual monster names within the group that cast this spell. */
  casterNames: string[];
};

/** Return all monsters that cast a given spell, across either card side. */
export function getSpellCastersForSpell(spellName: string): SpellCasterEntry[] {
  const idx = getSpellCastersIndex();
  const entry = idx[spellName];
  if (!entry) return [];
  const bySide = new Map<string, ("front" | "back")[]>();
  for (const side of ["front", "back"] as const) {
    for (const name of entry[side] ?? []) {
      const sides = bySide.get(name) ?? [];
      sides.push(side);
      bySide.set(name, sides);
    }
  }
  return [...bySide.entries()]
    .map(([monsterName, sides]) => ({
      monsterName,
      sides,
      monsterSlug: monsterGroupSlugForCaster(monsterName),
    }))
    .sort((a, b) => a.monsterName.localeCompare(b.monsterName));
}

/** Return all spells cast by any of the given monster names (group name + individual chip names). */
export function getSpellsForMonster(
  monsterNames: string | string[],
): MonsterSpellEntry[] {
  const names = Array.isArray(monsterNames) ? monsterNames : [monsterNames];
  const idx = getSpellCastersIndex();
  const results: MonsterSpellEntry[] = [];
  for (const [spellName, entry] of Object.entries(idx)) {
    const sidesSet = new Set<"front" | "back">();
    const casterNames: string[] = [];
    for (const side of ["front", "back"] as const) {
      for (const casterName of entry[side] ?? []) {
        if (
          names.some((name) => spellCasterMatchesMonsterName(casterName, name))
        ) {
          sidesSet.add(side);
          if (!casterNames.includes(casterName)) casterNames.push(casterName);
        }
      }
    }
    if (sidesSet.size > 0) {
      results.push({
        spellName,
        sides: ["front", "back"].filter((s) =>
          sidesSet.has(s as "front" | "back"),
        ) as ("front" | "back")[],
        spellSlug: slugify(spellName),
        casterNames,
      });
    }
  }
  return results.sort((a, b) => a.spellName.localeCompare(b.spellName));
}

function monsterGroupSlugForCaster(monsterName: string): string {
  const normalizedCaster = normalizeTitle(monsterName);
  const group = getAllMonsterGroups().find((entry) => {
    if (normalizeTitle(entry.prettyName) === normalizedCaster) return true;
    if (
      entry.chips.some(
        (chip) =>
          chip.monsterName &&
          normalizeTitle(chip.monsterName) === normalizedCaster,
      )
    ) {
      return true;
    }
    const normalizedGroup = normalizeTitle(entry.prettyName);
    return normalizedCaster.startsWith(`${normalizedGroup} `);
  });
  return group ? group.slug : slugify(monsterName);
}

function spellCasterMatchesMonsterName(
  casterName: string,
  monsterName: string,
): boolean {
  const normalizedCaster = normalizeTitle(casterName);
  const normalizedMonster = normalizeTitle(monsterName);
  return (
    normalizedCaster === normalizedMonster ||
    normalizedCaster.startsWith(`${normalizedMonster} `)
  );
}

function readJsonOrEmpty<T>(file: string): T {
  try {
    return JSON.parse(readFileSync(file, "utf-8")) as T;
  } catch {
    return {} as T;
  }
}

function getAliases(): AliasMap {
  if (cachedAliases !== null) return cachedAliases;
  // Normalize both sides at load time so resolveCards can do a single
  // normalized lookup per target.
  const raw = aliasesData as Record<string, string | string[]>;
  cachedAliases = {};
  for (const [from, to] of Object.entries(raw)) {
    const normalizedFrom = normalizeTitle(from);
    cachedAliases[normalizedFrom] = Array.isArray(to)
      ? to.map(normalizeTitle)
      : normalizeTitle(to);
  }
  return cachedAliases;
}

export function findCards(title: string): TTSCardImage[] {
  return resolveCards(title, getCardIndex(), getAliases());
}

/**
 * Entry shape used by the chips index page: one row per chip key.
 * `name` is the raw `GMNotes` key; `prettyName` is the display form.
 */
export type ChipEntry = {
  name: string;
  prettyName: string;
  chips: TTSChip[];
};

export type MonsterGroupChip = TTSChip & {
  monsterName?: string;
  monsterSortOrder?: number;
};

export type MonsterGroupMapTileSummon = {
  tileName: string;
  terrain: string;
  role: "wandering" | "local";
  href: string;
};

export type MonsterGroupSiteSummon = {
  name: string;
  href: string;
  monsters: string[];
};

export type NativeGroupSummon = {
  name: string;
  href: string;
  natives: string[];
};

export type MonsterGroupEntry = Omit<ChipEntry, "chips"> & {
  chips: MonsterGroupChip[];
  slug: string;
  mapTiles: MonsterGroupMapTileSummon[];
  sites: MonsterGroupSiteSummon[];
  nativeSummons: NativeGroupSummon[];
  civilisationCard?: TTSCardImage;
};

export type MonsterGroupMapTileLink = {
  name: string;
  slug: string;
  role: "wandering" | "local";
};

export type MonsterGroupSiteLink = {
  name: string;
  slug: string;
  monsters: string[];
};

export type NativeGroupLink = {
  name: string;
  slug: string;
  natives: string[];
};

export type MissionTargetKind =
  | "native"
  | "site"
  | "merchant"
  | "civLocation"
  | "wildernessToken"
  | "mapTile";

export type MissionTargetLink = {
  name: string;
  href: string;
  kind: MissionTargetKind;
};

export type MissionFeatureKind = "native" | "monsterGroup";

export type MissionFeatureLink = {
  name: string;
  href: string;
  kind: MissionFeatureKind;
};

export type ClassEntry = {
  name: string;
  slug: string;
  classes: TTSClass[];
};

export type LineageEntry = {
  name: string;
  slug: string;
  lineages: TTSLineage[];
};

export type SpellEntry = {
  name: string;
  slug: string;
  spells: TTSSpell[];
};

export type ItemStartingClass = {
  name: string;
  slug: string;
  sides: { side: "front" | "back"; slot: string }[];
};

export type MagicCubeStartingClass = {
  name: string;
  slug: string;
  sides: {
    side: "front" | "back";
    cubes: TTSClassSetupCube[];
  }[];
};

export type ItemEntry = {
  name: string;
  slug: string;
  cards: TTSItemCard[];
  copies: number;
  boxes: { name: string; count: number }[];
  startingClasses: ItemStartingClass[];
};

export type EquipmentDeck = "item" | TTSTreasureDeck;

export type EquipmentDeckGroup = {
  deck: EquipmentDeck;
  title: string;
  entries: EquipmentDeckEntry[];
  cards: number;
  copies: number;
};

export type EquipmentDeckEntry = {
  name: string;
  slug: string;
  deck: EquipmentDeck;
  cards: (TTSItemCard | TTSTreasureCard)[];
  copies: number;
};

export type EquipmentEntry = {
  name: string;
  slug: string;
  item?: ItemEntry;
  treasures: TTSTreasureCard[];
  decks: EquipmentDeck[];
  copies: number;
};

export type LegendaryMonsterLink = TTSLegendaryMonsterChip & {
  href?: string;
};

export type LegendaryLocationEntry = {
  name: string;
  slug: string;
  locations: TTSLegendaryLocation[];
  kind: "site" | "test";
  monsterChips: LegendaryMonsterLink[];
};

export function getAllClasses(): ClassEntry[] {
  return Object.entries(getClassIndex())
    .map(([name, classes]) => ({
      name,
      slug: slugify(name),
      classes,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getClassBySlug(slug: string): ClassEntry | undefined {
  return getAllClasses().find((entry) => entry.slug === slug);
}

export function getAllLineages(): LineageEntry[] {
  return Object.entries(getLineageIndex())
    .map(([name, lineages]) => ({
      name,
      slug: slugify(name),
      lineages,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getLineageBySlug(slug: string): LineageEntry | undefined {
  return getAllLineages().find((entry) => entry.slug === slug);
}

export function getAllSpells(): SpellEntry[] {
  return Object.entries(getSpellIndex())
    .map(([name, spells]) => ({
      name,
      slug: slugify(name),
      spells,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getSpellBySlug(slug: string): SpellEntry | undefined {
  return getAllSpells().find((entry) => entry.slug === slug);
}

export function getSpellsByMagic(magic: string): SpellEntry[] {
  return getAllSpells().filter((entry) =>
    entry.spells.some((spell) => spell.magic.includes(magic)),
  );
}

export function getClassesForMagicCube(
  magic: string,
): MagicCubeStartingClass[] {
  const color = normalizeMagicCubeColor(magic);
  if (color === "universal") return [];
  return getAllClasses()
    .flatMap((entry) => {
      const sides = entry.classes.flatMap((ttsClass) =>
        (["front", "back"] as const).flatMap((side) => {
          const cubes = (ttsClass.setup?.[side]?.cubes ?? []).filter((cube) =>
            classSetupCubeMatchesMagic(cube, color),
          );
          return cubes.length > 0 ? [{ side, cubes }] : [];
        }),
      );
      return sides.length > 0
        ? [
            {
              name: entry.name,
              slug: entry.slug,
              sides: dedupeMagicCubeClassSides(sides),
            },
          ]
        : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getAllItems(): ItemEntry[] {
  return Object.entries(getItemIndex())
    .map(([name, cards]) => ({
      name,
      slug: slugify(name),
      cards,
      copies: itemPhysicalCopies(cards),
      boxes: itemBoxes(cards),
      startingClasses: getClassesForStartingItem(name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getItemBySlug(slug: string): ItemEntry | undefined {
  return getAllItems().find((entry) => entry.slug === slug);
}

export function getAllEquipment(): EquipmentEntry[] {
  const bySlug = new Map<string, EquipmentEntry>();
  for (const item of getAllItems()) {
    bySlug.set(item.slug, {
      name: item.name,
      slug: item.slug,
      item,
      treasures: [],
      decks: ["item"],
      copies: item.copies,
    });
  }
  for (const [name, cards] of Object.entries(getTreasureIndex())) {
    const slug = slugify(name);
    const existing = bySlug.get(slug);
    const treasureCopies = treasurePhysicalCopies(cards);
    const decks = uniqueEquipmentDecks(cards.map((card) => card.deck));
    if (existing) {
      existing.treasures.push(...cards);
      existing.decks = uniqueEquipmentDecks([...existing.decks, ...decks]);
      existing.copies += treasureCopies;
    } else {
      bySlug.set(slug, {
        name,
        slug,
        treasures: cards,
        decks,
        copies: treasureCopies,
      });
    }
  }
  return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getEquipmentBySlug(slug: string): EquipmentEntry | undefined {
  return getAllEquipment().find((entry) => entry.slug === slug);
}

export function getEquipmentDeckGroups(): EquipmentDeckGroup[] {
  const groups = new Map<EquipmentDeck, EquipmentDeckEntry[]>();
  for (const item of getAllItems()) {
    const entries = groups.get("item") ?? [];
    entries.push({
      name: item.name,
      slug: item.slug,
      deck: "item",
      cards: item.cards,
      copies: item.copies,
    });
    groups.set("item", entries);
  }
  for (const [name, cards] of Object.entries(getTreasureIndex())) {
    for (const deck of uniqueEquipmentDecks(cards.map((card) => card.deck))) {
      const deckCards = cards.filter((card) => card.deck === deck);
      const entries = groups.get(deck) ?? [];
      entries.push({
        name,
        slug: slugify(name),
        deck,
        cards: deckCards,
        copies: treasurePhysicalCopies(deckCards),
      });
      groups.set(deck, entries);
    }
  }
  return (["item", "treasure", "deep-treasure", "legendary"] as const)
    .map((deck) => {
      const entries = (groups.get(deck) ?? []).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      return {
        deck,
        title: equipmentDeckTitle(deck),
        entries,
        cards: entries.reduce((sum, entry) => sum + entry.cards.length, 0),
        copies: entries.reduce((sum, entry) => sum + entry.copies, 0),
      };
    })
    .filter((group) => group.entries.length > 0);
}

function equipmentDeckTitle(deck: EquipmentDeck): string {
  switch (deck) {
    case "item":
      return "Item Deck";
    case "treasure":
      return "Treasure Deck";
    case "deep-treasure":
      return "Deep Treasure Deck";
    case "legendary":
      return "Legendary Treasures";
  }
}

export function getAllLegendaryLocations(): LegendaryLocationEntry[] {
  return Object.entries(getLegendaryLocationIndex())
    .map(([name, locations]) => ({
      name,
      slug: slugify(name),
      locations,
      kind: locations[0]?.kind ?? "test",
      monsterChips: legendaryMonsterLinks(locations),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getLegendaryLocationBySlug(
  slug: string,
): LegendaryLocationEntry | undefined {
  return getAllLegendaryLocations().find((entry) => entry.slug === slug);
}

export function getClassesForStartingItem(
  itemName: string,
): ItemStartingClass[] {
  const itemKey = normalizeTitle(itemName);
  return getAllClasses()
    .flatMap((entry) => {
      const sides = entry.classes.flatMap((ttsClass) =>
        (["front", "back"] as const).flatMap((side) =>
          (ttsClass.setup?.[side]?.items ?? [])
            .filter((item) => normalizeTitle(item.name) === itemKey)
            .map((item) => ({ side, slot: item.slot })),
        ),
      );
      return sides.length > 0
        ? [
            {
              name: entry.name,
              slug: entry.slug,
              sides: dedupeStartingClassSides(sides),
            },
          ]
        : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Return all chip entries, sorted alphabetically by prettified name. */
export function getAllChips(): ChipEntry[] {
  const idx = getChipIndex();
  return Object.entries(idx)
    .map(([name, chips]) => ({
      name,
      prettyName: prettifyChipName(name),
      chips,
    }))
    .sort((a, b) => a.prettyName.localeCompare(b.prettyName));
}

export function getAllMonsterGroups(): MonsterGroupEntry[] {
  return getAllChips()
    .filter((entry) => !isNativeChipGroup(entry))
    .map((entry) => ({
      ...entry,
      chips: withMonsterNames(entry.prettyName, entry.chips),
      slug: slugify(entry.prettyName),
      mapTiles: getMapTileSummonsForMonsterGroup(entry.prettyName),
      sites: getSiteSummonsForMonsterGroup(entry.prettyName),
      nativeSummons: [],
    }))
    .sort((a, b) => a.prettyName.localeCompare(b.prettyName));
}

export function getAllNativeGroups(): MonsterGroupEntry[] {
  return getAllChips()
    .filter(isNativeChipGroup)
    .map((entry) => ({
      ...entry,
      chips: withNativeNames(entry.prettyName, entry.chips),
      slug: slugify(entry.prettyName),
      mapTiles: [],
      sites: [],
      nativeSummons: getNativeSummonsForGroup(entry.prettyName),
      civilisationCard: getNativeCivilisationCard(entry.prettyName),
    }))
    .sort((a, b) => a.prettyName.localeCompare(b.prettyName));
}

export function getMonsterGroupBySlug(
  slug: string,
): MonsterGroupEntry | undefined {
  return getAllMonsterGroups().find((entry) => entry.slug === slug);
}

export function getNativeGroupBySlug(
  slug: string,
): MonsterGroupEntry | undefined {
  return getAllNativeGroups().find((entry) => entry.slug === slug);
}

export function getMonsterGroupsForMapTile(
  terrain: string,
  tileName: string,
): MonsterGroupMapTileLink[] {
  return getAllMonsterGroups()
    .flatMap((entry) =>
      entry.mapTiles
        .filter(
          (summon) =>
            summon.terrain === terrain && summon.tileName === tileName,
        )
        .map((summon) => ({
          name: entry.prettyName,
          slug: entry.slug,
          role: summon.role,
        })),
    )
    .sort(compareMonsterGroupMapTileLinks);
}

export function getMonsterGroupsForSite(
  siteName: string,
): MonsterGroupSiteLink[] {
  return getAllMonsterGroups()
    .flatMap((entry) =>
      entry.sites
        .filter((summon) => summon.name === siteName)
        .map((summon) => ({
          name: entry.prettyName,
          slug: entry.slug,
          monsters: summon.monsters,
        })),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getNativeGroupsForCivLocation(
  locationName: string,
): NativeGroupLink[] {
  return getNativeGroupsForSummonSource(locationName);
}

export function getNativeGroupsForWildernessToken(
  tokenName: string,
): NativeGroupLink[] {
  return getNativeGroupsForSummonSource(tokenName);
}

function getNativeGroupsForSummonSource(sourceName: string): NativeGroupLink[] {
  return getAllNativeGroups()
    .flatMap((entry) =>
      entry.nativeSummons
        .filter((summon) => summon.name === sourceName)
        .map((summon) => ({
          name: entry.prettyName,
          slug: entry.slug,
          natives: summon.natives,
        })),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** A card name with the card variants that carry a specific tag. */
export type CardEntry = {
  name: string;
  slug?: string;
  cards: TTSCardImage[];
  descriptions?: string[];
  kinds?: MissionKind[];
  terrainPacks?: MissionTerrainPack[];
  rewardSummaries?: string[];
  targets?: MissionTargetLink[];
  features?: MissionFeatureLink[];
};

export type MissionEntry = Omit<CardEntry, "cards"> & {
  slug: string;
  cards: TTSMissionCard[];
  descriptions: string[];
  kinds: MissionKind[];
  terrainPacks: MissionTerrainPack[];
  rewardSummaries: string[];
  targets: MissionTargetLink[];
  features: MissionFeatureLink[];
};

export function getAllMissions(): MissionEntry[] {
  return Object.entries(getMissionIndex())
    .map(([name, cards]) => ({
      name,
      slug: slugify(name),
      cards,
      descriptions: uniqueStrings(
        cards.flatMap((card) => (card.description ? [card.description] : [])),
      ),
      kinds: missionKindsFor(cards),
      terrainPacks: missionTerrainPacksFor(cards),
      rewardSummaries: missionRewardSummariesFor(cards),
      targets: missionTargetsFor(cards),
      features: missionFeaturesFor(name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getMissionBySlug(slug: string): MissionEntry | undefined {
  return getAllMissions().find((entry) => entry.slug === slug);
}

export function getMissionsForTarget(targetName: string): MissionEntry[] {
  const targetKey = normalizeTitle(targetName);
  return getAllMissions().filter((entry) =>
    entry.cards.some((card) =>
      card.completeAt?.some((target) => normalizeTitle(target) === targetKey),
    ),
  );
}

export function getMissionsFeaturing(featureName: string): MissionEntry[] {
  return getAllMissions().filter((entry) =>
    entry.features.some((feature) => feature.name === featureName),
  );
}

export function getMissionsForMapTile(
  terrain: string,
  tileName: string,
): MissionEntry[] {
  const targetHref = mapTileHref(terrain, tileName);
  return getAllMissions().filter((entry) =>
    entry.targets.some(
      (target) => target.kind === "mapTile" && target.href === targetHref,
    ),
  );
}

/** A site entry for the /sites listing. */
export type SiteEntry = {
  name: string;
  slug: string;
  site: TTSSite;
};

/** Return all sites, sorted alphabetically by name. */
export function getAllSites(): SiteEntry[] {
  const idx = getSiteIndex();
  return Object.entries(idx)
    .flatMap(([name, sites]) =>
      sites.map((site) => ({ name, slug: slugify(name), site })),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getSiteBySlug(slug: string): SiteEntry | undefined {
  return getAllSites().find((entry) => entry.slug === slug);
}

/** A civ-location entry for the /civ-locations listing. */
export type CivLocationEntry = {
  name: string;
  slug: string;
  location: TTSCivLocation;
};

/** Return all civ locations, sorted alphabetically by name. */
export function getAllCivLocations(): CivLocationEntry[] {
  const idx = getCivLocationIndex();
  return Object.entries(idx)
    .flatMap(([name, locs]) =>
      locs.map((location) => ({ name, slug: slugify(name), location })),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getCivLocationBySlug(
  slug: string,
): CivLocationEntry | undefined {
  return getAllCivLocations().find((entry) => entry.slug === slug);
}

export type WildernessTokenTerrainEntry = {
  terrain: string;
  tokens: WildernessTokenListEntry[];
};

export type WildernessTokenListEntry = TTSWildernessToken & {
  name: string;
  slug: string;
};

export type WildernessTokenNameEntry = {
  name: string;
  slug: string;
  tokens: WildernessTokenListEntry[];
};

export function getAllWildernessTokenTerrains(): WildernessTokenTerrainEntry[] {
  return Object.entries(getWildernessTokenIndex())
    .map(([terrain, tokens]) => ({
      terrain,
      tokens: tokens
        .filter(hasWildernessTokenName)
        .map((token) => ({
          ...token,
          name: token.name,
          slug: slugify(token.name),
        }))
        .sort(compareWildernessTokens),
    }))
    .sort((a, b) => a.terrain.localeCompare(b.terrain));
}

export function getAllWildernessTokenNames(): WildernessTokenNameEntry[] {
  const bySlug = new Map<string, WildernessTokenNameEntry>();
  for (const { tokens } of getAllWildernessTokenTerrains()) {
    for (const token of tokens) {
      const entry = bySlug.get(token.slug);
      if (entry) {
        entry.tokens.push(token);
      } else {
        bySlug.set(token.slug, {
          name: token.name,
          slug: token.slug,
          tokens: [token],
        });
      }
    }
  }
  return [...bySlug.values()]
    .map((entry) => ({
      ...entry,
      tokens: entry.tokens.sort(compareWildernessTokens),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getWildernessTokenBySlug(
  slug: string,
): WildernessTokenNameEntry | undefined {
  return getAllWildernessTokenNames().find((entry) => entry.slug === slug);
}

export type CivilisationTokenTerrainEntry = {
  terrain: string;
  tokens: CivilisationTokenListEntry[];
};

export type CivilisationTokenListEntry = TTSCivilisationToken & {
  displayName: string;
  slug: string;
  terrainGroup: string;
};

export type CivilisationTokenNameEntry = {
  name: string;
  slug: string;
  tokens: CivilisationTokenListEntry[];
};

export function getAllCivilisationTokenTerrains(): CivilisationTokenTerrainEntry[] {
  const byTerrain = new Map<string, CivilisationTokenListEntry[]>();
  for (const token of getCivilisationTokenIndex()) {
    const terrain = token.terrain ?? CIVILISATION_TOKEN_NEUTRAL_TERRAIN;
    const displayName = civilisationTokenDisplayName(token);
    const entry: CivilisationTokenListEntry = {
      ...token,
      displayName,
      slug: slugify(displayName),
      terrainGroup: terrain,
    };
    const tokens = byTerrain.get(terrain);
    if (tokens) tokens.push(entry);
    else byTerrain.set(terrain, [entry]);
  }

  return [...byTerrain.entries()]
    .map(([terrain, tokens]) => ({
      terrain,
      tokens: tokens.sort(compareCivilisationTokens),
    }))
    .sort(compareCivilisationTokenTerrains);
}

export function getAllCivilisationTokenNames(): CivilisationTokenNameEntry[] {
  const bySlug = new Map<string, CivilisationTokenNameEntry>();
  for (const { tokens } of getAllCivilisationTokenTerrains()) {
    for (const token of tokens) {
      const entry = bySlug.get(token.slug);
      if (entry) {
        entry.tokens.push(token);
      } else {
        bySlug.set(token.slug, {
          name: token.displayName,
          slug: token.slug,
          tokens: [token],
        });
      }
    }
  }

  return [...bySlug.values()]
    .map((entry) => ({
      ...entry,
      tokens: entry.tokens.sort(compareCivilisationTokens),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getCivilisationTokenBySlug(
  slug: string,
): CivilisationTokenNameEntry | undefined {
  return getAllCivilisationTokenNames().find((entry) => entry.slug === slug);
}

export type BoardEntry = {
  slug: string;
  title: string;
  board: TTSBoard;
};

export function getAllBoards(): BoardEntry[] {
  const seen = new Map<string, number>();
  return getBoardIndex()
    .map((board) => ({ title: boardTitle(board), board }))
    .sort(compareBoardEntries)
    .map(({ title, board }) => {
      const baseSlug = slugify(`${board.terrain} ${title}`);
      const count = seen.get(baseSlug) ?? 0;
      seen.set(baseSlug, count + 1);
      return {
        title,
        board,
        slug: count === 0 ? baseSlug : `${baseSlug}-${count + 1}`,
      };
    });
}

export function getBoardBySlug(slug: string): BoardEntry | undefined {
  return getAllBoards().find((entry) => entry.slug === slug);
}

export function getBoardsForSite(siteName: string): BoardEntry[] {
  return getAllBoards().filter((entry) => entry.board.sites.includes(siteName));
}

export function getBoardsForMerchant(merchantName: string): BoardEntry[] {
  return getAllBoards().filter((entry) =>
    entry.board.merchants.includes(merchantName),
  );
}

function hasWildernessTokenName(
  token: TTSWildernessToken,
): token is TTSWildernessToken & { name: string } {
  return typeof token.name === "string" && token.name.length > 0;
}

function compareWildernessTokens(
  a: WildernessTokenListEntry,
  b: WildernessTokenListEntry,
): number {
  return (
    a.name.localeCompare(b.name) ||
    a.terrain.localeCompare(b.terrain) ||
    (a.clearing ?? 0) - (b.clearing ?? 0) ||
    String(a.draw ?? "").localeCompare(String(b.draw ?? "")) ||
    a.imageURL.localeCompare(b.imageURL)
  );
}

function civilisationTokenDisplayName(token: TTSCivilisationToken): string {
  const name = token.name?.trim();
  if (name) return name;
  if (token.gmNotes === "empty") return "Empty";
  return "Unnamed";
}

function compareCivilisationTokenTerrains(
  a: CivilisationTokenTerrainEntry,
  b: CivilisationTokenTerrainEntry,
): number {
  if (a.terrain === CIVILISATION_TOKEN_NEUTRAL_TERRAIN) return -1;
  if (b.terrain === CIVILISATION_TOKEN_NEUTRAL_TERRAIN) return 1;
  return a.terrain.localeCompare(b.terrain);
}

function compareCivilisationTokens(
  a: CivilisationTokenListEntry,
  b: CivilisationTokenListEntry,
): number {
  return (
    a.displayName.localeCompare(b.displayName) ||
    a.terrainGroup.localeCompare(b.terrainGroup) ||
    String(a.attribute ?? "").localeCompare(String(b.attribute ?? "")) ||
    String(a.gmNotes ?? "").localeCompare(String(b.gmNotes ?? "")) ||
    a.imageSecondaryURL.localeCompare(b.imageSecondaryURL)
  );
}

function compareBoardEntries(
  a: { title: string; board: TTSBoard },
  b: { title: string; board: TTSBoard },
): number {
  return (
    a.board.terrain.localeCompare(b.board.terrain) ||
    a.title.localeCompare(b.title) ||
    a.board.imageURL.localeCompare(b.board.imageURL)
  );
}

function boardTitle(board: TTSBoard): string {
  if (board.sites.length > 0 && board.merchants.length === 0) {
    return `${board.sites.join(" / ")} Board`;
  }
  if (board.sites.length === 0 && board.merchants.length > 0) {
    return `${board.terrain} Merchant Board`;
  }
  return `${board.terrain} Board`;
}

export { slugify };

function itemPhysicalCopies(cards: TTSItemCard[]): number {
  return cards.reduce((total, card) => total + card.copies, 0);
}

function treasurePhysicalCopies(cards: TTSTreasureCard[]): number {
  return cards.reduce((total, card) => total + card.copies, 0);
}

function uniqueEquipmentDecks(decks: EquipmentDeck[]): EquipmentDeck[] {
  const order: EquipmentDeck[] = [
    "item",
    "treasure",
    "deep-treasure",
    "legendary",
  ];
  const found = new Set(decks);
  return order.filter((deck) => found.has(deck));
}

function itemBoxes(cards: TTSItemCard[]): { name: string; count: number }[] {
  const boxes = new Map<string, number>();
  for (const card of cards) {
    for (const box of card.boxes) {
      boxes.set(box.name, (boxes.get(box.name) ?? 0) + box.count);
    }
  }
  return [...boxes.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function legendaryMonsterLinks(
  locations: TTSLegendaryLocation[],
): LegendaryMonsterLink[] {
  const links = new Map<string, LegendaryMonsterLink>();
  for (const chip of locations.flatMap(
    (location) => location.monsterChips ?? [],
  )) {
    const key = `${chip.name}:${chip.guid ?? chip.imageURL ?? ""}`;
    if (links.has(key)) continue;
    const monsterGroup = getMonsterGroupBySlug(slugify(chip.name));
    links.set(key, {
      ...chip,
      href: monsterGroup ? `/monster-groups/${monsterGroup.slug}` : undefined,
    });
  }
  return [...links.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function dedupeStartingClassSides(
  sides: { side: "front" | "back"; slot: string }[],
): { side: "front" | "back"; slot: string }[] {
  const seen = new Set<string>();
  return sides.filter((entry) => {
    const key = `${entry.side}:${entry.slot}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeMagicCubeClassSides(
  sides: MagicCubeStartingClass["sides"],
): MagicCubeStartingClass["sides"] {
  const bySide = new Map<"front" | "back", TTSClassSetupCube[]>();
  for (const side of sides) {
    const cubes = bySide.get(side.side) ?? [];
    for (const cube of side.cubes) {
      if (!cubes.some((existing) => isSameClassSetupCube(existing, cube))) {
        cubes.push(cube);
      }
    }
    bySide.set(side.side, cubes);
  }
  return (["front", "back"] as const).flatMap((side) => {
    const cubes = bySide.get(side) ?? [];
    return cubes.length > 0 ? [{ side, cubes }] : [];
  });
}

function isSameClassSetupCube(
  a: TTSClassSetupCube,
  b: TTSClassSetupCube,
): boolean {
  return (
    a.type === b.type &&
    a.color === b.color &&
    a.count === b.count &&
    (a.colors ?? []).join("|") === (b.colors ?? []).join("|")
  );
}

function classSetupCubeMatchesMagic(
  cube: TTSClassSetupCube,
  color: string,
): boolean {
  if (cube.type !== "Spell") return false;
  if (normalizeMagicCubeColor(cube.color) === "any") return true;
  return (cube.colors ?? [cube.color]).some(
    (candidate) => normalizeMagicCubeColor(candidate) === color,
  );
}

function normalizeMagicCubeColor(color: string | undefined): string {
  return color === "grey" ? "gray" : (color ?? "");
}

const NATIVE_CHIP_GROUPS = new Set(
  [
    "aurorans",
    "bashkirs",
    "consul",
    "dwarves",
    "elves",
    "knights",
    "mariners",
    "nomads",
    "priests",
    "rogues",
    "sellswords",
    "soldiers",
    "villagers",
    "wardens",
    "watch",
  ].map(normalizeTitle),
);

function isNativeChipGroup(entry: ChipEntry): boolean {
  return NATIVE_CHIP_GROUPS.has(normalizeTitle(entry.name));
}

function withMonsterNames(
  groupName: string,
  chips: TTSChip[],
): MonsterGroupChip[] {
  const manualNamesByImage = manualMonsterNamesByImageForGroup(groupName);
  const namesByImage = monsterNamesByImageForGroup(groupName);
  return chips
    .map((chip) => {
      const manualName = manualNamesByImage.get(
        chipImageKey(chip.imageURL, chip.imageSecondaryURL),
      );
      return {
        ...chip,
        monsterName:
          manualName?.name ?? chip.name ?? namesByImage.get(chip.imageURL),
        monsterSortOrder: manualName?.sortOrder,
      };
    })
    .sort(compareMonsterGroupChips);
}

function withNativeNames(
  groupName: string,
  chips: TTSChip[],
): MonsterGroupChip[] {
  const namesByImage = nativeNamesByImageForGroup(groupName);
  return chips
    .map((chip) => ({
      ...chip,
      monsterName: namesByImage.get(chip.imageURL),
    }))
    .sort(compareNativeGroupChips);
}

function compareMonsterGroupChips(
  a: MonsterGroupChip,
  b: MonsterGroupChip,
): number {
  return (
    manualMonsterSortValue(a) - manualMonsterSortValue(b) ||
    (a.monsterName ?? "").localeCompare(b.monsterName ?? "") ||
    a.imageURL.localeCompare(b.imageURL)
  );
}

function manualMonsterSortValue(chip: MonsterGroupChip): number {
  return chip.monsterSortOrder ?? Number.MAX_SAFE_INTEGER;
}

function compareNativeGroupChips(
  a: MonsterGroupChip,
  b: MonsterGroupChip,
): number {
  return (
    nativeChipSortValue(a.monsterName) - nativeChipSortValue(b.monsterName) ||
    compareMonsterGroupChips(a, b)
  );
}

function nativeChipSortValue(name: string | undefined): number {
  if (!name) return 1000;
  if (/\bleader\b/i.test(name)) return 0;
  const match = name.match(/\b(\d+)$/);
  if (match) return Number(match[1]);
  return 1000;
}

function monsterNamesByImageForGroup(groupName: string): Map<string, string> {
  const names = new Map<string, string>();
  for (const entries of Object.values(getSiteMonsterIndex())) {
    for (const entry of entries) {
      if (entry.group !== groupName) continue;
      for (const chip of entry.monsterChips ?? []) {
        if (!chip.imageURL || names.has(chip.imageURL)) continue;
        names.set(chip.imageURL, chip.name);
      }
    }
  }
  return names;
}

function manualMonsterNamesByImageForGroup(
  groupName: string,
): Map<string, { name: string; sortOrder: number }> {
  const names = new Map<string, { name: string; sortOrder: number }>();
  const entries = getManualMonsterChipNameIndex()[groupName] ?? [];
  entries.forEach((entry, index) => {
    names.set(chipImageKey(entry.imageURL, entry.imageSecondaryURL ?? ""), {
      name: entry.name,
      sortOrder: index,
    });
  });
  return names;
}

function chipImageKey(imageURL: string, imageSecondaryURL: string): string {
  return `${imageURL}\n${imageSecondaryURL}`;
}

function nativeNamesByImageForGroup(groupName: string): Map<string, string> {
  const names = new Map<string, string>();
  const index = getNativeSummonIndex();
  const orderedEntries = [
    ...Object.entries(index).filter(([name]) => name !== "Native Setup"),
    ...Object.entries(index).filter(([name]) => name === "Native Setup"),
  ];
  for (const [, entries] of orderedEntries) {
    for (const entry of entries) {
      if (entry.group !== groupName) continue;
      for (const chip of entry.nativeChips ?? []) {
        if (!chip.imageURL || names.has(chip.imageURL)) continue;
        names.set(chip.imageURL, chip.name);
      }
    }
  }
  return names;
}

function compareMonsterGroupMapTileLinks(
  a: MonsterGroupMapTileLink,
  b: MonsterGroupMapTileLink,
): number {
  return (
    roleSortValue(a.role) - roleSortValue(b.role) ||
    a.name.localeCompare(b.name)
  );
}

function roleSortValue(role: "wandering" | "local"): number {
  return role === "wandering" ? 0 : 1;
}

function getMapTileSummonsForMonsterGroup(
  groupName: string,
): MonsterGroupMapTileSummon[] {
  const summons: MonsterGroupMapTileSummon[] = [];
  for (const [tileName, entries] of Object.entries(getMapTileMonsterIndex())) {
    for (const entry of entries) {
      for (const role of ["wandering", "local"] as const) {
        if (!entry[role].includes(groupName)) continue;
        summons.push({
          tileName,
          terrain: entry.terrain,
          role,
          href: mapTileHref(entry.terrain, tileName),
        });
      }
    }
  }
  return summons.sort(
    (a, b) =>
      a.terrain.localeCompare(b.terrain) ||
      a.tileName.localeCompare(b.tileName) ||
      a.role.localeCompare(b.role),
  );
}

function getSiteSummonsForMonsterGroup(
  groupName: string,
): MonsterGroupSiteSummon[] {
  const summons: MonsterGroupSiteSummon[] = [];
  for (const [name, entries] of Object.entries(getSiteMonsterIndex())) {
    for (const entry of entries) {
      if (entry.group !== groupName) continue;
      const href = siteMonsterHref(name);
      if (!href) continue;
      summons.push({
        name,
        href,
        monsters: entry.monsters,
      });
    }
  }
  return summons.sort((a, b) => a.name.localeCompare(b.name));
}

function getNativeSummonsForGroup(groupName: string): NativeGroupSummon[] {
  const summons: NativeGroupSummon[] = [];
  for (const [name, entries] of Object.entries(getNativeSummonIndex())) {
    const href = nativeSummonHref(name);
    if (!href) continue;
    for (const entry of entries) {
      if (entry.group !== groupName) continue;
      summons.push({
        name,
        href,
        natives: entry.natives,
      });
    }
  }
  return summons.sort((a, b) => a.name.localeCompare(b.name));
}

function getNativeCivilisationCard(
  groupName: string,
): TTSCardImage | undefined {
  return getNativeIndex()[normalizeTitle(groupName)]?.[0]?.civilisationCard;
}

function mapTileHref(terrain: string, tileName: string): string {
  const params = new URLSearchParams({
    terrain,
    tile: tileName,
    side: "front",
  });
  return `/map-tiles?${params.toString()}`;
}

function siteMonsterHref(name: string): string {
  const slug = slugify(name);
  const site = getSiteBySlug(slug);
  if (site) return `/sites/${site.slug}`;
  const wildernessToken = getWildernessTokenBySlug(slug);
  if (wildernessToken) return `/wilderness-tokens/${wildernessToken.slug}`;
  return "";
}

function nativeSummonHref(name: string): string {
  const slug = slugify(name);
  const location = getCivLocationBySlug(slug);
  if (location) return `/civ-locations/${location.slug}`;
  const wildernessToken = getWildernessTokenBySlug(slug);
  return wildernessToken ? `/wilderness-tokens/${wildernessToken.slug}` : "";
}

function missionTargetsFor(cards: TTSMissionCard[]): MissionTargetLink[] {
  const targets = uniqueStrings(cards.flatMap((card) => card.completeAt ?? []));
  return targets.flatMap((name) => {
    const target = missionTargetFor(name);
    return target ? [target] : [];
  });
}

function missionFeaturesFor(missionName: string): MissionFeatureLink[] {
  const featureNames = Object.entries(getMissionFeatureIndex()).flatMap(
    ([manualMissionName, feature]) => {
      if (manualMissionName !== missionName) return [];
      return Array.isArray(feature) ? feature : [feature];
    },
  );
  return uniqueStrings(featureNames).flatMap((name) => {
    const target = missionFeatureFor(name);
    return target ? [target] : [];
  });
}

function missionKindsFor(cards: TTSMissionCard[]): MissionKind[] {
  const order: MissionKind[] = ["atrocity", "quest", "expedition"];
  const kinds = new Set(
    cards.flatMap((card) => (card.kind ? [card.kind] : [])),
  );
  return order.filter((kind) => kinds.has(kind));
}

function missionTerrainPacksFor(cards: TTSMissionCard[]): MissionTerrainPack[] {
  const order: MissionTerrainPack[] = [
    "neutral",
    "plains",
    "woods",
    "mountains",
    "caves",
    "swamps",
    "riverlands",
    "deserts",
    "oasis",
  ];
  const terrainPacks = new Set(
    cards.flatMap((card) => (card.terrainPack ? [card.terrainPack] : [])),
  );
  return order.filter((terrainPack) => terrainPacks.has(terrainPack));
}

function missionRewardSummariesFor(cards: TTSMissionCard[]): string[] {
  return uniqueStrings(
    cards.flatMap((card) => missionRewardSummaries(card.rewards)),
  );
}

function missionRewardSummaries(
  rewards: TTSMissionRewards | undefined,
): string[] {
  if (!rewards) return [];
  const summaries: string[] = [];
  const complete = missionRewardParts(rewards);
  if (complete.length > 0) summaries.push(`Complete: ${complete.join(", ")}`);
  const steal = missionRewardParts(rewards.steal);
  if (steal.length > 0) summaries.push(`Steal: ${steal.join(", ")}`);
  return summaries;
}

function missionRewardParts(
  rewards: TTSMissionRewards | TTSMissionRewards["steal"] | undefined,
): string[] {
  if (!rewards) return [];
  return [
    ...("attributes" in rewards
      ? missionNumericParts(rewards.attributes, {
          charisma: "Charisma",
          wisdom: "Wisdom",
          intellect: "Intellect",
        })
      : []),
    ...missionNumericParts(rewards.drawCards, {
      deep: "Deep card",
      treasure: "Treasure card",
      item: "Item card",
      spell: "Spell card",
    }),
    ...missionNumericParts(rewards.points, {
      fame: "Fame",
      gold: "Gold",
    }),
    ...(rewards.outlaw
      ? [missionCountLabel(rewards.outlaw, "Outlaw token")]
      : []),
  ];
}

function missionNumericParts<T extends string>(
  values: Partial<Record<T, number>> | undefined,
  labels: Record<T, string>,
): string[] {
  if (!values) return [];
  return (Object.entries(labels) as [T, string][]).flatMap(([key, label]) => {
    const value = values[key];
    return value ? [missionCountLabel(value, label)] : [];
  });
}

function missionCountLabel(count: number, label: string): string {
  if (count === 1) return `+1 ${label}`;
  if (label === "Fame" || label === "Gold") return `+${count} ${label}`;
  return `+${count} ${label}${label.endsWith("s") ? "" : "s"}`;
}

function missionTargetFor(name: string): MissionTargetLink | null {
  const slug = slugify(name);
  const native = getNativeGroupBySlug(slug);
  if (native) {
    return { name, href: `/natives/${native.slug}`, kind: "native" };
  }
  const site = getSiteBySlug(slug);
  if (site) return { name, href: `/sites/${site.slug}`, kind: "site" };
  const merchant = getCivilisationTokenBySlug(slug);
  if (merchant) {
    return {
      name,
      href: `/civilisation-tokens/${merchant.slug}`,
      kind: "merchant",
    };
  }
  const civLocation = getCivLocationBySlug(slug);
  if (civLocation) {
    return {
      name,
      href: `/civ-locations/${civLocation.slug}`,
      kind: "civLocation",
    };
  }
  const wildernessToken = getWildernessTokenBySlug(slug);
  if (wildernessToken) {
    return {
      name,
      href: `/wilderness-tokens/${wildernessToken.slug}`,
      kind: "wildernessToken",
    };
  }
  const mapTile = getMapTiles().find(
    (tile) => normalizeTitle(tile.name) === normalizeTitle(name),
  );
  if (mapTile) {
    return {
      name,
      href: mapTileHref(mapTile.terrain, mapTile.name),
      kind: "mapTile",
    };
  }
  return null;
}

function missionFeatureFor(name: string): MissionFeatureLink | null {
  const native = getNativeGroupByFeatureName(name);
  if (native) {
    return {
      name: native.prettyName,
      href: `/natives/${native.slug}`,
      kind: "native",
    };
  }

  const monsterGroup = getMonsterGroupByFeatureName(name);
  if (monsterGroup) {
    return {
      name: monsterGroup.prettyName,
      href: `/monster-groups/${monsterGroup.slug}`,
      kind: "monsterGroup",
    };
  }

  return null;
}

function getNativeGroupByFeatureName(
  name: string,
): MonsterGroupEntry | undefined {
  return getAllNativeGroups().find((entry) => entry.prettyName === name);
}

function getMonsterGroupByFeatureName(
  name: string,
): MonsterGroupEntry | undefined {
  return getAllMonsterGroups().find((entry) => entry.prettyName === name);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

/**
 * Return cards from `cards.json` whose `tags` include the given tag (e.g.
 * "Item", "Mission", "Merchant"), grouped by nickname and sorted A→Z.
 */
export function getCardsWithTag(tag: string): CardEntry[] {
  const idx = getCardIndex();
  return Object.entries(idx)
    .map(([name, cards]) => ({
      name,
      cards: cards.filter((c) => c.tags?.includes(tag)),
    }))
    .filter(({ cards }) => cards.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}
