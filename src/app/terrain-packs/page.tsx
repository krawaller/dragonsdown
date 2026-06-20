import Link from "next/link";
import { getAllTerrainPacks, type TerrainPackEntry } from "@/lib/tts/lookup";

export default function TerrainPacksPage() {
  const packs = getAllTerrainPacks();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Terrain Packs</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {packs.length} terrain packs across boards, civilisation tokens,
        wilderness tokens, civilisation locations, sites, and map tiles
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {packs.map((pack) => (
          <Link
            key={pack.slug}
            href={`/terrain-packs/${pack.slug}`}
            className="rounded border border-zinc-200 dark:border-zinc-800 p-5 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <h2 className="text-lg font-semibold mb-3">{pack.name}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {terrainPackSummary(pack)}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}

function terrainPackSummary(pack: TerrainPackEntry): string {
  return [
    countLabel(pack.boards.length, "board"),
    countLabel(pack.civilisationTokens.length, "civ token"),
    countLabel(pack.wildernessTokens.length, "wilderness token"),
    countLabel(pack.civLocations.length, "civ location"),
    countLabel(
      pack.uniqueNatives.length + pack.uniqueMonsters.length,
      "unique native/monster",
    ),
    countLabel(pack.clearingTypes.length, "clearing type"),
    countLabel(pack.sites.length, "site"),
    countLabel(pack.mapTiles.length, "map tile"),
  ].join(" · ");
}

function countLabel(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}
