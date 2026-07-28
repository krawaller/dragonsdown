import Link from "next/link";
import { notFound } from "next/navigation";
import { BoardPositionLinks } from "@/components/BoardPositionLinks";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { MissionLinks } from "@/components/MissionLinks";
import { RulebookLinks } from "@/components/RulebookLinks";
import { SiteGrid } from "@/components/SiteGrid";
import { resolveWildernessTokenRulebookLinks } from "@/lib/rulebook-links";
import {
  getCivLocationBySlug,
  getAllSites,
  getAllTerrainPacks,
  getAllWildernessTokenNames,
  getBoardsForMerchant,
  getBoardsForSite,
  getMissionsForTarget,
  getSiteBySlug,
  getWildernessTokenBySlug,
  type BoardEntry,
  type CivLocationEntry,
  type SiteEntry,
  type TerrainPackEntry,
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
  const siteLocation = civLocation ? undefined : getSiteBySlug(entry.slug);
  const boards = uniqueBoards([
    ...getBoardsForSite(entry.name),
    ...getBoardsForMerchant(entry.name),
  ]);
  const missions = getMissionsForTarget(entry.name);
  const rulebookLinks = await resolveWildernessTokenRulebookLinks(entry.slug);
  const terrainPacksByName = new Map(
    getAllTerrainPacks().map((pack) => [pack.name, pack]),
  );
  const terrainPacks = uniqueTerrainPacks(
    entry.tokens.flatMap((token) => {
      const pack = terrainPacksByName.get(token.terrain);
      return pack ? [pack] : [];
    }),
  );
  const siteTokenSites =
    entry.slug === "site"
      ? getAllSites().filter((site) => site.kind === "proper")
      : [];

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
      <div className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-4xl font-bold">{entry.name}</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {tokenCountLabel(total)}
          </p>
        </div>
        <HeaderContextLinks
          terrainPacks={terrainPacks}
          civLocation={civLocation}
          siteLocation={siteLocation}
        />
      </div>

      {!civLocation && !siteLocation && (
        <BoardPositionLinks boards={boards} itemName={entry.name} />
      )}

      <MissionLinks missions={missions} />

      <RulebookLinks
        links={rulebookLinks}
        heading="Rulebook"
        className="mb-8"
      />

      <CollapsibleBox
        title="Occurrences per Terrain Pack"
        count={total}
        countLabel={tokenCountLabel(total)}
      >
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
                  {Array.from(
                    { length: tokenTotalCount(token) },
                    (_, index) => (
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
                    ),
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </CollapsibleBox>

      {entry.slug === "site" && (
        <div className="mt-8">
          <CollapsibleBox
            title="Site token treasure sites"
            count={siteTokenSites.length}
            countLabel={`${siteTokenSites.length} site${siteTokenSites.length === 1 ? "" : "s"}`}
          >
            <SiteGrid entries={siteTokenSites} />
          </CollapsibleBox>
        </div>
      )}
    </main>
  );
}

function tokenTotalCount(token: WildernessTokenListEntry): number {
  return token.locations.reduce((sum, loc) => sum + loc.count, 0);
}

function tokenCountLabel(count: number): string {
  return `${count} token${count === 1 ? "" : "s"}`;
}

function HeaderContextLinks({
  terrainPacks,
  civLocation,
  siteLocation,
}: {
  terrainPacks: TerrainPackEntry[];
  civLocation?: CivLocationEntry;
  siteLocation?: SiteEntry;
}) {
  if (terrainPacks.length === 0 && !civLocation && !siteLocation) return null;

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {terrainPacks.map((terrainPack) => (
        <HeaderContextLink
          key={terrainPack.slug}
          href={`/terrain-packs/${terrainPack.slug}`}
          label="Terrain pack"
          value={
            terrainPack.slug === "neutral" ? "Always in use" : terrainPack.name
          }
          imageUrl={terrainPack.iconUrl}
        />
      ))}
      {civLocation && (
        <HeaderContextLink
          href={`/civ-locations/${civLocation.slug}`}
          label="Civ location"
          value={civLocation.name}
          imageUrl={civLocation.location.imageURL}
        />
      )}
      {siteLocation && (
        <HeaderContextLink
          href={`/sites/${siteLocation.slug}`}
          label="Treasure site"
          value={siteLocation.name}
          imageUrl={siteLocation.site.imageSecondaryURL}
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
      className="inline-flex min-w-0 items-center gap-2 rounded border border-zinc-200 bg-white px-2.5 py-2 text-xs transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
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

function uniqueTerrainPacks(packs: TerrainPackEntry[]): TerrainPackEntry[] {
  return [...new Map(packs.map((pack) => [pack.slug, pack])).values()];
}

function uniqueBoards(boards: BoardEntry[]): BoardEntry[] {
  return [...new Map(boards.map((board) => [board.slug, board])).values()];
}
