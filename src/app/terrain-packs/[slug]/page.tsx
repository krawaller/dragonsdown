import Link from "next/link";
import { notFound } from "next/navigation";
import { SpriteCell } from "@/components/CardSprite";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { MissionCardLinks } from "@/components/MissionCardLinks";
import { MonsterGroupStack } from "@/components/MonsterGroupChips";
import { getClearingTypeIcon } from "@/lib/clearing-types";
import { terrainPackSummary } from "@/lib/terrain-packs";
import {
  getAllTerrainPacks,
  getTerrainPackBySlug,
  type EquipmentDeck,
  type BoardEntry,
  type TerrainPackClearingTypeEntry,
  type CivilisationTokenNameEntry,
  type MapTileEntry,
  type TerrainPackMonsterEntry,
  type TerrainPackNativeEntry,
  type TerrainPackEntry,
  type TerrainPackSiteEntry,
  type TerrainPackTreasureEntry,
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

      <div className="mt-4 mb-2 flex items-center gap-4">
        {pack.iconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pack.iconUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded border border-zinc-200 bg-zinc-100 object-cover dark:border-zinc-800 dark:bg-zinc-900"
          />
        )}
        <h1 className="text-4xl font-bold">{terrainPackDisplayName(pack)}</h1>
      </div>
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

        <TerrainBox
          title="Terrain-specific Treasures"
          count={pack.terrainTreasures.length}
        >
          <LinkedGrid>
            {pack.terrainTreasures.map((entry) => (
              <TerrainTreasureTile key={entry.slug} entry={entry} />
            ))}
          </LinkedGrid>
        </TerrainBox>

        <TerrainBox title="Missions" count={pack.uniqueMissions.length}>
          <MissionCardLinks missions={pack.uniqueMissions} />
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
          title={nativeMonsterBoxTitle(pack)}
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
          title="Other Natives and Monsters"
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

function terrainPackDisplayName(pack: TerrainPackEntry): string {
  return pack.slug === "neutral" ? "Always in use" : pack.name;
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
    <CollapsibleBox title={title} count={count}>
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

function TerrainTreasureTile({ entry }: { entry: TerrainPackTreasureEntry }) {
  const card = entry.cards[0];
  const href = `/equipment/${entry.slug}`;
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <Link
        href={href}
        className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900 hover:ring-2 hover:ring-zinc-400 transition"
        aria-label={`View ${entry.name}`}
      >
        {card ? <SpriteCell card={card} className="w-full" /> : null}
      </Link>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold leading-5">
          <Link href={href} className="hover:underline">
            {entry.name}
          </Link>
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {entry.decks.map(equipmentDeckLabel).join(" & ")} · {entry.copies} cop
          {entry.copies === 1 ? "y" : "ies"}
          {entry.cards.length > 1 ? ` · ${entry.cards.length} variants` : ""}
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

function ClearingTypeTile({ entry }: { entry: TerrainPackClearingTypeEntry }) {
  return (
    <Link
      href={`/clearing-types/${entry.slug}`}
      className="rounded border border-zinc-200 dark:border-zinc-800 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getClearingTypeIcon(entry.id)}
            alt=""
            className="h-10 w-10 shrink-0 object-contain"
          />
          <h3 className="min-w-0 text-base font-semibold leading-5">
            {entry.label}
          </h3>
        </span>
        <span className="shrink-0 text-lg font-semibold tabular-nums">
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

function wildernessTokenSubtitle(
  token: WildernessTokenNameEntry["tokens"][number],
): string {
  return [token.clearing ? `clearing ${token.clearing}` : undefined, token.draw]
    .filter(Boolean)
    .join(" · ");
}

function nativeMonsterBoxTitle(pack: TerrainPackEntry): string {
  return pack.slug === "neutral"
    ? "Natives and Monsters"
    : "Unique Natives and Monsters";
}

function equipmentDeckLabel(deck: EquipmentDeck): string {
  switch (deck) {
    case "item":
      return "Item";
    case "treasure":
      return "Treasure";
    case "deep-treasure":
      return "Deep Treasure";
    case "legendary":
      return "Legendary";
  }
}

function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}
