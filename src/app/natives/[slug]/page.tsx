import Link from "next/link";
import { notFound } from "next/navigation";
import { SpriteCell } from "@/components/CardSprite";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { MissionCardLinks } from "@/components/MissionCardLinks";
import { MonsterGroupChipList } from "@/components/MonsterGroupChips";
import { NativeCivilisationCard } from "@/components/NativeCivilisationCard";
import { RulebookLinks } from "@/components/RulebookLinks";
import {
  getAllNativeDetailSlugs,
  getNativeDetail,
} from "@/lib/entities/natives";
import type { NativeSummonDetail, SpellTileDetail } from "@/lib/entities/types";

export function generateStaticParams() {
  return getAllNativeDetailSlugs().map((slug) => ({ slug }));
}

export default async function NativePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const native = await getNativeDetail(slug);
  if (!native) notFound();
  const { group } = native;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/natives" className="hover:underline">
          Natives
        </Link>
      </div>
      <h1 className="text-4xl font-bold mt-4 mb-2">{group.prettyName}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {native.chipCountLabel}
      </p>

      {group.civilisationCard && (
        <NativeCivilisationCard
          card={group.civilisationCard}
          name={group.prettyName}
        />
      )}

      <RulebookLinks
        links={native.rulebookLinks}
        heading="Rulebook"
        className="mb-10"
      />

      <div className="mb-10 space-y-6">
        <CollapsibleBox
          title="Appears at"
          count={native.summons.length}
          countLabel={`${native.summons.length} location${native.summons.length === 1 ? "" : "s"}`}
        >
          <SummoningSourceGrid summons={native.summons} />
        </CollapsibleBox>

        <CollapsibleBox
          title="Related Missions"
          count={native.relatedMissions.length}
          countLabel={`${native.relatedMissions.length} mission${native.relatedMissions.length === 1 ? "" : "s"}`}
        >
          <MissionCardLinks missions={native.relatedMissions} />
        </CollapsibleBox>
      </div>

      {native.spells.length > 0 && <NativeSpellLinks spells={native.spells} />}

      <CollapsibleBox
        title="Chips"
        count={native.totalChips}
        countLabel={native.chipCountLabel}
      >
        <MonsterGroupChipList group={group} />
      </CollapsibleBox>
    </main>
  );
}

function SummoningSourceGrid({ summons }: { summons: NativeSummonDetail[] }) {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
      {summons.map((summon) => (
        <SummoningSourceTile key={summon.name} summon={summon} />
      ))}
    </div>
  );
}

function SummoningSourceTile({ summon }: { summon: NativeSummonDetail }) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <Link
        href={summon.href}
        className="overflow-hidden rounded border border-zinc-200 bg-zinc-100 transition hover:ring-2 hover:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
        aria-label={`View ${summon.name}`}
      >
        {summon.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={summon.imageUrl}
            alt={summon.name}
            className="block aspect-square w-full object-cover"
          />
        ) : (
          <span className="flex aspect-square w-full items-center justify-center p-3 text-center text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {summon.name}
          </span>
        )}
      </Link>
      <div className="flex min-w-0 items-start gap-2">
        {summon.terrainIconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={summon.terrainIconUrl}
            alt=""
            className="mt-0.5 h-7 w-7 shrink-0 object-contain"
          />
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-5">
            <Link href={summon.href} className="hover:underline">
              {summon.name}
            </Link>
          </h2>
          {summon.subtitle && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {summon.subtitle}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function NativeSpellLinks({ spells }: { spells: SpellTileDetail[] }) {
  return (
    <div className="mb-10">
      <CollapsibleBox
        title="Spells"
        count={spells.length}
        countLabel={`${spells.length} spell${spells.length === 1 ? "" : "s"}`}
      >
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {spells.map((spell) => (
            <NativeSpellTile key={spell.spellName} spell={spell} />
          ))}
        </div>
      </CollapsibleBox>
    </div>
  );
}

function NativeSpellTile({ spell }: { spell: SpellTileDetail }) {
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
