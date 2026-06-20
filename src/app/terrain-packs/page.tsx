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
        wilderness tokens, terrain-specific treasures, civilisation locations,
        missions, sites, and map tiles
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {packs.map((pack) => (
          <Link
            key={pack.slug}
            href={`/terrain-packs/${pack.slug}`}
            className="rounded border border-zinc-200 dark:border-zinc-800 p-5 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <div className="mb-3 flex items-center gap-3">
              {pack.iconUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pack.iconUrl}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded border border-zinc-200 bg-zinc-100 object-cover dark:border-zinc-800 dark:bg-zinc-900"
                />
              )}
              <h2 className="text-lg font-semibold">
                {terrainPackDisplayName(pack)}
              </h2>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {terrainPackSummary(pack)}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}

function terrainPackDisplayName(pack: TerrainPackEntry): string {
  return pack.slug === "neutral" ? "Always in use" : pack.name;
}

function terrainPackSummary(pack: TerrainPackEntry): string {
  return [
    countLabel(pack.boards.length, "board"),
    countLabel(pack.civilisationTokens.length, "civ token"),
    countLabel(pack.wildernessTokens.length, "wilderness token"),
    countLabel(pack.terrainTreasures.length, "terrain treasure"),
    countLabel(pack.uniqueMissions.length, "unique mission"),
    countLabel(pack.civLocations.length, "civ location"),
    countLabel(
      pack.uniqueNatives.length + pack.uniqueMonsters.length,
      pack.slug === "neutral" ? "native/monster" : "unique native/monster",
    ),
    countLabel(pack.clearingTypes.length, "clearing type"),
    countLabel(pack.sites.length, "site"),
    countLabel(pack.mapTiles.length, "map tile"),
  ].join(" · ");
}

function countLabel(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}
