/**
 * Server-side lookup over the baked TTS indexes (cards and chips).
 *
 * Loaded once at module init (like RULEBOOKS); used by SectionView to decide
 * whether to render a "view card" button for a given section title.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  normalizeTitle,
  prettifyChipName,
  resolveCards,
  type AliasMap,
  type TTSBoard,
  type CardIndex,
  type ChipIndex,
  type CivLocationIndex,
  type MapTileMonsterIndex,
  type MissionIndex,
  type MissionKind,
  type NativeSummonIndex,
  type SiteIndex,
  type TTSCardImage,
  type TTSChip,
  type TTSMissionCard,
  type TTSMissionRewards,
  type TTSCivLocation,
  type TTSCivilisationToken,
  type TTSSiteMonsterGroup,
  type TTSSite,
  type TTSWildernessToken,
  type WildernessTokenIndex,
} from ".";
import aliasesData from "./aliases.json";

const CARDS_FILE = path.join(process.cwd(), "data", "tts", "cards.json");
const CHIPS_FILE = path.join(process.cwd(), "data", "tts", "chips.json");
const SITES_FILE = path.join(process.cwd(), "data", "tts", "sites.json");
const CIVLOCS_FILE = path.join(
  process.cwd(),
  "data",
  "tts",
  "civlocations.json",
);
const WILDERNESS_TOKENS_FILE = path.join(
  process.cwd(),
  "data",
  "tts",
  "wilderness-tokens.json",
);
const CIVILISATION_TOKENS_FILE = path.join(
  process.cwd(),
  "data",
  "tts",
  "civilisation-tokens.json",
);
const BOARDS_FILE = path.join(process.cwd(), "data", "tts", "boards.json");
const SITE_MONSTERS_FILE = path.join(
  process.cwd(),
  "data",
  "tts",
  "site-monsters.json",
);
const MAP_TILE_MONSTERS_FILE = path.join(
  process.cwd(),
  "data",
  "tts",
  "map-tile-monsters.json",
);
const NATIVE_SUMMONS_FILE = path.join(
  process.cwd(),
  "data",
  "tts",
  "native-summons.json",
);
const MISSIONS_FILE = path.join(process.cwd(), "data", "tts", "missions.json");

export const CIVILISATION_TOKEN_NEUTRAL_TERRAIN = "Neutral";

let cachedCardIndex: CardIndex | null = null;
let cachedChipIndex: ChipIndex | null = null;
let cachedSiteIndex: SiteIndex | null = null;
let cachedCivLocIndex: CivLocationIndex | null = null;
let cachedWildernessTokenIndex: WildernessTokenIndex | null = null;
let cachedCivilisationTokenIndex: TTSCivilisationToken[] | null = null;
let cachedBoardIndex: TTSBoard[] | null = null;
let cachedSiteMonsterIndex: Record<string, TTSSiteMonsterGroup[]> | null = null;
let cachedMapTileMonsterIndex: MapTileMonsterIndex | null = null;
let cachedNativeSummonIndex: NativeSummonIndex | null = null;
let cachedMissionIndex: MissionIndex | null = null;
let cachedAliases: AliasMap | null = null;

function getCardIndex(): CardIndex {
  if (cachedCardIndex !== null) return cachedCardIndex;
  cachedCardIndex = readJsonOrEmpty<CardIndex>(CARDS_FILE);
  return cachedCardIndex;
}

function getChipIndex(): ChipIndex {
  if (cachedChipIndex !== null) return cachedChipIndex;
  cachedChipIndex = readJsonOrEmpty<ChipIndex>(CHIPS_FILE);
  return cachedChipIndex;
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
  cachedWildernessTokenIndex = readJsonOrEmpty<WildernessTokenIndex>(
    WILDERNESS_TOKENS_FILE,
  );
  return cachedWildernessTokenIndex;
}

function getCivilisationTokenIndex(): TTSCivilisationToken[] {
  if (cachedCivilisationTokenIndex !== null)
    return cachedCivilisationTokenIndex;
  const data = readJsonOrEmpty<unknown>(CIVILISATION_TOKENS_FILE);
  cachedCivilisationTokenIndex = Array.isArray(data)
    ? (data as TTSCivilisationToken[])
    : [];
  return cachedCivilisationTokenIndex;
}

function getBoardIndex(): TTSBoard[] {
  if (cachedBoardIndex !== null) return cachedBoardIndex;
  const data = readJsonOrEmpty<unknown>(BOARDS_FILE);
  cachedBoardIndex = Array.isArray(data) ? (data as TTSBoard[]) : [];
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

function getNativeSummonIndex(): NativeSummonIndex {
  if (cachedNativeSummonIndex !== null) return cachedNativeSummonIndex;
  cachedNativeSummonIndex =
    readJsonOrEmpty<NativeSummonIndex>(NATIVE_SUMMONS_FILE);
  return cachedNativeSummonIndex;
}

function getMissionIndex(): MissionIndex {
  if (cachedMissionIndex !== null) return cachedMissionIndex;
  cachedMissionIndex = readJsonOrEmpty<MissionIndex>(MISSIONS_FILE);
  return cachedMissionIndex;
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
  | "wildernessToken";

export type MissionTargetLink = {
  name: string;
  href: string;
  kind: MissionTargetKind;
};

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
  rewardSummaries?: string[];
  targets?: MissionTargetLink[];
};

export type MissionEntry = Omit<CardEntry, "cards"> & {
  slug: string;
  cards: TTSMissionCard[];
  descriptions: string[];
  kinds: MissionKind[];
  rewardSummaries: string[];
  targets: MissionTargetLink[];
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
      rewardSummaries: missionRewardSummariesFor(cards),
      targets: missionTargetsFor(cards),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getMissionsForTarget(targetName: string): MissionEntry[] {
  const targetKey = normalizeTitle(targetName);
  return getAllMissions().filter((entry) =>
    entry.cards.some((card) =>
      card.completeAt?.some((target) => normalizeTitle(target) === targetKey),
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

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  const namesByImage = monsterNamesByImageForGroup(groupName);
  return chips
    .map((chip) => ({
      ...chip,
      monsterName: namesByImage.get(chip.imageURL),
    }))
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
    (a.monsterName ?? "").localeCompare(b.monsterName ?? "") ||
    a.imageURL.localeCompare(b.imageURL)
  );
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

function missionKindsFor(cards: TTSMissionCard[]): MissionKind[] {
  const order: MissionKind[] = ["atrocity", "quest", "expedition"];
  const kinds = new Set(
    cards.flatMap((card) => (card.kind ? [card.kind] : [])),
  );
  return order.filter((kind) => kinds.has(kind));
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
    ...(rewards.outlaw ? [missionCountLabel(rewards.outlaw, "Outlaw")] : []),
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
  return null;
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
