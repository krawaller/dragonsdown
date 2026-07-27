import Link from "next/link";
import { notFound } from "next/navigation";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { MissionCardLinks } from "@/components/MissionCardLinks";
import type { MapTile } from "@/components/MapTileViewer";
import { MonsterGroupStack } from "@/components/MonsterGroupChips";
import { slugify } from "@/lib/slug";
import {
  getAllCivLocations,
  getCivLocationBySlug,
  getNativeGroupBySlug,
  getMissionsForTarget,
  getNativeGroupsForCivLocation,
  getWildernessTokenBySlug,
} from "@/lib/tts/lookup";
import mapTiles from "../../../../data/extracted-from-tts/map-tiles.json";

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
  const nativeGroupEntries = nativeGroups.flatMap((group) => {
    const nativeGroup = getNativeGroupBySlug(group.slug);
    return nativeGroup ? [nativeGroup] : [];
  });
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
            href={mapTileHref(mapTile)}
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
            href={mapTileHref(mapTile)}
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
      <div className="mt-8">
        <CollapsibleBox
          title="Native Groups"
          count={nativeGroupEntries.length}
          countLabel={`${nativeGroupEntries.length} group${nativeGroupEntries.length === 1 ? "" : "s"}`}
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {nativeGroupEntries.map((group) => (
              <MonsterGroupStack
                key={group.slug}
                group={group}
                hrefBase="/natives"
              />
            ))}
          </div>
        </CollapsibleBox>
      </div>
      <div className="mt-8">
        <CollapsibleBox
          title="Related Missions"
          count={missions.length}
          countLabel={`${missions.length} mission${missions.length === 1 ? "" : "s"}`}
        >
          <MissionCardLinks missions={missions} />
        </CollapsibleBox>
      </div>
    </main>
  );
}

function mapTileHref(tile: MapTile): string {
  return `/map-tiles/${slugify(tile.name)}`;
}
