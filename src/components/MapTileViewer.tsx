"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { MagicCube, type MagicIcons } from "@/components/MagicCube";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ClearingTypeId } from "@/lib/clearing-types";

const TILE_COORDINATE_EXTENT = 3;
const TILE_DISPLAY_ROTATION_DEGREES = -30;
const CLEARING_MARKER_CLOCKWISE_ADJUSTMENT_DEGREES = 30;
const CLEARING_MARKER_RADIUS_SCALE = 0.76;

export type MapTile = {
  name: string;
  terrain: string;
  imageUrl: string;
  imageSecondaryUrl: string;
  clearings: MapTileClearing[];
};

export type MapTileClearing = {
  x: number;
  y: number;
  type?: [ClearingTypeId, ClearingTypeId];
};

export type MapTileCivLocation = {
  name: string;
  slug: string;
  imageUrl: string;
};

export type MapTileMonsterGroup = {
  tileName: string;
  terrain: string;
  name: string;
  slug: string;
  role: "wandering" | "local";
};

export type MapTileMission = {
  tileName: string;
  terrain: string;
  name: string;
  slug: string;
  descriptions: string[];
};

export function MapTileViewer({
  tiles,
  civLocations,
  monsterGroups,
  missions,
  mapTileConnections,
  magicIcons,
}: {
  tiles: MapTile[];
  civLocations: MapTileCivLocation[];
  monsterGroups: MapTileMonsterGroup[];
  missions: MapTileMission[];
  mapTileConnections?: Record<
    string,
    { front: { paths: unknown[] }; back: { paths: unknown[] } }
  >;
  magicIcons?: MagicIcons;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const terrains = useMemo(
    () => [...new Set(tiles.map((tile) => tile.terrain))].sort(),
    [tiles],
  );
  const terrainParam = searchParams.get("terrain") ?? "";
  const terrain = terrains.includes(terrainParam)
    ? terrainParam
    : (terrains[0] ?? "");
  const sideParam = searchParams.get("side") ?? "front";
  const showBack = sideParam === "back";

  const terrainTiles = useMemo(
    () => tiles.filter((tile) => tile.terrain === terrain),
    [terrain, tiles],
  );
  const tileParam = searchParams.get("tile") ?? "";
  const selectedTile =
    terrainTiles.find((tile) => tile.name === tileParam) ?? terrainTiles[0];
  const imageUrl = showBack
    ? selectedTile?.imageSecondaryUrl
    : selectedTile?.imageUrl;
  const selectedCivLocation =
    selectedTile?.clearings.length === 4
      ? civLocations.find((location) => location.name === selectedTile.name)
      : undefined;
  const selectedMonsterGroups = selectedTile
    ? monsterGroups.filter(
        (group) =>
          group.terrain === selectedTile.terrain &&
          group.tileName === selectedTile.name,
      )
    : [];
  const selectedMissions = selectedTile
    ? missions.filter(
        (mission) =>
          mission.terrain === selectedTile.terrain &&
          mission.tileName === selectedTile.name,
      )
    : [];

  useEffect(() => {
    if (!selectedTile) return;
    const hasValidTerrain = terrains.includes(terrainParam);
    const hasValidTile = terrainTiles.some((tile) => tile.name === tileParam);
    const hasValidSide = sideParam === "front" || sideParam === "back";
    if (hasValidTerrain && hasValidTile && hasValidSide) return;

    const nextParams = paramsFor({
      searchParams,
      terrain,
      tile: selectedTile.name,
      side: showBack ? "back" : "front",
    });
    const nextUrl = `${pathname}?${nextParams.toString()}`;
    const currentUrl = `${pathname}?${searchParams.toString()}`;
    if (nextUrl !== currentUrl) router.replace(nextUrl, { scroll: false });
  }, [
    pathname,
    router,
    searchParams,
    selectedTile,
    showBack,
    sideParam,
    terrain,
    terrainParam,
    terrains,
    terrainTiles,
    tileParam,
  ]);

  function selectTerrain(nextTerrain: string) {
    const nextTile = tiles.find((tile) => tile.terrain === nextTerrain);
    updateParams({
      terrain: nextTerrain,
      tile: nextTile?.name ?? "",
      side: showBack ? "back" : "front",
    });
  }

  function selectTile(nextTile: string) {
    updateParams({
      terrain,
      tile: nextTile,
      side: showBack ? "back" : "front",
    });
  }

  function selectSide(nextShowBack: boolean) {
    updateParams({
      terrain,
      tile: selectedTile?.name ?? "",
      side: nextShowBack ? "back" : "front",
    });
  }

  function updateParams(next: {
    terrain: string;
    tile: string;
    side: "front" | "back";
  }) {
    const nextParams = paramsFor({ searchParams, ...next });
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }

  if (!selectedTile || !imageUrl) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No map tiles found.
      </p>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
      <form className="space-y-5 rounded-lg border border-zinc-200 dark:border-zinc-800 p-5">
        <label className="block">
          <span className="block text-sm font-medium mb-2">Terrain</span>
          <select
            value={terrain}
            onChange={(event) => selectTerrain(event.target.value)}
            className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
          >
            {terrains.map((terrainOption) => (
              <option key={terrainOption} value={terrainOption}>
                {terrainOption}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-sm font-medium mb-2">Tile</span>
          <select
            value={selectedTile.name}
            onChange={(event) => selectTile(event.target.value)}
            className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
          >
            {terrainTiles.map((tile) => (
              <option key={tile.name} value={tile.name}>
                {tile.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={showBack}
            onChange={(event) => selectSide(event.target.checked)}
            className="size-4 rounded border-zinc-300 dark:border-zinc-700"
          />
          Back
        </label>
      </form>

      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{selectedTile.name}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {selectedTile.terrain} · {selectedTile.clearings.length} clearings
              · {showBack ? "back" : "front"}
            </p>
          </div>
        </div>

        {mapTileConnections && selectedTile && (
          <SecretPathMagicColors
            tileName={selectedTile.name}
            side={showBack ? "back" : "front"}
            connections={mapTileConnections}
            magicIcons={magicIcons}
          />
        )}

        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900">
          <div className="mx-auto flex aspect-square max-h-[72vh] w-full items-center justify-center p-[4%]">
            <div className="relative h-full w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={`${selectedTile.name} ${showBack ? "back" : "front"}`}
                className="absolute inset-0 block h-full w-full -rotate-[30deg] object-contain"
              />
              <div className="absolute inset-0">
                {selectedTile.clearings.map((clearing, index) => {
                  const clearingType = clearing.type?.[showBack ? 1 : 0];
                  const markerClass = clearingType
                    ? CLEARING_TYPE_MARKER_CLASSES[clearingType]
                    : "bg-sky-400/30 ring-sky-700/70";
                  const className = `absolute size-[15%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 ring-1 transition ${markerClass}`;
                  if (!clearingType) {
                    return (
                      <span
                        key={`${clearing.x}-${clearing.y}-${index}`}
                        aria-hidden="true"
                        className={className}
                        style={clearingStyle(clearing)}
                      />
                    );
                  }

                  const clearingTypeLabel = CLEARING_TYPE_LABELS[clearingType];
                  return (
                    <Link
                      key={`${clearing.x}-${clearing.y}-${index}`}
                      href={`/clearing-types/${clearingType}`}
                      aria-label={`${selectedTile.name} ${showBack ? "back" : "front"} ${clearingTypeLabel} clearing`}
                      className={`${className} group z-10 hover:z-20 hover:scale-105 hover:ring-2 hover:ring-zinc-950/70 focus:outline-none focus:ring-2 focus:ring-zinc-950/80 dark:hover:ring-white/80 dark:focus:ring-white/90`}
                      style={clearingStyle(clearing)}
                    >
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-950 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg ring-1 ring-white/20 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 dark:bg-white dark:text-zinc-950">
                        {clearingTypeLabel}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        {selectedCivLocation && (
          <Link
            href={`/civ-locations/${selectedCivLocation.slug}`}
            className="mt-4 inline-flex max-w-full items-center gap-3 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-2 pr-3 text-sm hover:ring-2 hover:ring-zinc-400 transition"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedCivLocation.imageUrl}
              alt={selectedCivLocation.name}
              className="block size-16 shrink-0 rounded object-cover"
            />
            <span className="min-w-0">
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                Civ location
              </span>
              <span className="block truncate font-medium">
                {selectedCivLocation.name}
              </span>
            </span>
          </Link>
        )}
        {selectedMonsterGroups.length > 0 && (
          <section className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Monster Groups</h3>
            <div className="flex flex-wrap gap-2">
              {selectedMonsterGroups.map((group) => (
                <Link
                  key={`${group.role}-${group.slug}`}
                  href={`/monster-groups/${group.slug}`}
                  className="rounded border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <span className="font-medium">{group.name}</span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    {group.role}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
        {selectedMissions.length > 0 && (
          <section className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Missions</h3>
            <div className="flex flex-wrap gap-2">
              {selectedMissions.map((mission) => (
                <Link
                  key={mission.slug}
                  href={`/missions/${mission.slug}`}
                  className="rounded border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <span className="font-medium">{mission.name}</span>
                  {mission.descriptions.length > 0 && (
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                      {mission.descriptions[0]}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}

function paramsFor({
  searchParams,
  terrain,
  tile,
  side,
}: {
  searchParams: { toString(): string };
  terrain: string;
  tile: string;
  side: "front" | "back";
}) {
  const params = new URLSearchParams(searchParams.toString());
  params.set("terrain", terrain);
  params.set("tile", tile);
  params.set("side", side);
  return params;
}

const CLEARING_TYPE_MARKER_CLASSES: Record<ClearingTypeId, string> = {
  plains: "bg-white/45 ring-zinc-700/70",
  caves: "bg-black/35 ring-black/80",
  mountains: "bg-red-500/35 ring-red-900/70",
  woods: "bg-green-500/35 ring-green-900/70",
  swamps: "bg-yellow-300/45 ring-yellow-800/70",
  river: "bg-blue-500/35 ring-blue-900/70",
  desert: "bg-orange-500/35 ring-orange-900/70",
};

const CLEARING_TYPE_LABELS: Record<ClearingTypeId, string> = {
  plains: "Plains",
  caves: "Caves",
  mountains: "Mountains",
  woods: "Woods",
  swamps: "Swamps",
  river: "River",
  desert: "Desert",
};

function clearingStyle(clearing: { x: number; y: number }) {
  const rotated = rotateClearing(
    {
      x: clearing.x * CLEARING_MARKER_RADIUS_SCALE,
      y: clearing.y * CLEARING_MARKER_RADIUS_SCALE,
    },
    -TILE_DISPLAY_ROTATION_DEGREES -
      CLEARING_MARKER_CLOCKWISE_ADJUSTMENT_DEGREES,
  );
  return {
    left: `${50 + (rotated.x / (TILE_COORDINATE_EXTENT * 2)) * 100}%`,
    top: `${50 - (rotated.y / (TILE_COORDINATE_EXTENT * 2)) * 100}%`,
  };
}

function rotateClearing(clearing: { x: number; y: number }, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: clearing.x * cos - clearing.y * sin,
    y: clearing.x * sin + clearing.y * cos,
  };
}

function SecretPathMagicColors({
  tileName,
  side,
  connections,
  magicIcons,
}: {
  tileName: string;
  side: "front" | "back";
  connections: Record<
    string,
    { front: { paths: unknown[] }; back: { paths: unknown[] } }
  >;
  magicIcons?: MagicIcons;
}) {
  const tileConnections = connections[tileName];
  if (!tileConnections) return null;

  const sidePaths =
    side === "front"
      ? tileConnections.front?.paths
      : tileConnections.back?.paths;
  if (!Array.isArray(sidePaths) || sidePaths.length === 0) return null;

  const magicColors = new Set<string>();
  for (const path of sidePaths) {
    if (
      Array.isArray(path) &&
      path.length >= 3 &&
      typeof path[2] === "string"
    ) {
      magicColors.add(path[2]);
    }
  }

  if (magicColors.size === 0) return null;

  const colorLabels: Record<string, string> = {
    black: "Black",
    blue: "Blue",
    gray: "Gray",
    green: "Green",
    purple: "Purple",
    white: "White",
    yellow: "Yellow",
    universal: "Universal",
  };

  const sortedColors = Array.from(magicColors).sort();

  return (
    <div className="mb-4 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4">
      <p className="text-sm font-medium mb-2">Secret Path Magic:</p>
      <div className="flex flex-wrap gap-2">
        {sortedColors.map((color) => (
          <Link
            key={color}
            href={`/magic/${color}`}
            className="inline-flex items-center gap-2 rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900 transition-colors"
          >
            {magicIcons ? (
              <MagicCube
                cube={{ count: 1, color, type: "cube" }}
                magicIcons={magicIcons}
              />
            ) : null}
            <span>{colorLabels[color] || color}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
