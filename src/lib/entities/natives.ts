import type { MapTile } from "@/components/MapTileViewer";
import { resolveNativeRulebookLinks } from "@/lib/rulebook-links";
import { chipTotalCount } from "@/lib/tts";
import {
  getAllNativeGroups,
  getAllTerrainPacks,
  getCivLocationBySlug,
  getMissionsFeaturing,
  getMissionsForTarget,
  getNativeGroupBySlug,
  getSpellBySlug,
  getSpellsForMonster,
  getWildernessTokenBySlug,
  type MissionEntry,
  type MonsterSpellEntry,
  type NativeGroupSummon,
} from "@/lib/tts/lookup";
import type { ImageTileSource, NativeDetail, SpellTileDetail } from "./types";
import mapTiles from "../../../data/extracted-from-tts/map-tiles.json";

const nativeDetailsBySlug = new Map<
  string,
  Promise<NativeDetail | undefined>
>();

export function getAllNativeDetailSlugs(): string[] {
  return getAllNativeGroups().map((entry) => entry.slug);
}

export function getNativeDetail(
  slug: string,
): Promise<NativeDetail | undefined> {
  const cached = nativeDetailsBySlug.get(slug);
  if (cached) return cached;

  const detail = buildNativeDetail(slug);
  nativeDetailsBySlug.set(slug, detail);
  return detail;
}

async function buildNativeDetail(
  slug: string,
): Promise<NativeDetail | undefined> {
  const group = getNativeGroupBySlug(slug);
  if (!group) return undefined;

  const missions = getMissionsForTarget(group.prettyName);
  const featuredMissions = getMissionsFeaturing(group.prettyName);
  const relatedMissions = uniqueMissions([...missions, ...featuredMissions]);
  const chipNames = group.chips.flatMap((chip) =>
    chip.monsterName ? [chip.monsterName] : [],
  );
  const spells = getSpellsForMonster([group.prettyName, ...chipNames]).map(
    (spell) => nativeSpellDetail(group.prettyName, spell),
  );
  const rulebookLinks = await resolveNativeRulebookLinks(
    group.prettyName,
    chipNames,
  );
  const totalChips = group.chips.reduce(
    (sum, chip) => sum + chipTotalCount(chip),
    0,
  );

  return {
    group,
    totalChips,
    chipCountLabel: chipCountLabel(totalChips),
    rulebookLinks,
    summons: group.nativeSummons.map(nativeSummonDetail),
    relatedMissions,
    spells,
  };
}

function nativeSummonDetail(summon: NativeGroupSummon) {
  return {
    name: summon.name,
    href: summon.href,
    ...summoningSourceDetails(summon),
  };
}

function summoningSourceDetails(
  summon: NativeGroupSummon,
): ImageTileSource | undefined {
  const [, kind, slug] = summon.href.split("/");
  if (kind === "civ-locations") {
    const location = getCivLocationBySlug(slug);
    if (!location) return undefined;

    const wildernessToken = getWildernessTokenBySlug(slug)?.tokens[0];
    if (wildernessToken && !isMapTileCivLocation(location.name)) {
      return {
        imageUrl: location.location.imageURL,
        subtitle: "wilderness token location",
        terrainIconUrl: terrainPackIconUrl(
          wildernessToken.terrainPack ?? wildernessToken.terrain,
        ),
      };
    }

    const terrainPack =
      location.location.terrainPack ??
      terrainPackNameForCivLocation(location.slug);
    return {
      imageUrl: location.location.imageURL,
      subtitle: "map tile location",
      terrainIconUrl: terrainPackIconUrl(terrainPack),
    };
  }
  if (kind === "wilderness-tokens") {
    const token = getWildernessTokenBySlug(slug)?.tokens[0];
    return token
      ? {
          imageUrl: token.imageURL,
          subtitle: "wilderness token location",
          terrainIconUrl: terrainPackIconUrl(
            token.terrainPack ?? token.terrain,
          ),
        }
      : undefined;
  }
  return undefined;
}

function isMapTileCivLocation(name: string): boolean {
  return (mapTiles as MapTile[]).some(
    (tile) => tile.name === name && tile.clearings.length === 4,
  );
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

function nativeSpellDetail(
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

function uniqueMissions<T extends MissionEntry>(missions: T[]): T[] {
  const seen = new Set<string>();
  return missions.filter((mission) => {
    if (seen.has(mission.slug)) return false;
    seen.add(mission.slug);
    return true;
  });
}
