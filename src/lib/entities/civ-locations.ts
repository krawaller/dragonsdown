import { getReleaseByBoxName } from "@/lib/releases";
import {
  getAllCivLocations,
  getAllMapTiles,
  getAllTerrainPacks,
  getCivLocationBySlug,
  getMissionsForTarget,
  getNativeGroupBySlug,
  getNativeGroupsForCivLocation,
  getWildernessTokenBySlug,
  type MapTileEntry,
  type TerrainPackEntry,
  type WildernessTokenNameEntry,
} from "@/lib/tts/lookup";
import type { CategoryChip, CivLocationDetail } from "./types";

const civLocationDetailsBySlug = new Map<
  string,
  CivLocationDetail | undefined
>();

export function getAllCivLocationDetailSlugs(): string[] {
  return getAllCivLocations().map((entry) => entry.slug);
}

export function getCivLocationDetail(
  slug: string,
): CivLocationDetail | undefined {
  if (civLocationDetailsBySlug.has(slug)) {
    return civLocationDetailsBySlug.get(slug);
  }

  const detail = buildCivLocationDetail(slug);
  civLocationDetailsBySlug.set(slug, detail);
  return detail;
}

function buildCivLocationDetail(slug: string): CivLocationDetail | undefined {
  const entry = getCivLocationBySlug(slug);
  if (!entry) return undefined;

  const { name, location } = entry;
  const mapTile = getAllMapTiles().find(
    (tile) => tile.name === name && tile.clearings.length === 4,
  );
  const wildernessToken = getWildernessTokenBySlug(entry.slug);
  const terrainPackName =
    location.terrainPack ??
    mapTile?.terrainPack ??
    wildernessToken?.tokens[0]?.terrainPack ??
    wildernessToken?.tokens[0]?.terrain;
  const terrainPack = getAllTerrainPacks().find(
    (pack) => pack.name === terrainPackName,
  );
  const releaseBox = location.box ?? mapTile?.box ?? terrainPack?.box;
  const release = releaseBox ? getReleaseByBoxName(releaseBox) : undefined;
  const nativeGroups = getNativeGroupsForCivLocation(name).flatMap((group) => {
    const nativeGroup = getNativeGroupBySlug(group.slug);
    return nativeGroup ? [nativeGroup] : [];
  });

  return {
    entry,
    subtitle: placementLabel(mapTile),
    categories: civLocationHeaderCategories({
      release,
      entry,
      terrainPack,
      mapTile,
      wildernessToken: mapTile ? undefined : wildernessToken,
    }),
    mapTile,
    wildernessToken,
    nativeGroups,
    missions: getMissionsForTarget(name),
  };
}

function civLocationHeaderCategories({
  release,
  entry,
  terrainPack,
  mapTile,
  wildernessToken,
}: {
  release?: ReturnType<typeof getReleaseByBoxName>;
  entry: NonNullable<ReturnType<typeof getCivLocationBySlug>>;
  terrainPack?: TerrainPackEntry;
  mapTile?: MapTileEntry;
  wildernessToken?: WildernessTokenNameEntry;
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
      href: "/civ-locations",
      label: "Component",
      value: "Civ locations",
      imageUrl: entry.location.imageURL,
    },
    ...(terrainPack
      ? [
          {
            href: `/terrain-packs/${terrainPack.slug}`,
            label: "Terrain pack",
            value:
              terrainPack.slug === "neutral"
                ? "Always in use"
                : terrainPack.name,
            imageUrl: terrainPack.iconUrl,
          },
        ]
      : []),
    ...(mapTile
      ? [
          {
            href: mapTile.href,
            label: "Map tile",
            value: mapTile.name,
            imageUrl: mapTile.imageUrl,
            imageFit: "contain" as const,
          },
        ]
      : []),
    ...(wildernessToken
      ? [
          {
            href: `/wilderness-tokens/${wildernessToken.slug}`,
            label: "Wilderness token",
            value: wildernessToken.name,
            imageUrl: wildernessToken.tokens[0]?.imageURL,
          },
        ]
      : []),
  ];
}

function placementLabel(mapTile: MapTileEntry | undefined): string {
  return mapTile ? "Map tile location" : "Wilderness token location";
}

function releaseCategoryValue(
  release: NonNullable<ReturnType<typeof getReleaseByBoxName>>,
): string {
  return release.sourceSlug === "core" ? "Core box" : release.title;
}
