"use client";

import { useMemo, useState } from "react";

export type MapTile = {
  name: string;
  terrain: string;
  imageUrl: string;
  imageSecondaryUrl: string;
  clearings: { x: number; y: number }[];
};

export function MapTileViewer({ tiles }: { tiles: MapTile[] }) {
  const terrains = useMemo(
    () => [...new Set(tiles.map((tile) => tile.terrain))].sort(),
    [tiles],
  );
  const [terrain, setTerrain] = useState(terrains[0] ?? "");
  const [tileName, setTileName] = useState(
    tiles.find((tile) => tile.terrain === terrain)?.name ?? "",
  );
  const [showBack, setShowBack] = useState(false);

  const terrainTiles = useMemo(
    () => tiles.filter((tile) => tile.terrain === terrain),
    [terrain, tiles],
  );
  const selectedTile =
    terrainTiles.find((tile) => tile.name === tileName) ?? terrainTiles[0];
  const imageUrl = showBack
    ? selectedTile?.imageSecondaryUrl
    : selectedTile?.imageUrl;

  function selectTerrain(nextTerrain: string) {
    setTerrain(nextTerrain);
    setTileName(tiles.find((tile) => tile.terrain === nextTerrain)?.name ?? "");
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
            onChange={(event) => setTileName(event.target.value)}
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
            onChange={(event) => setShowBack(event.target.checked)}
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
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900">
          <div className="mx-auto flex aspect-square max-h-[72vh] w-full items-center justify-center p-[4%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`${selectedTile.name} ${showBack ? "back" : "front"}`}
              className="block h-full w-full -rotate-[30deg] object-contain"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
