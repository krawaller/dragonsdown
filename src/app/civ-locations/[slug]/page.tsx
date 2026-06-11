import Link from "next/link";
import { notFound } from "next/navigation";
import type { MapTile } from "@/components/MapTileViewer";
import { getAllCivLocations, getCivLocationBySlug } from "@/lib/tts/lookup";
import mapTiles from "../../../../data/tts/map-tiles.json";

export function generateStaticParams() {
  return getAllCivLocations().map((entry) => ({ slug: entry.slug }));
}

export default async function CivLocationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getCivLocationBySlug(slug);
  if (!entry) notFound();

  const { name, location } = entry;
  const mapTile = (mapTiles as MapTile[]).find(
    (tile) => tile.name === name && tile.clearings.length === 4,
  );
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/civ-locations" className="hover:underline">
          Civ Locations
        </Link>
      </div>
      <h1 className="text-4xl font-bold mt-4 mb-2">{name}</h1>
      {location.ancestry.length > 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
          {location.ancestry.join(" / ")}
        </p>
      )}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={location.imageURL}
          alt={name}
          className="block w-full max-h-[78vh] aspect-square object-contain"
        />
      </div>
      {mapTile && (
        <section className="mt-8 max-w-xs">
          <h2 className="text-sm font-medium mb-2">Civ tile</h2>
          <Link
            href={`/map-tiles?${mapTileParams(mapTile).toString()}`}
            className="block overflow-hidden rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 hover:ring-2 hover:ring-zinc-400 transition"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mapTile.imageUrl}
              alt={mapTile.name}
              className="block aspect-square w-full -rotate-[30deg] object-contain p-4"
            />
          </Link>
          <Link
            href={`/map-tiles?${mapTileParams(mapTile).toString()}`}
            className="mt-2 block text-sm font-medium hover:underline"
          >
            {mapTile.name}
          </Link>
        </section>
      )}
    </main>
  );
}

function mapTileParams(tile: MapTile): URLSearchParams {
  const params = new URLSearchParams();
  params.set("terrain", tile.terrain);
  params.set("tile", tile.name);
  params.set("side", "front");
  return params;
}
