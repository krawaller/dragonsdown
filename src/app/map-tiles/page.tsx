import Link from "next/link";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import {
  getAllTerrainPacks,
  type MapTileEntry,
  type TerrainPackEntry,
} from "@/lib/tts/lookup";

export default function MapTilesPage() {
  const terrainPacks = getAllTerrainPacks().filter(
    (pack) => pack.mapTiles.length > 0,
  );
  const total = terrainPacks.reduce(
    (sum, pack) => sum + pack.mapTiles.length,
    0,
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Map Tiles</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {tileCountLabel(total)} across {terrainPacks.length} terrain packs
      </p>
      <div className="space-y-6">
        {terrainPacks.map((pack) => (
          <CollapsibleBox
            key={pack.slug}
            title={<TerrainPackTitle pack={pack} />}
            count={pack.mapTiles.length}
            countLabel={tileCountLabel(pack.mapTiles.length)}
          >
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
              {pack.mapTiles.map((tile) => (
                <MapTileCard key={`${tile.terrain}-${tile.name}`} tile={tile} />
              ))}
            </div>
          </CollapsibleBox>
        ))}
      </div>
    </main>
  );
}

function TerrainPackTitle({ pack }: { pack: TerrainPackEntry }) {
  return (
    <span className="inline-flex items-center gap-3 align-middle">
      {pack.iconUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pack.iconUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded border border-zinc-200 bg-zinc-100 object-cover dark:border-zinc-800 dark:bg-zinc-900"
        />
      )}
      <span>{pack.slug === "neutral" ? "Always in use" : pack.name}</span>
    </span>
  );
}

function MapTileCard({ tile }: { tile: MapTileEntry }) {
  return (
    <section className="flex min-w-0 flex-col gap-1">
      <Link
        href={tile.href}
        className="overflow-hidden rounded border border-zinc-200 bg-zinc-100 transition hover:ring-2 hover:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
        aria-label={`View ${tile.name}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tile.imageUrl}
          alt={tile.name}
          className="block aspect-square w-full -rotate-[30deg] object-contain p-4"
        />
      </Link>
      <h2 className="mt-1 text-base font-semibold leading-6">
        <Link href={tile.href} className="hover:underline">
          {tile.name}
        </Link>
      </h2>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {tile.terrain} · {tile.clearings.length} clearings
      </p>
    </section>
  );
}

function tileCountLabel(count: number): string {
  return `${count} map tile${count === 1 ? "" : "s"}`;
}
