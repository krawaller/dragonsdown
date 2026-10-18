import Link from "next/link";
import { notFound } from "next/navigation";
import { BoardPositionLinks } from "@/components/BoardPositionLinks";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { MissionCardLinks } from "@/components/MissionCardLinks";
import { MonsterGroupStack } from "@/components/MonsterGroupChips";
import { PageHeader } from "@/components/PageHeader";
import { RulebookLinks } from "@/components/RulebookLinks";
import { getAllSiteDetailSlugs, getSiteDetail } from "@/lib/entities/sites";
import type { SiteTokenItemDetail } from "@/lib/entities/types";
import type { MissionEntry, MonsterGroupEntry } from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllSiteDetailSlugs().map((slug) => ({ slug }));
}

export default async function SitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = await getSiteDetail(slug);
  if (!site) notFound();
  const { entry } = site;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <PageHeader
        title={entry.name}
        subtitle={site.subtitle}
        categories={site.categories}
      />

      <BoardPositionLinks
        boards={site.boards}
        itemName={entry.name}
        className="mb-10"
        showHeading={false}
        showCaption={false}
        linked={false}
        displaySides="both"
        collapsibleTitle="Board Position"
      />

      <TokensAndGuardiansBox
        guardians={site.guardians}
        tokenItems={site.tokenItems}
        count={site.tokenAndGuardianCount}
      />

      <RelatedMissionsBox missions={site.relatedMissions} />

      <RulebookLinks
        links={site.rulebookLinks}
        heading={null}
        className="mt-10"
      />
    </main>
  );
}

function RelatedMissionsBox({ missions }: { missions: MissionEntry[] }) {
  if (missions.length === 0) return null;

  return (
    <section className="mt-10">
      <CollapsibleBox
        title="Related Missions"
        count={missions.length}
        countLabel={missionCountLabel(missions.length)}
      >
        <MissionCardLinks missions={missions} />
      </CollapsibleBox>
    </section>
  );
}

function TokensAndGuardiansBox({
  guardians,
  tokenItems,
  count,
}: {
  guardians: MonsterGroupEntry[];
  tokenItems: SiteTokenItemDetail[];
  count: number;
}) {
  return (
    <section className="mt-10">
      <CollapsibleBox
        title="Tokens & Guardians"
        count={count}
        countLabel={`${count} item${count === 1 ? "" : "s"}`}
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {tokenItems.map((item) => (
            <SiteTokenTile key={item.label} item={item} />
          ))}
          {guardians.map((group) => (
            <MonsterGroupStack
              key={group.slug}
              group={group}
              subtitle="guardian"
            />
          ))}
        </div>
      </CollapsibleBox>
    </section>
  );
}

function SiteTokenTile({ item }: { item: SiteTokenItemDetail }) {
  const preview = item.images ?? [{ imageURL: item.imageUrl }];
  const previewHeightClass = preview.length <= 1 ? "h-20" : "h-28";
  const content = (
    <>
      <span className={`relative mb-4 block ${previewHeightClass}`}>
        {preview.map((token, index) => (
          <span
            key={`${token.imageURL}-${index}`}
            className="absolute block size-20 overflow-hidden rounded border border-zinc-200 bg-zinc-100 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            style={{
              left: `${index * 1.55}rem`,
              top: `${index % 2 === 0 ? 0 : 1.25}rem`,
              zIndex: preview.length - index,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={token.imageURL}
              alt=""
              className="block size-full object-cover"
            />
          </span>
        ))}
      </span>
      <span className="block min-w-0">
        <span className="block text-lg font-semibold group-hover:underline">
          {item.name}
        </span>
        <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">
          {item.label}
        </span>
      </span>
    </>
  );

  if (!item.href) {
    return (
      <div className="group block rounded border border-zinc-200 p-4 dark:border-zinc-800">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className="group block rounded border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      {content}
    </Link>
  );
}

function missionCountLabel(count: number): string {
  return `${count} mission${count === 1 ? "" : "s"}`;
}
