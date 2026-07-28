import Link from "next/link";
import { notFound } from "next/navigation";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { MissionCardLinks } from "@/components/MissionCardLinks";
import { MonsterGroupStack } from "@/components/MonsterGroupChips";
import {
  getAllCivLocations,
  getAllMapTiles,
  getAllTerrainPacks,
  getCivLocationBySlug,
  getNativeGroupBySlug,
  getMissionsForTarget,
  getNativeGroupsForCivLocation,
  getWildernessTokenBySlug,
  type MapTileEntry,
  type TerrainPackEntry,
  type WildernessTokenNameEntry,
} from "@/lib/tts/lookup";

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
  const mapTile = getAllMapTiles().find(
    (tile) => tile.name === name && tile.clearings.length === 4,
  );
  const wildernessToken = getWildernessTokenBySlug(entry.slug);
  const terrainPackName =
    location.terrainPack ??
    mapTile?.terrainPack ??
    wildernessToken?.tokens[0]?.terrainPack ??
    wildernessToken?.tokens[0]?.terrain;
  const terrainPack = getAllTerrainPacks().find(
    (pack) => pack.name === terrainPackName,
  );
  const nativeGroups = getNativeGroupsForCivLocation(name);
  const nativeGroupEntries = nativeGroups.flatMap((group) => {
    const nativeGroup = getNativeGroupBySlug(group.slug);
    return nativeGroup ? [nativeGroup] : [];
  });
  const missions = getMissionsForTarget(name);
  const placementLabel = mapTile
    ? "Map tile location"
    : "Wilderness token location";
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
      <div className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-4xl font-bold">{name}</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {placementLabel}
          </p>
        </div>
        <HeaderContextLinks
          terrainPack={terrainPack}
          mapTile={mapTile}
          wildernessToken={mapTile ? undefined : wildernessToken}
        />
      </div>
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={location.imageURL}
          alt={name}
          className="block w-full max-h-[78vh] aspect-square object-contain"
        />
      </div>
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

function HeaderContextLinks({
  terrainPack,
  mapTile,
  wildernessToken,
}: {
  terrainPack?: TerrainPackEntry;
  mapTile?: MapTileEntry;
  wildernessToken?: WildernessTokenNameEntry;
}) {
  if (!terrainPack && !mapTile && !wildernessToken) return null;

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {terrainPack && (
        <HeaderContextLink
          href={`/terrain-packs/${terrainPack.slug}`}
          label="Terrain pack"
          value={
            terrainPack.slug === "neutral" ? "Always in use" : terrainPack.name
          }
          imageUrl={terrainPack.iconUrl}
        />
      )}
      {mapTile && (
        <HeaderContextLink
          href={mapTile.href}
          label="Map tile"
          value={mapTile.name}
          imageUrl={mapTile.imageUrl}
          imageClassName="object-contain p-0.5 -rotate-[30deg]"
        />
      )}
      {wildernessToken && (
        <HeaderContextLink
          href={`/wilderness-tokens/${wildernessToken.slug}`}
          label="Wilderness token"
          value={wildernessToken.name}
          imageUrl={wildernessToken.tokens[0]?.imageURL}
        />
      )}
    </div>
  );
}

function HeaderContextLink({
  href,
  label,
  value,
  imageUrl,
  imageClassName = "object-cover",
}: {
  href: string;
  label: string;
  value: string;
  imageUrl?: string;
  imageClassName?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-w-0 items-center gap-2 rounded border border-zinc-200 bg-white px-2.5 py-2 text-xs transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
    >
      {imageUrl && (
        <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            className={`block size-full ${imageClassName}`}
          />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-[0.6875rem] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        <span className="block truncate font-medium text-zinc-900 dark:text-zinc-100">
          {value}
        </span>
      </span>
    </Link>
  );
}
