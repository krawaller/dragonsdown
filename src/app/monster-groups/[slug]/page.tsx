import Link from "next/link";
import { notFound } from "next/navigation";
import { SpriteCell } from "@/components/CardSprite";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { MissionCardLinks } from "@/components/MissionCardLinks";
import { MonsterGroupChipList } from "@/components/MonsterGroupChips";
import { PageHeader } from "@/components/PageHeader";
import { RulebookLinks } from "@/components/RulebookLinks";
import {
  getAllMonsterGroupDetailSlugs,
  getMonsterGroupDetail,
} from "@/lib/entities/monster-groups";
import type {
  MonsterSourceDetail,
  SpellTileDetail,
} from "@/lib/entities/types";

export function generateStaticParams() {
  return getAllMonsterGroupDetailSlugs().map((slug) => ({ slug }));
}

export default async function MonsterGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const monsterGroup = await getMonsterGroupDetail(slug);
  if (!monsterGroup) notFound();
  const { group } = monsterGroup;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <PageHeader
        title={group.prettyName}
        subtitle={monsterGroup.chipCountLabel}
        categories={monsterGroup.categories}
      />

      <div className="space-y-6">
        <RulebookLinks
          links={monsterGroup.rulebookLinks}
          heading={null}
          linksClassName="space-y-6"
        />

        <CollapsibleBox
          title="Appears at"
          count={monsterGroup.sourceCount}
          countLabel={`${monsterGroup.sourceCount} location${monsterGroup.sourceCount === 1 ? "" : "s"}`}
        >
          <SummoningSourceGrid sources={monsterGroup.sources} />
        </CollapsibleBox>

        <CollapsibleBox
          title="Related Missions"
          count={monsterGroup.relatedMissions.length}
          countLabel={`${monsterGroup.relatedMissions.length} mission${monsterGroup.relatedMissions.length === 1 ? "" : "s"}`}
        >
          <MissionCardLinks missions={monsterGroup.relatedMissions} />
        </CollapsibleBox>

        {monsterGroup.spells.length > 0 && (
          <MonsterSpellLinks spells={monsterGroup.spells} />
        )}

        <CollapsibleBox
          title="Chips"
          count={monsterGroup.totalChips}
          countLabel={monsterGroup.chipCountLabel}
        >
          <MonsterGroupChipList group={monsterGroup.displayGroup} />
        </CollapsibleBox>
      </div>
    </main>
  );
}

function SummoningSourceGrid({ sources }: { sources: MonsterSourceDetail[] }) {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
      {sources.map((source) => (
        <ImageSourceTile key={source.key} source={source} />
      ))}
    </div>
  );
}

function ImageSourceTile({ source }: { source: MonsterSourceDetail }) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <Link
        href={source.href}
        className="overflow-hidden rounded border border-zinc-200 bg-zinc-100 transition hover:ring-2 hover:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
        aria-label={`View ${source.name}`}
      >
        {source.card ? (
          <SpriteCell card={source.card} className="w-full rounded-none" />
        ) : source.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={source.imageUrl}
            alt={source.name}
            className={`block aspect-square w-full ${source.imageClassName}`}
          />
        ) : (
          <span className="flex aspect-square w-full items-center justify-center p-3 text-center text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {source.name}
          </span>
        )}
      </Link>
      <div className="flex min-w-0 items-start gap-2">
        {source.terrainIconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={source.terrainIconUrl}
            alt=""
            className="mt-0.5 h-7 w-7 shrink-0 object-contain"
          />
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-5">
            <Link href={source.href} className="hover:underline">
              {source.name}
            </Link>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {source.subtitle}
          </p>
        </div>
      </div>
    </section>
  );
}

function MonsterSpellLinks({ spells }: { spells: SpellTileDetail[] }) {
  return (
    <CollapsibleBox
      title="Spells"
      count={spells.length}
      countLabel={`${spells.length} spell${spells.length === 1 ? "" : "s"}`}
    >
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {spells.map((spell) => (
          <MonsterSpellTile key={spell.spellName} spell={spell} />
        ))}
      </div>
    </CollapsibleBox>
  );
}

function MonsterSpellTile({ spell }: { spell: SpellTileDetail }) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <Link
        href={`/spells/${spell.spellSlug}`}
        className="overflow-hidden rounded border border-zinc-200 bg-zinc-100 transition hover:ring-2 hover:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
        aria-label={`View ${spell.spellName}`}
      >
        {spell.card ? (
          <SpriteCell card={spell.card} className="w-full rounded-none" />
        ) : (
          <span className="flex aspect-[5/7] w-full items-center justify-center p-3 text-center text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {spell.spellName}
          </span>
        )}
      </Link>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold leading-5">
          <Link href={`/spells/${spell.spellSlug}`} className="hover:underline">
            {spell.spellName}
          </Link>
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {spell.subtitle}
        </p>
      </div>
    </section>
  );
}
