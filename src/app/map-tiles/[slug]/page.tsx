import { promises as fs } from "fs";
import { join } from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  MapTileViewer,
  type MapTile,
  type MapTileCivLocation,
  type MapTileMonsterGroup,
  type MapTileMission,
} from "@/components/MapTileViewer";
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
import tiles from "../../../../data/extracted-from-tts/map-tiles.json";

export function generateStaticParams() {
  return getAllMapTiles().map((entry) => ({ slug: entry.slug }));
}

export default async function MapTilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mapTileEntry = getAllMapTiles().find((entry) => entry.slug === slug);
  const selectedTile = withClearingTypes(tiles as MapTile[]).find(
    (tile) => slugify(tile.name) === slug,
  );
  if (!selectedTile) notFound();
  const terrainPack = getAllTerrainPacks().find(
    (pack) => pack.name === (mapTileEntry?.terrainPack ?? selectedTile.terrain),
  );

  const civLocations: MapTileCivLocation[] = getAllCivLocations().map(
    ({ name, slug, location }) => ({
      name,
      slug,
      imageUrl: location.imageURL,
    }),
  );
  const monsterGroups: MapTileMonsterGroup[] = getMonsterGroupsForMapTile(
    selectedTile.terrain,
    selectedTile.name,
  ).flatMap((group) => {
    const entry = getMonsterGroupBySlug(group.slug);
    if (!entry) return [];
    return [
      {
        entry,
        role: group.role,
        tileName: selectedTile.name,
        terrain: selectedTile.terrain,
      },
    ];
  });
  const missions: MapTileMission[] = getMissionsForMapTile(
    selectedTile.terrain,
    selectedTile.name,
  ).map((mission) => ({
    ...mission,
    tileName: selectedTile.name,
    terrain: selectedTile.terrain,
  }));

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
      <div className="mb-8 flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/map-tiles" className="hover:underline">
          Map Tiles
        </Link>
      </div>
      <Suspense fallback={null}>
        <MapTileViewer
          tiles={[selectedTile]}
          civLocations={civLocations}
          monsterGroups={monsterGroups}
          missions={missions}
          mapTileConnections={connectionsData}
          magicIcons={magicIcons}
          terrainPack={terrainPack}
          showTileControls={false}
          headingLevel="h1"
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
