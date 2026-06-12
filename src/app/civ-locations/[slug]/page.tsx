import Link from "next/link";
import { notFound } from "next/navigation";
import { MissionLinks } from "@/components/MissionLinks";
import type { MapTile } from "@/components/MapTileViewer";
import {
  getAllCivLocations,
  getCivLocationBySlug,
  getMissionsForTarget,
  getNativeGroupsForCivLocation,
  getWildernessTokenBySlug,
} from "@/lib/tts/lookup";
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
  const wildernessToken = getWildernessTokenBySlug(entry.slug);
  const nativeGroups = getNativeGroupsForCivLocation(name);
  const missions = getMissionsForTarget(name);
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
      {wildernessToken && (
        <section className="mt-8 max-w-xs">
          <h2 className="text-sm font-medium mb-2">Wilderness token</h2>
          <Link
            href={`/wilderness-tokens/${wildernessToken.slug}`}
            className="block overflow-hidden rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 hover:ring-2 hover:ring-zinc-400 transition"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={wildernessToken.tokens[0].imageURL}
              alt={wildernessToken.name}
              className="block aspect-square w-full object-cover"
            />
          </Link>
          <Link
            href={`/wilderness-tokens/${wildernessToken.slug}`}
            className="mt-2 block text-sm font-medium hover:underline"
          >
            {wildernessToken.name}
          </Link>
        </section>
      )}
      {nativeGroups.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium mb-2">Native Groups</h2>
          <div className="flex flex-wrap gap-2">
            {nativeGroups.map((group) => (
              <Link
                key={group.slug}
                href={`/natives/${group.slug}`}
                className="rounded border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                <span className="font-medium">{group.name}</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {group.natives.join(", ")}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <MissionLinks missions={missions} className="mt-8" />
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
