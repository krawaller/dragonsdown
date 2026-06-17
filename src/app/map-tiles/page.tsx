import Link from "next/link";
import { Suspense } from "react";
import {
  MapTileViewer,
  type MapTile,
  type MapTileCivLocation,
  type MapTileMonsterGroup,
  type MapTileMission,
} from "@/components/MapTileViewer";
import {
  getAllCivLocations,
  getMissionsForMapTile,
  getMonsterGroupsForMapTile,
} from "@/lib/tts/lookup";
import { getClearingTypeTiles } from "@/lib/clearing-types";
import { MAGIC_TYPES } from "@/lib/magic";
import { resolveMagicRulebookLinks } from "@/lib/rulebook-links";
import tiles from "../../../data/extracted-from-tts/map-tiles.json";
import { promises as fs } from "fs";
import { join } from "path";

export default async function MapTilesPage() {
  const mapTiles = withClearingTypes(tiles as MapTile[]);
  const civLocations: MapTileCivLocation[] = getAllCivLocations().map(
    ({ name, slug, location }) => ({
      name,
      slug,
      imageUrl: location.imageURL,
    }),
  );
  const monsterGroups: MapTileMonsterGroup[] = mapTiles.flatMap((tile) =>
    getMonsterGroupsForMapTile(tile.terrain, tile.name).map((group) => ({
      ...group,
      tileName: tile.name,
      terrain: tile.terrain,
    })),
  );
  const missions: MapTileMission[] = mapTiles.flatMap((tile) =>
    getMissionsForMapTile(tile.terrain, tile.name).map((mission) => ({
      tileName: tile.name,
      terrain: tile.terrain,
      name: mission.name,
      slug: mission.slug,
      descriptions: mission.descriptions,
    })),
  );

  const connectionsPath = join(
    process.cwd(),
    "data/manual/map-tile-connections.json",
  );
  const connectionsData = JSON.parse(
    await fs.readFile(connectionsPath, "utf-8"),
  ) as Record<
    string,
    { front: { paths: unknown[] }; back: { paths: unknown[] } }
  >;
  const magicIcons = Object.fromEntries(
    await Promise.all(
      MAGIC_TYPES.map(async (type) => {
        const icon = (await resolveMagicRulebookLinks(type.id, "core")).find(
          (link) => Boolean(link.icon),
        )?.icon;
        return [type.id, icon ?? ""] as const;
      }),
    ),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-8">Map Tiles</h1>
      <Suspense fallback={null}>
        <MapTileViewer
          tiles={mapTiles}
          civLocations={civLocations}
          monsterGroups={monsterGroups}
          missions={missions}
          mapTileConnections={connectionsData}
          magicIcons={magicIcons}
        />
      </Suspense>
    </main>
  );
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

function tileKey(tile: { terrain: string; name: string }): string {
  return `${tile.terrain}\u0000${tile.name}`;
}
