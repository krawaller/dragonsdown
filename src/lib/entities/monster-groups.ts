import { getReleaseByBoxName } from "@/lib/releases";
import { resolveMonsterRulebookLinks } from "@/lib/rulebook-links";
import type { RulebookLink } from "@/lib/rulebook-links";
import { chipTotalCount } from "@/lib/tts";
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
  type MonsterGroupEntry,
  type MonsterGroupLegendaryLocationSummon,
  type MonsterGroupMapTileSummon,
  type MonsterGroupSiteSummon,
  type MonsterSpellEntry,
  type TerrainPackEntry,
} from "@/lib/tts/lookup";
import type {
  CategoryChip,
  MonsterGroupDetail,
  MonsterSourceDetail,
  SpellTileDetail,
} from "./types";

const monsterGroupDetailsBySlug = new Map<
  string,
  Promise<MonsterGroupDetail | undefined>
>();

export function getAllMonsterGroupDetailSlugs(): string[] {
  return getAllMonsterGroups().map((entry) => entry.slug);
}

export function getMonsterGroupDetail(
  slug: string,
): Promise<MonsterGroupDetail | undefined> {
  const cached = monsterGroupDetailsBySlug.get(slug);
  if (cached) return cached;

  const detail = buildMonsterGroupDetail(slug);
  monsterGroupDetailsBySlug.set(slug, detail);
  return detail;
}

async function buildMonsterGroupDetail(
  slug: string,
): Promise<MonsterGroupDetail | undefined> {
  const group = getMonsterGroupBySlug(slug);
  if (!group) return undefined;

  const relatedMissions = getMissionsFeaturing(group.prettyName);
  const chipNames = group.chips.flatMap((chip) =>
    chip.monsterName ? [chip.monsterName] : [],
  );
  const spells = getSpellsForMonster([group.prettyName, ...chipNames]).map(
    (spell) => monsterSpellDetail(group.prettyName, spell),
  );
  const rulebookLinks = await resolveMonsterRulebookLinks(
    group.prettyName,
    chipNames,
  );
  const displayGroup = withRulebookMonsterNames(group, rulebookLinks);
  const totalChips = group.chips.reduce(
    (sum, chip) => sum + chipTotalCount(chip),
    0,
  );
  const releaseBox = uniqueDefinedValue(group.chips.map((chip) => chip.box));
  const release = releaseBox ? getReleaseByBoxName(releaseBox) : undefined;
  const terrainPack = uniqueTerrainPackForMonsterGroup(group);
  const sources = monsterSources(group);

  return {
    group,
    displayGroup,
    totalChips,
    chipCountLabel: chipCountLabel(totalChips),
    categories: monsterGroupHeaderCategories({ release, group, terrainPack }),
    rulebookLinks,
    sourceCount: sources.length,
    sources,
    relatedMissions,
    spells,
  };
}

function monsterGroupHeaderCategories({
  release,
  group,
  terrainPack,
}: {
  release?: ReturnType<typeof getReleaseByBoxName>;
  group: MonsterGroupEntry;
  terrainPack?: TerrainPackEntry;
}): CategoryChip[] {
  const representativeChip = group.chips[0];

  return [
    ...(release
      ? [
          {
            href: `/releases/${release.slug}`,
            label: "Release",
            value: releaseCategoryValue(release),
            imageUrl: release.iconUrl,
            imageFit: "contain" as const,
          },
        ]
      : []),
    {
      href: "/monster-groups",
      label: "Component",
      value: "Monster Chips",
      imageUrl:
        representativeChip?.imageSecondaryURL ?? representativeChip?.imageURL,
      imageFit: "contain",
    },
    ...(terrainPack
      ? [
          {
            href: `/terrain-packs/${terrainPack.slug}`,
            label: "Terrain pack",
            value:
              terrainPack.slug === "neutral"
                ? "Always in use"
                : terrainPack.name,
            imageUrl: terrainPack.iconUrl,
          },
        ]
      : []),
  ];
}

function uniqueTerrainPackForMonsterGroup(
  group: MonsterGroupEntry,
): TerrainPackEntry | undefined {
  const terrainPackNames = [
    ...group.sites.map(terrainPackNameForSiteSource),
    ...group.legendaryLocations.map((summon) =>
      terrainPackNameForSourceHref(summon.href),
    ),
    ...group.mapTiles.map((summon) => {
      const tile = getAllMapTiles().find(
        (entry) =>
          entry.terrain === summon.terrain && entry.name === summon.tileName,
      );
      return tile?.terrainPack;
    }),
  ];
  const terrainPackName = uniqueDefinedValue(terrainPackNames);
  if (!terrainPackName) return undefined;
  const terrainPacks = getAllTerrainPacks().filter(
    (pack) => pack.name === terrainPackName,
  );
  return terrainPacks.length === 1 ? terrainPacks[0] : undefined;
}

function uniqueDefinedValue(
  values: (string | undefined)[],
): string | undefined {
  const uniqueValues = new Set(
    values.filter((value): value is string => !!value),
  );
  return uniqueValues.size === 1 ? [...uniqueValues][0] : undefined;
}

function releaseCategoryValue(
  release: NonNullable<ReturnType<typeof getReleaseByBoxName>>,
): string {
  return release.sourceSlug === "core" ? "Core box" : release.title;
}

function monsterSources(group: MonsterGroupEntry): MonsterSourceDetail[] {
  return [
    ...group.sites.map(siteSourceDetail),
    ...group.legendaryLocations.map(legendaryLocationSourceDetail),
    ...group.mapTiles.map(mapTileSourceDetail),
  ];
}

function siteSourceDetail(summon: MonsterGroupSiteSummon): MonsterSourceDetail {
  const site = getSiteBySlug(lastPathSegment(summon.href));
  return {
    key: summon.href,
    href: summon.href,
    name: summon.name,
    imageUrl: site?.site.imageSecondaryURL ?? site?.site.imageURL,
    subtitle: "treasure site guardian",
    terrainIconUrl: terrainPackIconUrl(terrainPackNameForSiteSource(summon)),
    imageClassName: "object-cover",
  };
}

function legendaryLocationSourceDetail(
  summon: MonsterGroupLegendaryLocationSummon,
): MonsterSourceDetail {
  const location = getLegendaryLocationBySlug(lastPathSegment(summon.href));
  return {
    key: summon.href,
    href: summon.href,
    name: summon.name,
    card: location?.locations[0]?.card,
    subtitle: "legendary location guardian",
    terrainIconUrl: terrainPackIconUrl(
      terrainPackNameForSourceHref(summon.href),
    ),
    imageClassName: "object-cover",
  };
}

function mapTileSourceDetail(
  summon: MonsterGroupMapTileSummon,
): MonsterSourceDetail {
  const tile = getAllMapTiles().find(
    (entry) =>
      entry.terrain === summon.terrain && entry.name === summon.tileName,
  );
  return {
    key: `${summon.terrain}-${summon.tileName}-${summon.role}`,
    href: summon.href,
    name: summon.tileName,
    imageUrl: tile?.imageUrl,
    subtitle: `${summon.role} monster`,
    terrainIconUrl: terrainPackIconUrl(tile?.terrainPack),
    imageClassName: "-rotate-[30deg] object-contain p-4",
  };
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

function monsterSpellDetail(
  groupName: string,
  spell: MonsterSpellEntry,
): SpellTileDetail {
  const entry = getSpellBySlug(spell.spellSlug);
  const card = entry?.spells[0]?.spellCards[0] ?? entry?.spells[0]?.cards[0];
  const otherCasters = spell.casterNames.filter((name) => name !== groupName);
  const subtitle = [
    ...(otherCasters.length > 0 ? otherCasters : [groupName]),
    spell.sides.join(" & "),
  ].join(" · ");

  return {
    spellName: spell.spellName,
    spellSlug: spell.spellSlug,
    card,
    subtitle,
  };
}

function chipCountLabel(count: number): string {
  return `${count} chip${count === 1 ? "" : "s"}`;
}

function lastPathSegment(href: string): string {
  return href.split("/").filter(Boolean).at(-1) ?? "";
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
