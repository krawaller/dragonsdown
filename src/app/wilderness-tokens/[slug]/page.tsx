import Link from "next/link";
import { notFound } from "next/navigation";
import { BoardPositionLinks } from "@/components/BoardPositionLinks";
import { MissionLinks } from "@/components/MissionLinks";
import { RulebookLinks } from "@/components/RulebookLinks";
import { resolveWildernessTokenRulebookLinks } from "@/lib/rulebook-links";
import {
  getCivLocationBySlug,
  getAllTerrainPacks,
  getAllWildernessTokenNames,
  getBoardsForMerchant,
  getBoardsForSite,
  getMissionsForTarget,
  getNativeGroupsForWildernessToken,
  getWildernessTokenBySlug,
  type BoardEntry,
  type WildernessTokenListEntry,
} from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllWildernessTokenNames().map((entry) => ({ slug: entry.slug }));
}

export default async function WildernessTokenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getWildernessTokenBySlug(slug);
  if (!entry) notFound();
  const civLocation = getCivLocationBySlug(entry.slug);
  const boards = uniqueBoards([
    ...getBoardsForSite(entry.name),
    ...getBoardsForMerchant(entry.name),
  ]);
  const nativeGroups = getNativeGroupsForWildernessToken(entry.name);
  const missions = getMissionsForTarget(entry.name);
  const rulebookLinks = await resolveWildernessTokenRulebookLinks(entry.slug);
  const terrainPacksByName = new Map(
    getAllTerrainPacks().map((pack) => [pack.name, pack]),
  );

  const total = entry.tokens.reduce(
    (sum, token) => sum + tokenTotalCount(token),
    0,
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/wilderness-tokens" className="hover:underline">
          Wilderness Tokens
        </Link>
      </div>
      <h1 className="text-4xl font-bold mt-4 mb-2">{entry.name}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {tokenCountLabel(total)}
      </p>

      {civLocation && (
        <Link
          href={`/civ-locations/${civLocation.slug}`}
          className="mb-8 inline-flex max-w-full items-center gap-3 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-2 pr-3 text-sm hover:ring-2 hover:ring-zinc-400 transition"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={civLocation.location.imageURL}
            alt={civLocation.name}
            className="block size-16 shrink-0 rounded object-cover"
          />
          <span className="min-w-0">
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              Civ location
            </span>
            <span className="block truncate font-medium">
              {civLocation.name}
            </span>
          </span>
        </Link>
      )}

      <BoardPositionLinks boards={boards} itemName={entry.name} />

      {nativeGroups.length > 0 && (
        <section className="mb-8">
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

      <MissionLinks missions={missions} />

      <RulebookLinks
        links={rulebookLinks}
        heading="Rulebook"
        className="mb-8"
      />

      <div className="overflow-hidden rounded border border-zinc-200 dark:border-zinc-800">
        {entry.tokens.map((token) => {
          const pack = terrainPacksByName.get(token.terrain);

          return (
            <Link
              key={`${token.terrain}-${token.imageURL}`}
              href={terrainPackHref(pack)}
              aria-label={`View ${token.terrain}`}
              className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 border-b border-zinc-200 p-4 transition last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 sm:grid-cols-[5rem_minmax(0,1fr)]"
            >
              <TerrainPackIcon terrain={token.terrain} pack={pack} />
              <span className="flex min-w-0 flex-wrap gap-3">
                {Array.from({ length: tokenTotalCount(token) }, (_, index) => (
                  <span
                    key={`${token.terrain}-${token.imageURL}-${index}`}
                    className="size-20 overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 sm:size-24"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={token.imageURL}
                      alt={`${entry.name} ${token.terrain}`}
                      className="block size-full object-cover"
                    />
                  </span>
                ))}
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}

function tokenTotalCount(token: WildernessTokenListEntry): number {
  return token.locations.reduce((sum, loc) => sum + loc.count, 0);
}

function tokenCountLabel(count: number): string {
  return `${count} token${count === 1 ? "" : "s"}`;
}

function TerrainPackIcon({
  terrain,
  pack,
}: {
  terrain: string;
  pack?: { slug: string; iconUrl?: string };
}) {
  return (
    <span className="flex size-14 items-center justify-center overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 sm:size-16">
      {pack?.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pack.iconUrl}
          alt=""
          className="block size-full object-cover"
        />
      ) : (
        <span className="px-1 text-center text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {terrain}
        </span>
      )}
    </span>
  );
}

function terrainPackHref(pack: { slug: string } | undefined): string {
  return pack ? `/terrain-packs/${pack.slug}` : "/terrain-packs";
}

function uniqueBoards(boards: BoardEntry[]): BoardEntry[] {
  return [...new Map(boards.map((board) => [board.slug, board])).values()];
}
