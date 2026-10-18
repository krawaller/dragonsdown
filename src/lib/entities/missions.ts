import { missionKindLabel } from "@/components/MissionKindBadge";
import { cropForBoardPosition } from "@/lib/board-position-crop";
import { getBoardPositionForItem } from "@/lib/board-positions";
import { getReleaseByBoxName } from "@/lib/releases";
import type { MissionKind, MissionTerrainPack, TTSCardImage } from "@/lib/tts";
import type {
  MissionFeatureLink,
  MissionTargetLink,
  TerrainPackEntry,
} from "@/lib/tts/lookup";
import {
  getAllMissions,
  getAllTerrainPacks,
  getBoardsForSite,
  getCivLocationBySlug,
  getMissionBySlug,
  getMonsterGroupBySlug,
  getNativeGroupBySlug,
  getSiteBySlug,
} from "@/lib/tts/lookup";
import type {
  CategoryChip,
  MissionDetail,
  MissionInvolvementDetail,
} from "./types";

type MissionInvolvementLink = MissionTargetLink | MissionFeatureLink;

const missionDetailsBySlug = new Map<string, MissionDetail | undefined>();

export function getAllMissionDetailSlugs(): string[] {
  return getAllMissions().map((entry) => entry.slug);
}

export function getMissionDetail(slug: string): MissionDetail | undefined {
  if (missionDetailsBySlug.has(slug)) return missionDetailsBySlug.get(slug);

  const detail = buildMissionDetail(slug);
  missionDetailsBySlug.set(slug, detail);
  return detail;
}

function buildMissionDetail(slug: string): MissionDetail | undefined {
  const entry = getMissionBySlug(slug);
  if (!entry) return undefined;

  const missionCard = entry.cards[0];
  const releaseBox = uniqueDefinedValue(entry.cards.map((card) => card.box));
  const release = releaseBox ? getReleaseByBoxName(releaseBox) : undefined;
  const terrainPack = uniqueTerrainPackForMission(entry.terrainPacks);

  return {
    entry,
    subtitle: missionKindSummary(entry.kinds),
    categories: missionHeaderCategories({ release, missionCard, terrainPack }),
    involvements: missionInvolvementLinks(entry.targets, entry.features).map(
      missionInvolvementDetail,
    ),
  };
}

function missionHeaderCategories({
  release,
  missionCard,
  terrainPack,
}: {
  release?: ReturnType<typeof getReleaseByBoxName>;
  missionCard: TTSCardImage | undefined;
  terrainPack?: TerrainPackEntry;
}): CategoryChip[] {
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
      href: "/missions",
      label: "Component",
      value: "Mission cards",
      imageUrl: missionCard?.backURL,
      imageCrop:
        missionCard?.uniqueBack === true
          ? cardImageCrop(missionCard)
          : undefined,
      imageFit: "contain",
    },
    ...(terrainPack
      ? [
          {
            href: `/terrain-packs/${terrainPack.slug}`,
            label: "Terrain pack",
            value: terrainPack.name,
            imageUrl: terrainPack.iconUrl,
          },
        ]
      : []),
  ];
}

function cardImageCrop(card: TTSCardImage) {
  return {
    left: card.col / card.numWidth,
    top: card.row / card.numHeight,
    width: 1 / card.numWidth,
    height: 1 / card.numHeight,
  };
}

function missionInvolvementLinks(
  targets: MissionTargetLink[],
  features: MissionFeatureLink[],
): MissionInvolvementLink[] {
  const uniqueLinks = new Map<string, MissionInvolvementLink>();
  for (const link of [...targets, ...features]) {
    uniqueLinks.set(`${link.kind}:${link.href}:${link.name}`, link);
  }
  return [...uniqueLinks.values()];
}

function missionInvolvementDetail(
  link: MissionInvolvementLink,
): MissionInvolvementDetail {
  const slug = lastPathSegment(link.href);
  const native =
    link.kind === "native" && slug ? getNativeGroupBySlug(slug) : undefined;
  const site = link.kind === "site" && slug ? getSiteBySlug(slug) : undefined;
  const monsterGroup =
    link.kind === "monsterGroup" && slug
      ? getMonsterGroupBySlug(slug)
      : undefined;
  const civLocation =
    link.kind === "civLocation" && slug
      ? getCivLocationBySlug(slug)
      : undefined;

  return {
    key: `${link.kind}-${link.href}-${link.name}`,
    kind: link.kind,
    href: link.href,
    name: link.name,
    native,
    site,
    sitePreview: site ? siteBoardPositionPreview(site.name) : undefined,
    monsterGroup,
    civLocation,
  };
}

function siteBoardPositionPreview(siteName: string) {
  const board = getBoardsForSite(siteName)[0];
  if (!board) return undefined;
  const position = getBoardPositionForItem(board.board, siteName);
  if (!position) return { imageUrl: board.board.imageURL };
  return {
    imageUrl: board.board.imageURL,
    imageCrop: cropForBoardPosition(position),
  };
}

function missionKindSummary(kinds: MissionKind[]): string | undefined {
  if (kinds.length === 0) return undefined;
  return kinds.map((kind) => missionKindLabel(kind)).join(", ");
}

function uniqueTerrainPackForMission(
  missionTerrainPacks: MissionTerrainPack[],
): TerrainPackEntry | undefined {
  const uniquePack = uniqueDefinedValue(
    missionTerrainPacks.filter((pack) => pack !== "neutral"),
  );
  const terrainPackName = uniquePack
    ? terrainPackNameForMissionPack(uniquePack)
    : undefined;
  if (!terrainPackName) return undefined;
  return getAllTerrainPacks().find((pack) => pack.name === terrainPackName);
}

function terrainPackNameForMissionPack(
  pack: Exclude<MissionTerrainPack, "neutral">,
): string | undefined {
  switch (pack) {
    case "caves":
      return "Cruel Caves";
    case "deserts":
    case "oasis":
      return "Dreadful Deserts";
    case "hills":
      return "Hostile Hills";
    case "mountains":
      return "Malevolent Mountains";
    case "plains":
      return "Perilous Plains";
    case "riverlands":
      return "Ruthless Riverlands";
    case "swamps":
      return "Sinister Swamps";
    case "thickets":
      return "Tangled Thickets";
    case "woods":
      return "Wicked Woods";
  }
}

function uniqueDefinedValue<T extends string>(
  values: (T | undefined)[],
): T | undefined {
  const uniqueValues = new Set(
    values.filter((value): value is T => value !== undefined),
  );
  return uniqueValues.size === 1 ? [...uniqueValues][0] : undefined;
}

function releaseCategoryValue(
  release: NonNullable<ReturnType<typeof getReleaseByBoxName>>,
): string {
  return release.sourceSlug === "core" ? "Core box" : release.title;
}

function lastPathSegment(href: string): string | undefined {
  return href.split("/").filter(Boolean).at(-1);
}
