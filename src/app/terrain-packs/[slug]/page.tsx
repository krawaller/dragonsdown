import Link from "next/link";
import { notFound } from "next/navigation";
import { MonsterGroupStack } from "@/components/MonsterGroupChips";
import {
  getAllTerrainPacks,
  getTerrainPackBySlug,
  type BoardEntry,
  type TerrainPackClearingTypeEntry,
  type CivLocationEntry,
  type CivilisationTokenNameEntry,
  type MapTileEntry,
  type TerrainPackMonsterEntry,
  type TerrainPackNativeEntry,
  type TerrainPackEntry,
  type TerrainPackSiteEntry,
  type WildernessTokenNameEntry,
} from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllTerrainPacks().map((entry) => ({ slug: entry.slug }));
}

export default async function TerrainPackPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pack = getTerrainPackBySlug(slug);
  if (!pack) notFound();

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/terrain-packs" className="hover:underline">
          Terrain Packs
        </Link>
      </div>

      <h1 className="text-4xl font-bold mt-4 mb-2">{pack.name}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {terrainPackSummary(pack)}
      </p>

      <div className="space-y-8">
        <TerrainBox title="Boards" count={pack.boards.length}>
          <BoardGrid>
            {pack.boards.map((entry) => (
              <BoardTile key={entry.slug} entry={entry} />
            ))}
          </BoardGrid>
        </TerrainBox>

        <TerrainBox
          title="Civilisation Tokens"
          count={pack.civilisationTokens.length}
        >
          <LinkedGrid>
            {pack.civilisationTokens.map((entry) => (
              <CivilisationTokenTile
                key={entry.slug}
                entry={entry}
                packName={pack.name}
              />
            ))}
          </LinkedGrid>
        </TerrainBox>

        <TerrainBox
          title="Wilderness Tokens"
          count={pack.wildernessTokens.length}
        >
          <LinkedGrid>
            {pack.wildernessTokens.map((entry) => (
              <WildernessTokenTile
                key={entry.slug}
                entry={entry}
                packName={pack.name}
              />
            ))}
          </LinkedGrid>
        </TerrainBox>

        <TerrainBox title="Civ Locations" count={pack.civLocations.length}>
          <LinkedGrid>
            {pack.civLocations.map((entry) => (
              <ImageTile
                key={entry.slug}
                href={`/civ-locations/${entry.slug}`}
                name={entry.name}
                imageUrl={entry.location.imageURL}
                imageClassName="object-cover"
              />
            ))}
          </LinkedGrid>
        </TerrainBox>

        <TerrainBox
          title="Unique Natives and Monsters"
          count={pack.uniqueNatives.length + pack.uniqueMonsters.length}
        >
          <NativeGrid>
            {pack.uniqueNatives.map((entry) => (
              <UniqueNativeTile key={entry.slug} entry={entry} />
            ))}
            {pack.uniqueMonsters.map((entry) => (
              <UniqueMonsterTile key={entry.slug} entry={entry} />
            ))}
          </NativeGrid>
        </TerrainBox>

        <TerrainBox title="Clearing Types" count={pack.clearingTypes.length}>
          <ClearingTypeGrid>
            {pack.clearingTypes.map((entry) => (
              <ClearingTypeTile key={entry.id} entry={entry} />
            ))}
          </ClearingTypeGrid>
        </TerrainBox>

        <TerrainBox title="Sites" count={pack.sites.length}>
          <LinkedGrid>
            {pack.sites.map((entry) => (
              <SiteTile key={entry.slug} entry={entry} />
            ))}
          </LinkedGrid>
        </TerrainBox>

        <TerrainBox title="Map Tiles" count={pack.mapTiles.length}>
          <LinkedGrid>
            {pack.mapTiles.map((entry) => (
              <MapTileTile
                key={`${entry.terrain}-${entry.name}`}
                entry={entry}
              />
            ))}
          </LinkedGrid>
        </TerrainBox>
      </div>
    </main>
  );
}

function TerrainBox({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {count} item{count === 1 ? "" : "s"}
        </p>
      </div>
      {count > 0 ? (
        children
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">None found.</p>
      )}
    </section>
  );
}

function LinkedGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-5">
      {children}
    </div>
  );
}

function BoardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {children}
    </div>
  );
}

function NativeGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {children}
    </div>
  );
}

function ClearingTypeGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {children}
    </div>
  );
}

function CivilisationTokenTile({
  entry,
  packName,
}: {
  entry: CivilisationTokenNameEntry;
  packName: string;
}) {
  const token =
    entry.tokens.find(
      (tokenImage) =>
        (tokenImage.terrainPack ?? tokenImage.terrainGroup) === packName,
    ) ?? entry.tokens[0];
  return (
    <ImageTile
      href={`/civilisation-tokens/${entry.slug}`}
      name={entry.name}
      imageUrl={token.imageSecondaryURL || token.imageURL}
      subtitle={token.attribute ?? token.gmNotes ?? token.terrainGroup}
      imageClassName="object-cover"
    />
  );
}

function BoardTile({ entry }: { entry: BoardEntry }) {
  const href = `/boards/${entry.slug}`;
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <Link
        href={href}
        className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900 hover:ring-2 hover:ring-zinc-400 transition"
        aria-label={`View ${entry.title}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.board.imageURL}
          alt={entry.title}
          className="block h-auto w-full object-contain"
        />
      </Link>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold leading-5">
          <Link href={href} className="hover:underline">
            {entry.title}
          </Link>
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {entry.board.terrain}
        </p>
      </div>
    </section>
  );
}

function WildernessTokenTile({
  entry,
  packName,
}: {
  entry: WildernessTokenNameEntry;
  packName: string;
}) {
  const token =
    entry.tokens.find((tokenImage) => tokenImage.terrain === packName) ??
    entry.tokens[0];
  return (
    <ImageTile
      href={`/wilderness-tokens/${entry.slug}`}
      name={entry.name}
      imageUrl={token.imageURL}
      subtitle={wildernessTokenSubtitle(token)}
      imageClassName="object-cover"
    />
  );
}

function UniqueNativeTile({ entry }: { entry: TerrainPackNativeEntry }) {
  return <MonsterGroupStack group={entry} hrefBase="/natives" />;
}

function UniqueMonsterTile({ entry }: { entry: TerrainPackMonsterEntry }) {
  return <MonsterGroupStack group={entry} hrefBase="/monster-groups" />;
}

function ClearingTypeTile({ entry }: { entry: TerrainPackClearingTypeEntry }) {
  return (
    <Link
      href={`/clearing-types/${entry.slug}`}
      className="rounded border border-zinc-200 dark:border-zinc-800 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold">{entry.label}</h3>
        <span className="text-lg font-semibold tabular-nums">
          {formatPercentage(entry.percentage)}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
        <span
          className="block h-full rounded-full bg-zinc-700 dark:bg-zinc-300"
          style={{ width: `${entry.percentage}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {entry.count} clearing side{entry.count === 1 ? "" : "s"}
      </p>
    </Link>
  );
}

function SiteTile({ entry }: { entry: TerrainPackSiteEntry }) {
  return (
    <ImageTile
      href={entry.href}
      name={entry.name}
      imageUrl={entry.imageURL}
      subtitle={entry.subtitle}
      imageClassName="object-cover"
    />
  );
}

function MapTileTile({ entry }: { entry: MapTileEntry }) {
  return (
    <ImageTile
      href={entry.href}
      name={entry.name}
      imageUrl={entry.imageUrl}
      subtitle={entry.terrain}
      imageClassName="-rotate-[30deg] object-contain p-4"
    />
  );
}

function ImageTile({
  href,
  name,
  imageUrl,
  subtitle,
  imageClassName,
}: {
  href: string;
  name: string;
  imageUrl?: string;
  subtitle?: string;
  imageClassName: string;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <Link
        href={href}
        className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900 hover:ring-2 hover:ring-zinc-400 transition"
        aria-label={`View ${name}`}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            className={`block w-full aspect-square ${imageClassName}`}
          />
        ) : (
          <span className="block w-full aspect-square" />
        )}
      </Link>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold leading-5">
          <Link href={href} className="hover:underline">
            {name}
          </Link>
        </h3>
        {subtitle && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        )}
      </div>
    </section>
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

function wildernessTokenSubtitle(
  token: WildernessTokenNameEntry["tokens"][number],
): string {
  return [token.clearing ? `clearing ${token.clearing}` : undefined, token.draw]
    .filter(Boolean)
    .join(" · ");
}

function countLabel(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}
