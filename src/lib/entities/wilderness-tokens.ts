import { getReleaseByBoxName } from "@/lib/releases";
import { resolveWildernessTokenRulebookLinks } from "@/lib/rulebook-links";
import {
  getAllSites,
  getAllTerrainPacks,
  getAllWildernessTokenNames,
  getBoardsForMerchant,
  getBoardsForSite,
  getCivLocationBySlug,
  getMissionsForTarget,
  getSiteBySlug,
  getWildernessTokenBySlug,
  type BoardEntry,
  type CivLocationEntry,
  type SiteEntry,
  type TerrainPackEntry,
  type WildernessTokenListEntry,
} from "@/lib/tts/lookup";
import type {
  CategoryChip,
  WildernessTokenDetail,
  WildernessTokenOccurrenceDetail,
} from "./types";

const wildernessTokenDetailsBySlug = new Map<
  string,
  Promise<WildernessTokenDetail | undefined>
>();

export function getAllWildernessTokenDetailSlugs(): string[] {
  return getAllWildernessTokenNames().map((entry) => entry.slug);
}

export function getWildernessTokenDetail(
  slug: string,
): Promise<WildernessTokenDetail | undefined> {
  const cached = wildernessTokenDetailsBySlug.get(slug);
  if (cached) return cached;

  const detail = buildWildernessTokenDetail(slug);
  wildernessTokenDetailsBySlug.set(slug, detail);
  return detail;
}

async function buildWildernessTokenDetail(
  slug: string,
): Promise<WildernessTokenDetail | undefined> {
  const entry = getWildernessTokenBySlug(slug);
  if (!entry) return undefined;

  const civLocation = getCivLocationBySlug(entry.slug);
  const siteLocation = civLocation ? undefined : getSiteBySlug(entry.slug);
  const boards = uniqueBoards([
    ...getBoardsForSite(entry.name),
    ...getBoardsForMerchant(entry.name),
  ]);
  const terrainPacksByName = new Map(
    getAllTerrainPacks().map((pack) => [pack.name, pack]),
  );
  const occurrences = entry.tokens.map((token) =>
    wildernessTokenOccurrence(token, terrainPacksByName),
  );
  const terrainPacks = uniqueTerrainPacks(
    occurrences.flatMap((occurrence) =>
      occurrence.terrainPack ? [occurrence.terrainPack] : [],
    ),
  );
  const releaseBox = uniqueDefinedValue(
    entry.tokens.map(
      (token) => token.box ?? terrainPacksByName.get(token.terrain)?.box,
    ),
  );
  const release = releaseBox ? getReleaseByBoxName(releaseBox) : undefined;
  const total = occurrences.reduce(
    (sum, occurrence) => sum + occurrence.count,
    0,
  );

  return {
    entry,
    total,
    totalLabel: tokenCountLabel(total),
    categories: wildernessTokenHeaderCategories({
      release,
      entry,
      terrainPacks,
      civLocation,
      siteLocation,
    }),
    boards,
    showBoardPositions: !civLocation && !siteLocation,
    missions: getMissionsForTarget(entry.name),
    rulebookLinks: await resolveWildernessTokenRulebookLinks(entry.slug),
    occurrences,
    siteTokenSites:
      entry.slug === "site"
        ? getAllSites().filter((site) => site.kind === "proper")
        : [],
  };
}

function wildernessTokenHeaderCategories({
  release,
  entry,
  terrainPacks,
  civLocation,
  siteLocation,
}: {
  release?: ReturnType<typeof getReleaseByBoxName>;
  entry: NonNullable<ReturnType<typeof getWildernessTokenBySlug>>;
  terrainPacks: TerrainPackEntry[];
  civLocation?: CivLocationEntry;
  siteLocation?: SiteEntry;
}): CategoryChip[] {
  return [
    ...(release
      ? [
          {
            href: `/releases/${release.slug}`,
            label: "Release",
            value: releaseCategoryValue(release),
            imageUrl: release.iconUrl,
            imageFit: "contain" as const,
          },
        ]
      : []),
    {
      href: "/wilderness-tokens",
      label: "Component",
      value: "Wilderness tokens",
      imageUrl: entry.tokens[0]?.imageURL,
    },
    ...terrainPacks.map((terrainPack) => ({
      href: `/terrain-packs/${terrainPack.slug}`,
      label: "Terrain pack",
      value:
        terrainPack.slug === "neutral" ? "Always in use" : terrainPack.name,
      imageUrl: terrainPack.iconUrl,
    })),
    ...(civLocation
      ? [
          {
            href: `/civ-locations/${civLocation.slug}`,
            label: "Civ location",
            value: civLocation.name,
            imageUrl: civLocation.location.imageURL,
          },
        ]
      : []),
    ...(siteLocation
      ? [
          {
            href: `/sites/${siteLocation.slug}`,
            label: "Treasure site",
            value: siteLocation.name,
            imageUrl: siteLocation.site.imageSecondaryURL,
          },
        ]
      : []),
  ];
}

function wildernessTokenOccurrence(
  token: WildernessTokenListEntry,
  terrainPacksByName: Map<string, TerrainPackEntry>,
): WildernessTokenOccurrenceDetail {
  const terrainPack = terrainPacksByName.get(token.terrain);
  return {
    key: `${token.terrain}-${token.imageURL}`,
    terrain: token.terrain,
    href: terrainPack ? `/terrain-packs/${terrainPack.slug}` : "/terrain-packs",
    terrainPack,
    imageUrl: token.imageURL,
    count: tokenTotalCount(token),
  };
}

function tokenTotalCount(token: WildernessTokenListEntry): number {
  return token.locations.reduce((sum, loc) => sum + loc.count, 0);
}

function tokenCountLabel(count: number): string {
  return `${count} token${count === 1 ? "" : "s"}`;
}

function uniqueTerrainPacks(packs: TerrainPackEntry[]): TerrainPackEntry[] {
  return [...new Map(packs.map((pack) => [pack.slug, pack])).values()];
}

function uniqueBoards(boards: BoardEntry[]): BoardEntry[] {
  return [...new Map(boards.map((board) => [board.slug, board])).values()];
}

function uniqueDefinedValue<T extends string>(
  values: (T | undefined)[],
): T | undefined {
  const uniqueValues = new Set(
    values.filter((value): value is T => value !== undefined),
  );
  return uniqueValues.size === 1 ? [...uniqueValues][0] : undefined;
}

function releaseCategoryValue(
  release: NonNullable<ReturnType<typeof getReleaseByBoxName>>,
): string {
  return release.sourceSlug === "core" ? "Core box" : release.title;
}
