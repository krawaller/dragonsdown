import Link from "next/link";
import mapTiles from "../../../data/extracted-from-tts/map-tiles.json";

export default function AllMapTilesPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">All Map Tiles</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {mapTiles.length} mapTiles, alphabetical, front and back
      </p>

      <div className="space-y-8">
        {mapTiles.map((tile) => (
          <section
            key={tile.name}
            className="rounded border border-zinc-200 dark:border-zinc-800 p-4"
          >
            <h2 className="text-xl font-semibold">{tile.name}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              {tile.terrain}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tile.imageUrl}
                  alt={`${tile.name} front`}
                  className="block w-full rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900"
                />
                <figcaption className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Front
                </figcaption>
              </figure>
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tile.imageSecondaryUrl}
                  alt={`${tile.name} back`}
                  className="block w-full rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900"
                />
                <figcaption className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Back
                </figcaption>
              </figure>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
