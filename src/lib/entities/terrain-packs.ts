import { getClearingTypeIcon } from "@/lib/clearing-types";
import { terrainPackSummary } from "@/lib/terrain-packs";
import type {
  CivilisationTokenNameEntry,
  EquipmentDeck,
  MerchantEntry,
  TerrainPackEntry,
  TerrainPackTreasureEntry,
  WildernessTokenNameEntry,
} from "@/lib/tts/lookup";
import {
  getAllMerchants,
  getAllTerrainPacks,
  getTerrainPackBySlug,
} from "@/lib/tts/lookup";
import type {
  TerrainPackDetail,
  TerrainPackImageTileDetail,
  TerrainPackTreasureTileDetail,
} from "./types";

const terrainPackDetailsBySlug = new Map<
  string,
  TerrainPackDetail | undefined
>();

export function getAllTerrainPackDetailSlugs(): string[] {
  return getAllTerrainPacks().map((entry) => entry.slug);
}

export function getTerrainPackDetail(
  slug: string,
): TerrainPackDetail | undefined {
  if (terrainPackDetailsBySlug.has(slug)) {
    return terrainPackDetailsBySlug.get(slug);
  }

  const detail = buildTerrainPackDetail(slug);
  terrainPackDetailsBySlug.set(slug, detail);
  return detail;
}

function buildTerrainPackDetail(slug: string): TerrainPackDetail | undefined {
  const entry = getTerrainPackBySlug(slug);
  if (!entry) return undefined;

  const merchants = terrainPackMerchants(entry);
  const wildernessTokenCount = wildernessTokenPackTotalCount(
    entry.wildernessTokens,
    entry.name,
  );

  return {
    entry,
    displayName: terrainPackDisplayName(entry),
    summary: terrainPackSummary(entry),
    boards: entry.boards,
    civilisationTokens: entry.civilisationTokens.map((token) =>
      civilisationTokenTile(token, entry.name),
    ),
    merchants: merchants.map((merchant) => merchantTile(merchant, entry.name)),
    wildernessTokens: entry.wildernessTokens.map((token) =>
      wildernessTokenTile(token, entry.name),
    ),
    wildernessTokenCount,
    wildernessTokenCountLabel: tokenCountLabel(wildernessTokenCount),
    terrainTreasures: entry.terrainTreasures.map(terrainTreasureTile),
    missions: entry.uniqueMissions,
    civLocations: entry.civLocations.map((location) => ({
      key: location.slug,
      href: `/civ-locations/${location.slug}`,
      name: location.name,
      imageUrl: location.location.imageURL,
      imageClassName: "object-cover",
    })),
    nativeMonsterBoxTitle: nativeMonsterBoxTitle(entry),
    uniqueNatives: entry.uniqueNatives,
    uniqueMonsters: entry.uniqueMonsters,
    natives: entry.natives,
    monsters: entry.monsters,
    clearingTypes: entry.clearingTypes.map((clearingType) => ({
      key: clearingType.id,
      href: `/clearing-types/${clearingType.slug}`,
      iconUrl: getClearingTypeIcon(clearingType.id),
      label: clearingType.label,
      percentage: clearingType.percentage,
      percentageLabel: formatPercentage(clearingType.percentage),
      countLabel: `${clearingType.count} clearing${clearingType.count === 1 ? "" : "s"}`,
    })),
    sites: entry.sites.map((site) => ({
      key: site.slug,
      href: site.href,
      name: site.name,
      imageUrl: site.imageURL,
      subtitle: site.subtitle,
      imageClassName: "object-cover",
    })),
    mapTiles: entry.mapTiles.map((tile) => ({
      key: `${tile.terrain}-${tile.name}`,
      href: tile.href,
      name: tile.name,
      imageUrl: tile.imageUrl,
      subtitle: tile.terrain,
      imageClassName: "-rotate-[30deg] object-contain p-4",
    })),
  };
}

function civilisationTokenTile(
  entry: CivilisationTokenNameEntry,
  packName: string,
): TerrainPackImageTileDetail {
  const token =
    entry.tokens.find(
      (tokenImage) =>
        (tokenImage.terrainPack ?? tokenImage.terrainGroup) === packName,
    ) ?? entry.tokens[0];

  return {
    key: entry.slug,
    href: `/civilisation-tokens/${entry.slug}`,
    name: entry.name,
    imageUrl: token.imageSecondaryURL || token.imageURL,
    subtitle: tokenCountLabel(civilisationTokenTotalCount(token)),
    imageClassName: "object-cover",
  };
}

function merchantTile(
  entry: MerchantEntry,
  packName: string,
): TerrainPackImageTileDetail {
  const token =
    entry.tokens.find(
      (tokenImage) =>
        (tokenImage.terrainPack ?? tokenImage.terrainGroup) === packName,
    ) ?? entry.tokens[0];

  return {
    key: entry.slug,
    href: `/merchants/${entry.slug}`,
    name: entry.name,
    imageUrl: token.imageSecondaryURL || token.imageURL,
    subtitle: token.attribute ?? token.gmNotes ?? token.terrainGroup,
    imageClassName: "object-cover",
  };
}

function wildernessTokenTile(
  entry: WildernessTokenNameEntry,
  packName: string,
): TerrainPackImageTileDetail {
  const token =
    entry.tokens.find((tokenImage) => tokenImage.terrain === packName) ??
    entry.tokens[0];

  return {
    key: entry.slug,
    href: `/wilderness-tokens/${entry.slug}`,
    name: entry.name,
    imageUrl: token.imageURL,
    subtitle: tokenCountLabel(wildernessTokenTotalCount(token)),
    imageClassName: "object-cover",
  };
}

function terrainTreasureTile(
  entry: TerrainPackTreasureEntry,
): TerrainPackTreasureTileDetail {
  return {
    key: entry.slug,
    href: `/equipment/${entry.slug}`,
    name: entry.name,
    card: entry.cards[0],
    subtitle: `${entry.decks.map(equipmentDeckLabel).join(" & ")} · ${entry.copies} cop${entry.copies === 1 ? "y" : "ies"}${entry.cards.length > 1 ? ` · ${entry.cards.length} variants` : ""}`,
  };
}

function terrainPackDisplayName(pack: TerrainPackEntry): string {
  return pack.slug === "neutral" ? "Always in use" : pack.name;
}

function civilisationTokenTotalCount(
  token: CivilisationTokenNameEntry["tokens"][number],
): number {
  return token.locations.reduce((sum, location) => sum + location.count, 0);
}

function wildernessTokenPackTotalCount(
  entries: WildernessTokenNameEntry[],
  packName: string,
): number {
  return entries.reduce((sum, entry) => {
    const token =
      entry.tokens.find((tokenImage) => tokenImage.terrain === packName) ??
      entry.tokens[0];
    return sum + wildernessTokenTotalCount(token);
  }, 0);
}

function wildernessTokenTotalCount(
  token: WildernessTokenNameEntry["tokens"][number],
): number {
  return token.locations.reduce((sum, location) => sum + location.count, 0);
}

function tokenCountLabel(count: number): string {
  return `${count} token${count === 1 ? "" : "s"}`;
}

function nativeMonsterBoxTitle(pack: TerrainPackEntry): string {
  return pack.slug === "neutral"
    ? "Native/Monster Groups"
    : "Unique Native/Monster Groups";
}

function terrainPackMerchants(pack: TerrainPackEntry): MerchantEntry[] {
  const merchantNames = new Set(
    pack.boards.flatMap((entry) => entry.board.merchants),
  );
  return getAllMerchants().filter((entry) => merchantNames.has(entry.name));
}

function equipmentDeckLabel(deck: EquipmentDeck): string {
  switch (deck) {
    case "item":
      return "Item";
    case "treasure":
      return "Treasure";
    case "deep-treasure":
      return "Deep Treasure";
    case "legendary":
      return "Legendary";
  }
}

function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}
