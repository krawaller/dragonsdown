import releasesData from "../../data/manual/releases.json";
import { findRulebook } from "@/lib/rulebooks";
import {
  getAllBoards,
  getAllCivilisationTokenNames,
  getAllClasses,
  getAllCivLocations,
  getAllEquipment,
  getAllLegendaryLocations,
  getAllLineages,
  getAllMapTiles,
  getAllMissions,
  getAllMonsterGroups,
  getAllNativeGroups,
  getAllSites,
  getAllSpecialists,
  getAllSpells,
  getAllWeatherCards,
  getAllWildernessTokenNames,
} from "@/lib/tts/lookup";

type ReleaseData = {
  file: string;
  version: string;
};

export type ReleaseEntry = {
  slug: string;
  sourceSlug: string;
  boxName: string;
  title: string;
  file: string;
  version: string;
  rulebookHref?: string;
};

export type ReleaseComponentItem = {
  name: string;
  href: string;
  detail?: string;
};

export type ReleaseComponentGroup = {
  title: string;
  items: ReleaseComponentItem[];
};

const RELEASES = releasesData as Record<string, ReleaseData>;

export function getAllReleases(): ReleaseEntry[] {
  return Object.entries(RELEASES).map(([sourceSlug, release]) =>
    releaseEntryForSource(sourceSlug, release),
  );
}

export function getReleaseBySlug(slug: string): ReleaseEntry | undefined {
  return getAllReleases().find((release) => release.slug === slug);
}

export function getReleaseComponentGroups(
  release: ReleaseEntry,
): ReleaseComponentGroup[] {
  return [
    releaseRulebookGroup(release),
    releaseClassGroup(release),
    releaseLineageGroup(release),
    releaseSpellGroup(release),
    releaseBoardGroup(release),
    releaseEquipmentGroup(release),
    releaseMissionGroup(release),
    releaseSiteGroup(release),
    releaseLegendaryLocationGroup(release),
    releaseMapTileGroup(release),
    releaseCivilisationTokenGroup(release),
    releaseCivilisationLocationGroup(release),
    releaseWildernessTokenGroup(release),
    releaseMonsterGroup(release),
    releaseNativeGroup(release),
    releaseSpecialistGroup(release),
    releaseWeatherGroup(release),
  ].filter((group) => group.items.length > 0);
}

function releaseEntryForSource(
  sourceSlug: string,
  release: ReleaseData,
): ReleaseEntry {
  const slug = routeSlugForSource(sourceSlug);
  const rulebook = findRulebook(slug);

  return {
    slug,
    sourceSlug,
    boxName: boxNameForSource(sourceSlug),
    title: rulebook?.title ?? titleCase(slug),
    file: release.file,
    version: release.version,
    rulebookHref: rulebook ? `/${rulebook.slug}` : undefined,
  };
}

function releaseRulebookGroup(release: ReleaseEntry): ReleaseComponentGroup {
  return {
    title: "Rulebooks",
    items: release.rulebookHref
      ? [
          {
            name: release.title,
            href: release.rulebookHref,
            detail: `Version ${release.version}`,
          },
        ]
      : [],
  };
}

function releaseClassGroup(release: ReleaseEntry): ReleaseComponentGroup {
  return {
    title: "Classes",
    items: getAllClasses()
      .filter((entry) =>
        entry.classes.some((ttsClass) => ttsClass.box === release.boxName),
      )
      .map((entry) => ({ name: entry.name, href: `/classes/${entry.slug}` })),
  };
}

function releaseLineageGroup(release: ReleaseEntry): ReleaseComponentGroup {
  return {
    title: "Lineages",
    items: getAllLineages()
      .filter((entry) =>
        entry.lineages.some((lineage) => lineage.box === release.boxName),
      )
      .map((entry) => ({ name: entry.name, href: `/lineages/${entry.slug}` })),
  };
}

function releaseSpellGroup(release: ReleaseEntry): ReleaseComponentGroup {
  return {
    title: "Spells",
    items: getAllSpells()
      .filter((entry) =>
        entry.spells.some(
          (spell) =>
            spell.rulebookSource === release.slug ||
            entryHasBox(spell, release.boxName),
        ),
      )
      .map((entry) => ({ name: entry.name, href: `/spells/${entry.slug}` })),
  };
}

function releaseBoardGroup(release: ReleaseEntry): ReleaseComponentGroup {
  return {
    title: "Boards",
    items: getAllBoards()
      .filter((entry) => entryHasBox(entry.board, release.boxName))
      .map((entry) => ({ name: entry.title, href: `/boards/${entry.slug}` })),
  };
}

function releaseEquipmentGroup(release: ReleaseEntry): ReleaseComponentGroup {
  return {
    title: "Equipment",
    items: getAllEquipment()
      .filter((entry) => equipmentHasBox(entry, release.boxName))
      .map((entry) => {
        return {
          name: entry.name,
          href: `/equipment/${entry.slug}`,
          detail: `${entry.copies} cop${entry.copies === 1 ? "y" : "ies"}`,
        };
      }),
  };
}

function equipmentHasBox(
  entry: ReturnType<typeof getAllEquipment>[number],
  boxName: string,
): boolean {
  return (
    entry.item?.boxes.some((box) => box.name === boxName) === true ||
    entryHasBox(entry.item?.cards, boxName) ||
    entryHasBox(entry.treasures, boxName)
  );
}

function releaseMissionGroup(release: ReleaseEntry): ReleaseComponentGroup {
  return {
    title: "Missions",
    items: getAllMissions()
      .filter((entry) => entryHasBox(entry.cards, release.boxName))
      .map((entry) => ({ name: entry.name, href: `/missions/${entry.slug}` })),
  };
}

function releaseSiteGroup(release: ReleaseEntry): ReleaseComponentGroup {
  return {
    title: "Sites",
    items: getAllSites()
      .filter((entry) => entryHasBox(entry.site, release.boxName))
      .map((entry) => ({ name: entry.name, href: `/sites/${entry.slug}` })),
  };
}

function releaseLegendaryLocationGroup(
  release: ReleaseEntry,
): ReleaseComponentGroup {
  return {
    title: "Legendary Locations",
    items: getAllLegendaryLocations()
      .filter((entry) => entryHasBox(entry, release.boxName))
      .map((entry) => ({
        name: entry.name,
        href: `/legendary-locations/${entry.slug}`,
      })),
  };
}

function releaseMapTileGroup(release: ReleaseEntry): ReleaseComponentGroup {
  return {
    title: "Map Tiles",
    items: getAllMapTiles()
      .filter((entry) => entry.box === release.boxName)
      .map((entry) => ({ name: entry.name, href: entry.href })),
  };
}

function releaseCivilisationTokenGroup(
  release: ReleaseEntry,
): ReleaseComponentGroup {
  return {
    title: "Civilisation Tokens",
    items: getAllCivilisationTokenNames()
      .filter((entry) => entryHasBox(entry.tokens, release.boxName))
      .map((entry) => ({
        name: entry.name,
        href: `/civilisation-tokens/${entry.slug}`,
      })),
  };
}

function releaseCivilisationLocationGroup(
  release: ReleaseEntry,
): ReleaseComponentGroup {
  return {
    title: "Civilisation Locations",
    items: getAllCivLocations()
      .filter((entry) => entryHasBox(entry.location, release.boxName))
      .map((entry) => ({
        name: entry.name,
        href: `/civ-locations/${entry.slug}`,
      })),
  };
}

function releaseWildernessTokenGroup(
  release: ReleaseEntry,
): ReleaseComponentGroup {
  return {
    title: "Wilderness Tokens",
    items: getAllWildernessTokenNames()
      .filter((entry) => entryHasBox(entry.tokens, release.boxName))
      .map((entry) => ({
        name: entry.name,
        href: `/wilderness-tokens/${entry.slug}`,
      })),
  };
}

function releaseMonsterGroup(release: ReleaseEntry): ReleaseComponentGroup {
  return {
    title: "Monster Groups",
    items: getAllMonsterGroups()
      .filter((entry) => entryHasBox(entry.chips, release.boxName))
      .map((entry) => ({
        name: entry.prettyName,
        href: `/monster-groups/${entry.slug}`,
      })),
  };
}

function releaseNativeGroup(release: ReleaseEntry): ReleaseComponentGroup {
  return {
    title: "Native Groups",
    items: getAllNativeGroups()
      .filter((entry) => entryHasBox(entry, release.boxName))
      .map((entry) => ({ name: entry.prettyName, href: `/natives/${entry.slug}` })),
  };
}

function releaseSpecialistGroup(release: ReleaseEntry): ReleaseComponentGroup {
  return {
    title: "Specialists",
    items: getAllSpecialists()
      .filter((entry) => entryHasBox(entry.specialists, release.boxName))
      .map((entry) => ({ name: entry.name, href: "/specialists" })),
  };
}

function releaseWeatherGroup(release: ReleaseEntry): ReleaseComponentGroup {
  return {
    title: "Weather Cards",
    items: getAllWeatherCards()
      .filter((entry) => entryHasBox(entry.cards, release.boxName))
      .map((entry) => ({ name: entry.name, href: "/weather-cards" })),
  };
}

function entryHasBox(value: unknown, boxName: string): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((entry) => entryHasBox(entry, boxName));
  const record = value as Record<string, unknown>;
  if (record.box === boxName) return true;
  return Object.values(record).some((entry) => entryHasBox(entry, boxName));
}

function boxNameForSource(sourceSlug: string): string {
  const boxNames: Record<string, string> = {
    core: "Dragons Down",
    desolation: "Desolation",
    eastern_reaches: "Eastern Reaches",
    natives_and_legends: "Natives and Legends",
    wildlands: "Wildlands",
  };
  return boxNames[sourceSlug] ?? titleCase(routeSlugForSource(sourceSlug));
}

function routeSlugForSource(sourceSlug: string): string {
  return sourceSlug.replaceAll("_", "-");
}

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}