import Link from "next/link";
import { notFound } from "next/navigation";
import { SpriteCell } from "@/components/CardSprite";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { MissionCardLinks } from "@/components/MissionCardLinks";
import { MonsterGroupChipList } from "@/components/MonsterGroupChips";
import { NativeCivilisationCard } from "@/components/NativeCivilisationCard";
import { RulebookLinks } from "@/components/RulebookLinks";
import { resolveNativeRulebookLinks } from "@/lib/rulebook-links";
import { chipTotalCount } from "@/lib/tts";
import {
  getAllTerrainPacks,
  getCivLocationBySlug,
  getAllNativeGroups,
  getMissionsFeaturing,
  getMissionsForTarget,
  getNativeGroupBySlug,
  getSpellBySlug,
  getSpellsForMonster,
  getWildernessTokenBySlug,
  type MonsterSpellEntry,
  type NativeGroupSummon,
} from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllNativeGroups().map((entry) => ({ slug: entry.slug }));
}

export default async function NativePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = getNativeGroupBySlug(slug);
  if (!group) notFound();
  const missions = getMissionsForTarget(group.prettyName);
  const featuredMissions = getMissionsFeaturing(group.prettyName);
  const relatedMissions = uniqueMissions([...missions, ...featuredMissions]);
  const chipNames = group.chips.flatMap((chip) =>
    chip.monsterName ? [chip.monsterName] : [],
  );
  const spells = getSpellsForMonster([group.prettyName, ...chipNames]);
  const rulebookLinks = await resolveNativeRulebookLinks(
    group.prettyName,
    chipNames,
  );
  const totalChips = group.chips.reduce(
    (sum, chip) => sum + chipTotalCount(chip),
    0,
  );

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
        {chipCountLabel(totalChips)}
      </p>

      {group.civilisationCard && (
        <NativeCivilisationCard
          card={group.civilisationCard}
          name={group.prettyName}
        />
      )}

      <RulebookLinks
        links={rulebookLinks}
        heading="Rulebook"
        className="mb-10"
      />

      <div className="mb-10 space-y-6">
        <CollapsibleBox
          title="Summoning Sources"
          count={group.nativeSummons.length}
          countLabel={`${group.nativeSummons.length} source${group.nativeSummons.length === 1 ? "" : "s"}`}
        >
          <SummoningSourceGrid summons={group.nativeSummons} />
        </CollapsibleBox>

        <CollapsibleBox
          title="Related Missions"
          count={relatedMissions.length}
          countLabel={`${relatedMissions.length} mission${relatedMissions.length === 1 ? "" : "s"}`}
        >
          <MissionCardLinks missions={relatedMissions} />
        </CollapsibleBox>
      </div>

      {spells.length > 0 && (
        <NativeSpellLinks groupName={group.prettyName} spells={spells} />
      )}

      <CollapsibleBox
        title="Chips"
        count={totalChips}
        countLabel={chipCountLabel(totalChips)}
      >
        <MonsterGroupChipList group={group} />
      </CollapsibleBox>
    </main>
  );
}

function SummoningSourceGrid({ summons }: { summons: NativeGroupSummon[] }) {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
      {summons.map((summon) => (
        <SummoningSourceTile key={summon.name} summon={summon} />
      ))}
    </div>
  );
}

function SummoningSourceTile({ summon }: { summon: NativeGroupSummon }) {
  const source = summoningSourceDetails(summon);

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <Link
        href={summon.href}
        className="overflow-hidden rounded border border-zinc-200 bg-zinc-100 transition hover:ring-2 hover:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
        aria-label={`View ${summon.name}`}
      >
        {source?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={source.imageUrl}
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
        {source?.terrainIconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={source.terrainIconUrl}
            alt=""
            className="mt-0.5 h-7 w-7 shrink-0 object-contain"
          />
        )}
        <h2 className="min-w-0 text-sm font-semibold leading-5">
          <Link href={summon.href} className="hover:underline">
            {summon.name}
          </Link>
        </h2>
      </div>
    </section>
  );
}

function summoningSourceDetails(
  summon: NativeGroupSummon,
): { imageUrl?: string; terrainIconUrl?: string } | undefined {
  const [, kind, slug] = summon.href.split("/");
  if (kind === "civ-locations") {
    const location = getCivLocationBySlug(slug);
    const terrainPack = location
      ? (location.location.terrainPack ??
        terrainPackNameForCivLocation(location.slug))
      : undefined;
    return location
      ? {
          imageUrl: location.location.imageURL,
          terrainIconUrl: terrainPackIconUrl(terrainPack),
        }
      : undefined;
  }
  if (kind === "wilderness-tokens") {
    const token = getWildernessTokenBySlug(slug)?.tokens[0];
    return token
      ? {
          imageUrl: token.imageURL,
          terrainIconUrl: terrainPackIconUrl(
            token.terrainPack ?? token.terrain,
          ),
        }
      : undefined;
  }
  return undefined;
}

function terrainPackNameForCivLocation(slug: string): string | undefined {
  return getAllTerrainPacks().find((pack) =>
    pack.civLocations.some((location) => location.slug === slug),
  )?.name;
}

function terrainPackIconUrl(terrainPack?: string): string | undefined {
  if (!terrainPack) return undefined;
  return getAllTerrainPacks().find((pack) => pack.name === terrainPack)
    ?.iconUrl;
}

function chipCountLabel(count: number): string {
  return `${count} chip${count === 1 ? "" : "s"}`;
}

function uniqueMissions<T extends { slug: string }>(missions: T[]): T[] {
  const seen = new Set<string>();
  return missions.filter((mission) => {
    if (seen.has(mission.slug)) return false;
    seen.add(mission.slug);
    return true;
  });
}

function NativeSpellLinks({
  groupName,
  spells,
}: {
  groupName: string;
  spells: MonsterSpellEntry[];
}) {
  return (
    <div className="mb-10">
      <CollapsibleBox
        title="Spells"
        count={spells.length}
        countLabel={`${spells.length} spell${spells.length === 1 ? "" : "s"}`}
      >
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {spells.map((spell) => (
            <NativeSpellTile
              key={spell.spellName}
              groupName={groupName}
              spell={spell}
            />
          ))}
        </div>
      </CollapsibleBox>
    </div>
  );
}

function NativeSpellTile({
  groupName,
  spell,
}: {
  groupName: string;
  spell: MonsterSpellEntry;
}) {
  const entry = getSpellBySlug(spell.spellSlug);
  const card = entry?.spells[0]?.spellCards[0] ?? entry?.spells[0]?.cards[0];
  const otherCasters = spell.casterNames.filter((name) => name !== groupName);
  const subtitle = [
    ...(otherCasters.length > 0 ? otherCasters : [groupName]),
    spell.sides.join(" & "),
  ].join(" · ");

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <Link
        href={`/spells/${spell.spellSlug}`}
        className="overflow-hidden rounded border border-zinc-200 bg-zinc-100 transition hover:ring-2 hover:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
        aria-label={`View ${spell.spellName}`}
      >
        {card ? (
          <SpriteCell card={card} className="w-full rounded-none" />
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
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>
    </section>
  );
}
