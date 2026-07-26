import Link from "next/link";
import { notFound } from "next/navigation";
import { SpriteCell } from "@/components/CardSprite";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { MissionCardLinks } from "@/components/MissionCardLinks";
import { MonsterGroupChipList } from "@/components/MonsterGroupChips";
import { RulebookLinks } from "@/components/RulebookLinks";
import { resolveMonsterRulebookLinks } from "@/lib/rulebook-links";
import type { RulebookLink } from "@/lib/rulebook-links";
import { chipTotalCount } from "@/lib/tts";
import type { TTSCardImage } from "@/lib/tts";
import {
  getAllMapTiles,
  getAllMonsterGroups,
  getAllTerrainPacks,
  getLegendaryLocationBySlug,
  getMissionsFeaturing,
  getMonsterGroupBySlug,
  getSiteBySlug,
  getSpellBySlug,
  getSpellsForMonster,
  type MonsterGroupLegendaryLocationSummon,
  type MonsterGroupMapTileSummon,
  type MonsterGroupSiteSummon,
  type MonsterSpellEntry,
  type MonsterGroupEntry,
} from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllMonsterGroups().map((entry) => ({ slug: entry.slug }));
}

export default async function MonsterGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = getMonsterGroupBySlug(slug);
  if (!group) notFound();
  const featuredMissions = getMissionsFeaturing(group.prettyName);
  const chipNames = group.chips.flatMap((chip) =>
    chip.monsterName ? [chip.monsterName] : [],
  );
  const spells = getSpellsForMonster([group.prettyName, ...chipNames]);
  const rulebookLinks = await resolveMonsterRulebookLinks(
    group.prettyName,
    group.chips.flatMap((chip) => (chip.monsterName ? [chip.monsterName] : [])),
  );
  const displayGroup = withRulebookMonsterNames(group, rulebookLinks);
  const totalChips = group.chips.reduce(
    (sum, chip) => sum + chipTotalCount(chip),
    0,
  );
  const sourceCount =
    group.mapTiles.length +
    group.sites.length +
    group.legendaryLocations.length;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/monster-groups" className="hover:underline">
          Monster Groups
        </Link>
      </div>
      <h1 className="text-4xl font-bold mt-4 mb-2">{group.prettyName}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {chipCountLabel(totalChips)}
      </p>

      <RulebookLinks
        links={rulebookLinks}
        heading="Rulebook"
        className="mb-10"
      />

      <div className="mb-10 space-y-6">
        <CollapsibleBox
          title="Summoning Sources"
          count={sourceCount}
          countLabel={`${sourceCount} source${sourceCount === 1 ? "" : "s"}`}
        >
          <SummoningSourceGrid group={group} />
        </CollapsibleBox>

        <CollapsibleBox
          title="Related Missions"
          count={featuredMissions.length}
          countLabel={`${featuredMissions.length} mission${featuredMissions.length === 1 ? "" : "s"}`}
        >
          <MissionCardLinks missions={featuredMissions} />
        </CollapsibleBox>
      </div>

      {spells.length > 0 && (
        <MonsterSpellLinks groupName={group.prettyName} spells={spells} />
      )}

      <CollapsibleBox
        title="Chips"
        count={totalChips}
        countLabel={chipCountLabel(totalChips)}
      >
        <MonsterGroupChipList group={displayGroup} />
      </CollapsibleBox>
    </main>
  );
}

function SummoningSourceGrid({ group }: { group: MonsterGroupEntry }) {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
      {group.sites.map((summon) => (
        <SiteSourceTile key={summon.href} summon={summon} />
      ))}
      {group.legendaryLocations.map((summon) => (
        <LegendaryLocationSourceTile key={summon.href} summon={summon} />
      ))}
      {group.mapTiles.map((summon) => (
        <MapTileSourceTile
          key={`${summon.terrain}-${summon.tileName}-${summon.role}`}
          summon={summon}
        />
      ))}
    </div>
  );
}

function SiteSourceTile({ summon }: { summon: MonsterGroupSiteSummon }) {
  const site = getSiteBySlug(lastPathSegment(summon.href));
  return (
    <ImageSourceTile
      href={summon.href}
      name={summon.name}
      imageUrl={site?.site.imageSecondaryURL ?? site?.site.imageURL}
      subtitle="treasure site guardian"
      terrainIconUrl={terrainPackIconUrl(terrainPackNameForSiteSource(summon))}
      imageClassName="object-cover"
    />
  );
}

function LegendaryLocationSourceTile({
  summon,
}: {
  summon: MonsterGroupLegendaryLocationSummon;
}) {
  const location = getLegendaryLocationBySlug(lastPathSegment(summon.href));
  return (
    <ImageSourceTile
      href={summon.href}
      name={summon.name}
      card={location?.locations[0]?.card}
      subtitle="legendary location guardian"
      terrainIconUrl={terrainPackIconUrl(
        terrainPackNameForSourceHref(summon.href),
      )}
      imageClassName="object-cover"
    />
  );
}

function MapTileSourceTile({ summon }: { summon: MonsterGroupMapTileSummon }) {
  const tile = getAllMapTiles().find(
    (entry) =>
      entry.terrain === summon.terrain && entry.name === summon.tileName,
  );
  return (
    <ImageSourceTile
      href={summon.href}
      name={summon.tileName}
      imageUrl={tile?.imageUrl}
      subtitle={`${summon.role} monster`}
      terrainIconUrl={terrainPackIconUrl(tile?.terrainPack)}
      imageClassName="-rotate-[30deg] object-contain p-4"
    />
  );
}

function ImageSourceTile({
  href,
  name,
  subtitle,
  terrainIconUrl,
  card,
  imageUrl,
  imageClassName,
}: {
  href: string;
  name: string;
  subtitle: string;
  terrainIconUrl?: string;
  card?: TTSCardImage;
  imageUrl?: string;
  imageClassName: string;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <Link
        href={href}
        className="overflow-hidden rounded border border-zinc-200 bg-zinc-100 transition hover:ring-2 hover:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
        aria-label={`View ${name}`}
      >
        {card ? (
          <SpriteCell card={card} className="w-full rounded-none" />
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            className={`block aspect-square w-full ${imageClassName}`}
          />
        ) : (
          <span className="flex aspect-square w-full items-center justify-center p-3 text-center text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {name}
          </span>
        )}
      </Link>
      <div className="flex min-w-0 items-start gap-2">
        {terrainIconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={terrainIconUrl}
            alt=""
            className="mt-0.5 h-7 w-7 shrink-0 object-contain"
          />
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-5">
            <Link href={href} className="hover:underline">
              {name}
            </Link>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        </div>
      </div>
    </section>
  );
}

function terrainPackNameForSiteSource(
  summon: MonsterGroupSiteSummon,
): string | undefined {
  const site = getSiteBySlug(lastPathSegment(summon.href));
  return site?.site.terrainPack ?? terrainPackNameForSourceHref(summon.href);
}

function terrainPackNameForSourceHref(href: string): string | undefined {
  return getAllTerrainPacks().find((pack) =>
    pack.sites.some((site) => site.href === href),
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

function lastPathSegment(href: string): string {
  return href.split("/").filter(Boolean).at(-1) ?? "";
}

function MonsterSpellLinks({
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
            <MonsterSpellTile
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

function MonsterSpellTile({
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

function withRulebookMonsterNames(
  group: MonsterGroupEntry,
  rulebookLinks: RulebookLink[],
): MonsterGroupEntry {
  if (group.chips.every((chip) => chip.monsterName)) return group;

  const uniqueNames = rulebookLinks
    .filter((link) => /\bunique Monster\b/i.test(link.content))
    .map((link) => link.sectionTitle)
    .filter((title) => title !== group.prettyName);
  if (uniqueNames.length === 0) return group;

  const remainingUniqueNames = [...uniqueNames];
  return {
    ...group,
    chips: group.chips.map((chip) => {
      if (chip.monsterName) return chip;
      const total = chipTotalCount(chip);
      if (total === 1 && remainingUniqueNames.length > 0) {
        return { ...chip, monsterName: remainingUniqueNames.shift() };
      }
      return { ...chip, monsterName: group.prettyName };
    }),
  };
}
