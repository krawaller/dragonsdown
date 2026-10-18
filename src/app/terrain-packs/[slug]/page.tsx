import Link from "next/link";
import { notFound } from "next/navigation";
import { SpriteCell } from "@/components/CardSprite";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { MissionCardLinks } from "@/components/MissionCardLinks";
import { MonsterGroupStack } from "@/components/MonsterGroupChips";
import {
  getAllTerrainPackDetailSlugs,
  getTerrainPackDetail,
} from "@/lib/entities/terrain-packs";
import type {
  TerrainPackClearingTypeDetail,
  TerrainPackImageTileDetail,
  TerrainPackTreasureTileDetail,
} from "@/lib/entities/types";
import type {
  BoardEntry,
  TerrainPackMonsterEntry,
  TerrainPackNativeEntry,
} from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllTerrainPackDetailSlugs().map((slug) => ({ slug }));
}

export default async function TerrainPackPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pack = getTerrainPackDetail(slug);
  if (!pack) notFound();
  const { entry } = pack;

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

      <div className="mt-4 mb-2 flex items-center gap-4">
        {entry.iconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.iconUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded border border-zinc-200 bg-zinc-100 object-cover dark:border-zinc-800 dark:bg-zinc-900"
          />
        )}
        <h1 className="text-4xl font-bold">{pack.displayName}</h1>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {pack.summary}
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
          title="Civilization Tokens"
          count={pack.civilisationTokens.length}
        >
          <LinkedGrid>
            {pack.civilisationTokens.map((entry) => (
              <ImageTile key={entry.key} entry={entry} />
            ))}
          </LinkedGrid>
        </TerrainBox>

        <TerrainBox title="Merchants" count={pack.merchants.length}>
          <LinkedGrid>
            {pack.merchants.map((entry) => (
              <ImageTile key={entry.key} entry={entry} />
            ))}
          </LinkedGrid>
        </TerrainBox>

        <TerrainBox
          title="Wilderness Tokens"
          count={pack.wildernessTokenCount}
          countLabel={pack.wildernessTokenCountLabel}
        >
          <LinkedGrid>
            {pack.wildernessTokens.map((entry) => (
              <ImageTile key={entry.key} entry={entry} />
            ))}
          </LinkedGrid>
        </TerrainBox>

        <TerrainBox
          title="Terrain-specific Treasures"
          count={pack.terrainTreasures.length}
        >
          <LinkedGrid>
            {pack.terrainTreasures.map((entry) => (
              <TerrainTreasureTile key={entry.key} entry={entry} />
            ))}
          </LinkedGrid>
        </TerrainBox>

        <TerrainBox title="Missions" count={pack.missions.length}>
          <MissionCardLinks missions={pack.missions} />
        </TerrainBox>

        <TerrainBox
          title="Civilization Locations"
          count={pack.civLocations.length}
        >
          <LinkedGrid>
            {pack.civLocations.map((entry) => (
              <ImageTile key={entry.key} entry={entry} />
            ))}
          </LinkedGrid>
        </TerrainBox>

        <TerrainBox
          title={pack.nativeMonsterBoxTitle}
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

        <TerrainBox
          title="Other Native/Monster Groups"
          count={pack.natives.length + pack.monsters.length}
        >
          <NativeGrid>
            {pack.natives.map((entry) => (
              <UniqueNativeTile key={entry.slug} entry={entry} />
            ))}
            {pack.monsters.map((entry) => (
              <UniqueMonsterTile key={entry.slug} entry={entry} />
            ))}
          </NativeGrid>
        </TerrainBox>

        <TerrainBox title="Clearing Types" count={pack.clearingTypes.length}>
          <ClearingTypeGrid>
            {pack.clearingTypes.map((entry) => (
              <ClearingTypeTile key={entry.key} entry={entry} />
            ))}
          </ClearingTypeGrid>
        </TerrainBox>

        <TerrainBox title="Treasure Sites" count={pack.sites.length}>
          <LinkedGrid>
            {pack.sites.map((entry) => (
              <ImageTile key={entry.key} entry={entry} />
            ))}
          </LinkedGrid>
        </TerrainBox>

        <TerrainBox title="Map Tiles" count={pack.mapTiles.length}>
          <LinkedGrid>
            {pack.mapTiles.map((entry) => (
              <ImageTile key={entry.key} entry={entry} />
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
  countLabel,
  children,
}: {
  title: string;
  count: number;
  countLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <CollapsibleBox title={title} count={count} countLabel={countLabel}>
      {children}
    </CollapsibleBox>
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

function TerrainTreasureTile({
  entry,
}: {
  entry: TerrainPackTreasureTileDetail;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <Link
        href={entry.href}
        className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900 hover:ring-2 hover:ring-zinc-400 transition"
        aria-label={`View ${entry.name}`}
      >
        {entry.card ? (
          <SpriteCell card={entry.card} className="w-full" />
        ) : null}
      </Link>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold leading-5">
          <Link href={entry.href} className="hover:underline">
            {entry.name}
          </Link>
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {entry.subtitle}
        </p>
      </div>
    </section>
  );
}

function UniqueNativeTile({ entry }: { entry: TerrainPackNativeEntry }) {
  return <MonsterGroupStack group={entry} hrefBase="/natives" />;
}

function UniqueMonsterTile({ entry }: { entry: TerrainPackMonsterEntry }) {
  return <MonsterGroupStack group={entry} hrefBase="/monster-groups" />;
}

function ClearingTypeTile({ entry }: { entry: TerrainPackClearingTypeDetail }) {
  return (
    <Link
      href={entry.href}
      className="rounded border border-zinc-200 dark:border-zinc-800 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.iconUrl}
            alt=""
            className="h-10 w-10 shrink-0 object-contain"
          />
          <h3 className="min-w-0 text-base font-semibold leading-5">
            {entry.label}
          </h3>
        </span>
        <span className="shrink-0 text-lg font-semibold tabular-nums">
          {entry.percentageLabel}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
        <span
          className="block h-full rounded-full bg-zinc-700 dark:bg-zinc-300"
          style={{ width: `${entry.percentage}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {entry.countLabel}
      </p>
    </Link>
  );
}

function ImageTile({ entry }: { entry: TerrainPackImageTileDetail }) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <Link
        href={entry.href}
        className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900 hover:ring-2 hover:ring-zinc-400 transition"
        aria-label={`View ${entry.name}`}
      >
        {entry.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.imageUrl}
            alt={entry.name}
            className={`block w-full aspect-square ${entry.imageClassName}`}
          />
        ) : (
          <span className="block w-full aspect-square" />
        )}
      </Link>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold leading-5">
          <Link href={entry.href} className="hover:underline">
            {entry.name}
          </Link>
        </h3>
        {entry.subtitle && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {entry.subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
