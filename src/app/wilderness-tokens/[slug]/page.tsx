import Link from "next/link";
import { notFound } from "next/navigation";
import { BoardPositionLinks } from "@/components/BoardPositionLinks";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { MissionLinks } from "@/components/MissionLinks";
import { PageHeader } from "@/components/PageHeader";
import { RulebookLinks } from "@/components/RulebookLinks";
import { SiteGrid } from "@/components/SiteGrid";
import {
  getAllWildernessTokenDetailSlugs,
  getWildernessTokenDetail,
} from "@/lib/entities/wilderness-tokens";
import type { WildernessTokenOccurrenceDetail } from "@/lib/entities/types";

export function generateStaticParams() {
  return getAllWildernessTokenDetailSlugs().map((slug) => ({ slug }));
}

export default async function WildernessTokenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const token = await getWildernessTokenDetail(slug);
  if (!token) notFound();
  const { entry } = token;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <PageHeader
        title={entry.name}
        subtitle={token.totalLabel}
        categories={token.categories}
      />

      {token.showBoardPositions && (
        <BoardPositionLinks boards={token.boards} itemName={entry.name} />
      )}

      <MissionLinks missions={token.missions} />

      <RulebookLinks
        links={token.rulebookLinks}
        heading="Rulebook"
        className="mb-8"
      />

      <CollapsibleBox
        title="Occurrences per Terrain Pack"
        count={token.total}
        countLabel={token.totalLabel}
      >
        <div className="overflow-hidden rounded border border-zinc-200 dark:border-zinc-800">
          {token.occurrences.map((occurrence) => (
            <OccurrenceRow
              key={occurrence.key}
              occurrence={occurrence}
              tokenName={entry.name}
            />
          ))}
        </div>
      </CollapsibleBox>

      {entry.slug === "site" && (
        <div className="mt-8">
          <CollapsibleBox
            title="Site token treasure sites"
            count={token.siteTokenSites.length}
            countLabel={`${token.siteTokenSites.length} site${token.siteTokenSites.length === 1 ? "" : "s"}`}
          >
            <SiteGrid entries={token.siteTokenSites} />
          </CollapsibleBox>
        </div>
      )}
    </main>
  );
}

function OccurrenceRow({
  occurrence,
  tokenName,
}: {
  occurrence: WildernessTokenOccurrenceDetail;
  tokenName: string;
}) {
  return (
    <Link
      href={occurrence.href}
      aria-label={`View ${occurrence.terrain}`}
      className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 border-b border-zinc-200 p-4 transition last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 sm:grid-cols-[5rem_minmax(0,1fr)]"
    >
      <TerrainPackIcon
        terrain={occurrence.terrain}
        pack={occurrence.terrainPack}
      />
      <span className="flex min-w-0 flex-wrap gap-3">
        {Array.from({ length: occurrence.count }, (_, index) => (
          <span
            key={`${occurrence.key}-${index}`}
            className="size-20 overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 sm:size-24"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={occurrence.imageUrl}
              alt={`${tokenName} ${occurrence.terrain}`}
              className="block size-full object-cover"
            />
          </span>
        ))}
      </span>
    </Link>
  );
}

function TerrainPackIcon({
  terrain,
  pack,
}: {
  terrain: string;
  pack?: { iconUrl?: string };
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
