import type { MapTile } from "@/components/MapTileViewer";
import { getClearingTypeTiles } from "@/lib/clearing-types";
import { MAGIC_TYPES } from "@/lib/magic";
import { resolveMagicRulebookLinks } from "@/lib/rulebook-links";
import { slugify } from "@/lib/slug";
import {
  getAllCivLocations,
  getAllMapTiles,
  getAllTerrainPacks,
  getMissionsForMapTile,
  getMonsterGroupBySlug,
  getMonsterGroupsForMapTile,
} from "@/lib/tts/lookup";
import connectionsData from "../../../data/manual/map-tile-connections.json";
import tiles from "../../../data/extracted-from-tts/map-tiles.json";
import type { MapTileConnectionsDetail, MapTileDetail } from "./types";

const mapTileDetailsBySlug = new Map<
  string,
  Promise<MapTileDetail | undefined>
>();
let magicIconsCache: Promise<MapTileDetail["magicIcons"]> | undefined;

export function getAllMapTileDetailSlugs(): string[] {
  return getAllMapTiles().map((entry) => entry.slug);
}

export function getMapTileDetail(
  slug: string,
): Promise<MapTileDetail | undefined> {
  const cached = mapTileDetailsBySlug.get(slug);
  if (cached) return cached;

  const detail = buildMapTileDetail(slug);
  mapTileDetailsBySlug.set(slug, detail);
  return detail;
}

async function buildMapTileDetail(
  slug: string,
): Promise<MapTileDetail | undefined> {
  const entry = getAllMapTiles().find((tile) => tile.slug === slug);
  const tile = withClearingTypes(tiles as MapTile[]).find(
    (candidate) => slugify(candidate.name) === slug,
  );
  if (!tile) return undefined;

  const terrainPack = getAllTerrainPacks().find(
    (pack) => pack.name === (entry?.terrainPack ?? tile.terrain),
  );

  return {
    entry,
    tile,
    civLocations: getAllCivLocations().map(({ name, slug, location }) => ({
      name,
      slug,
      imageUrl: location.imageURL,
    })),
    monsterGroups: getMonsterGroupsForMapTile(tile.terrain, tile.name).flatMap(
      (group) => {
        const monsterGroup = getMonsterGroupBySlug(group.slug);
        if (!monsterGroup) return [];
        return [
          {
            entry: monsterGroup,
            role: group.role,
            tileName: tile.name,
            terrain: tile.terrain,
          },
        ];
      },
    ),
    missions: getMissionsForMapTile(tile.terrain, tile.name).map((mission) => ({
      ...mission,
      tileName: tile.name,
      terrain: tile.terrain,
    })),
    mapTileConnections: connectionsData as MapTileConnectionsDetail,
    magicIcons: await magicIcons(),
    terrainPack,
  };
}

function withClearingTypes(mapTiles: MapTile[]): MapTile[] {
  const clearingTypesByTile = new Map(
    getClearingTypeTiles().map((tile) => [tileKey(tile), tile]),
  );
  return mapTiles.map((tile) => {
    const clearingTypeTile = clearingTypesByTile.get(tileKey(tile));
    if (!clearingTypeTile) return tile;
    return {
      ...tile,
      clearings: tile.clearings.map((clearing, index) => ({
        ...clearing,
        type: clearingTypeTile.clearings[index]?.type,
      })),
    };
  });
}

async function magicIcons(): Promise<MapTileDetail["magicIcons"]> {
  magicIconsCache ??= Promise.all(
    MAGIC_TYPES.map(async (type) => {
      const icon = (await resolveMagicRulebookLinks(type.id, "core")).find(
        (link) => Boolean(link.icon),
      )?.icon;
      return [type.id, icon ?? ""] as const;
    }),
  ).then((entries) => Object.fromEntries(entries));
  return magicIconsCache;
}

function tileKey(tile: { terrain: string; name: string }): string {
  return `${tile.terrain}\u0000${tile.name}`;
}
