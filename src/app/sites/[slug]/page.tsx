import Link from "next/link";
import { notFound } from "next/navigation";
import { BoardPositionLinks } from "@/components/BoardPositionLinks";
import { MissionLinks } from "@/components/MissionLinks";
import { MonsterGroupStack } from "@/components/MonsterGroupChips";
import { RulebookLinks } from "@/components/RulebookLinks";
import { resolveSiteRulebookLinks } from "@/lib/rulebook-links";
import {
  getAllSites,
  getAllTerrainPacks,
  getBoardsForSite,
  getMissionsForTarget,
  getMonsterGroupBySlug,
  getMonsterGroupsForSite,
  getSiteBySlug,
  getWildernessTokenBySlug,
  type BoardEntry,
  type TerrainPackEntry,
  type WildernessTokenNameEntry,
} from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllSites().map((entry) => ({ slug: entry.slug }));
}

export default async function SitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getSiteBySlug(slug);
  if (!entry) notFound();

  const boards = getBoardsForSite(entry.name);
  const terrainPackName =
    entry.site.terrainPack ??
    boards[0]?.board.terrainPack ??
    boards[0]?.board.terrain;
  const terrainPack = getAllTerrainPacks().find(
    (pack) => pack.name === terrainPackName,
  );
  const subtitle = terrainPack?.name ?? terrainPackName;
  const wildernessToken =
    getWildernessTokenBySlug(entry.slug) ?? getWildernessTokenBySlug("site");
  const monsterGroups = getMonsterGroupsForSite(entry.name).flatMap((group) => {
    const fullGroup = getMonsterGroupBySlug(group.slug);
    return fullGroup ? [fullGroup] : [];
  });
  const missions = getMissionsForTarget(entry.name);
  const rulebookLinks = await resolveSiteRulebookLinks(entry.name);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/sites" className="hover:underline">
          Sites
        </Link>
      </div>
      <div className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-4xl font-bold">{entry.name}</h1>
          {subtitle && (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
          )}
        </div>
        <HeaderContextLinks
          terrainPack={terrainPack}
          boards={boards}
          wildernessToken={wildernessToken}
        />
      </div>

      <div className="max-w-2xl rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.site.imageSecondaryURL}
          alt={entry.name}
          className="block w-full aspect-square object-contain"
        />
      </div>

      {monsterGroups.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Guardian</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {monsterGroups.map((group) => (
              <MonsterGroupStack key={group.slug} group={group} />
            ))}
          </div>
        </section>
      )}

      <MissionLinks
        missions={missions}
        className="mt-10"
        headingClassName="text-xl font-semibold mb-4"
      />

      <BoardPositionLinks
        boards={boards}
        itemName={entry.name}
        className="mt-10"
        headingClassName="text-xl font-semibold"
      />

      <RulebookLinks
        links={rulebookLinks}
        heading="Rulebook"
        className="mt-10"
      />
    </main>
  );
}

function HeaderContextLinks({
  terrainPack,
  boards,
  wildernessToken,
}: {
  terrainPack?: TerrainPackEntry;
  boards: BoardEntry[];
  wildernessToken?: WildernessTokenNameEntry;
}) {
  if (!terrainPack && boards.length === 0 && !wildernessToken) return null;

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
      {boards.map((board) => (
        <HeaderContextLink
          key={board.slug}
          href={`/boards/${board.slug}`}
          label="Board"
          value={board.title}
          imageUrl={board.board.imageURL}
        />
      ))}
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
}: {
  href: string;
  label: string;
  value: string;
  imageUrl?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex max-w-64 min-w-0 items-center gap-2 rounded border border-zinc-200 bg-white px-2.5 py-2 text-xs transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
    >
      {imageUrl && (
        <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="block size-full object-cover" />
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
