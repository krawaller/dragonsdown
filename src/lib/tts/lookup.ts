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
  type CardIndex,
  type ChipIndex,
  type CivLocationIndex,
  type SiteIndex,
  type TTSCardImage,
  type TTSChip,
  type TTSCivLocation,
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

let cachedCardIndex: CardIndex | null = null;
let cachedChipIndex: ChipIndex | null = null;
let cachedSiteIndex: SiteIndex | null = null;
let cachedCivLocIndex: CivLocationIndex | null = null;
let cachedWildernessTokenIndex: WildernessTokenIndex | null = null;
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

/** A card name with the card variants that carry a specific tag. */
export type CardEntry = {
  name: string;
  cards: TTSCardImage[];
};

/** A site entry for the /sites listing. */
export type SiteEntry = {
  name: string;
  site: TTSSite;
};

/** Return all sites, sorted alphabetically by name. */
export function getAllSites(): SiteEntry[] {
  const idx = getSiteIndex();
  return Object.entries(idx)
    .flatMap(([name, sites]) => sites.map((site) => ({ name, site })))
    .sort((a, b) => a.name.localeCompare(b.name));
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

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
