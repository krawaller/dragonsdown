import { cropForBoardPosition } from "@/lib/board-position-crop";
import { getBoardPositionForItem } from "@/lib/board-positions";
import { getReleaseByBoxName } from "@/lib/releases";
import { resolveSiteRulebookLinks } from "@/lib/rulebook-links";
import {
  getAllSites,
  getAllTerrainPacks,
  getBoardsForSite,
  getMissionsForTarget,
  getMonsterGroupBySlug,
  getMonsterGroupsForSite,
  getSiteBySlug,
  getWildernessTokenBySlug,
  type BoardEntry,
  type SiteEntry,
  type TerrainPackEntry,
  type WildernessTokenNameEntry,
} from "@/lib/tts/lookup";
import type { CategoryChip, SiteDetail, SiteTokenItemDetail } from "./types";

const siteDetailsBySlug = new Map<string, Promise<SiteDetail | undefined>>();

export function getAllSiteDetailSlugs(): string[] {
  return getAllSites().map((entry) => entry.slug);
}

export function getSiteDetail(slug: string): Promise<SiteDetail | undefined> {
  const cached = siteDetailsBySlug.get(slug);
  if (cached) return cached;

  const detail = buildSiteDetail(slug);
  siteDetailsBySlug.set(slug, detail);
  return detail;
}

async function buildSiteDetail(slug: string): Promise<SiteDetail | undefined> {
  const entry = getSiteBySlug(slug);
  if (!entry) return undefined;

  const boards = getBoardsForSite(entry.name);
  const terrainPackName =
    entry.site.terrainPack ??
    boards[0]?.board.terrainPack ??
    boards[0]?.board.terrain;
  const terrainPack = uniqueTerrainPackByName(terrainPackName);
  const releaseBox = entry.site.box ?? terrainPack?.box;
  const release = releaseBox ? getReleaseByBoxName(releaseBox) : undefined;
  const treasureSiteToken =
    entry.kind === "proper" ? getWildernessTokenBySlug("site") : undefined;
  const wildernessToken =
    entry.kind === "wilderness-token"
      ? getWildernessTokenBySlug(entry.slug)
      : undefined;
  const guardians = getMonsterGroupsForSite(entry.name).flatMap((group) => {
    const fullGroup = getMonsterGroupBySlug(group.slug);
    return fullGroup ? [fullGroup] : [];
  });
  const tokenItems = siteTokenItems({
    site: entry,
    treasureSiteToken,
    wildernessToken,
  });

  return {
    entry,
    subtitle: siteSubtitle(entry.kind),
    categories: siteHeaderCategories({
      release,
      siteName: entry.name,
      terrainPack,
      boards,
    }),
    boards,
    tokenItems,
    guardians,
    tokenAndGuardianCount: tokenItems.length + guardians.length,
    relatedMissions: getMissionsForTarget(entry.name),
    rulebookLinks: await resolveSiteRulebookLinks(entry.name),
  };
}

function siteHeaderCategories({
  release,
  siteName,
  terrainPack,
  boards,
}: {
  release?: ReturnType<typeof getReleaseByBoxName>;
  siteName: string;
  terrainPack?: TerrainPackEntry;
  boards: BoardEntry[];
}): CategoryChip[] {
  const treasureSiteIcon = treasureSiteCategoryIcon(boards, siteName);

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
      href: "/sites",
      label: "Concept",
      value: "Treasure Sites",
      imageUrl: treasureSiteIcon?.imageUrl,
      imageCrop: treasureSiteIcon?.imageCrop,
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
    ...boards.map((board) => ({
      href: `/boards/${board.slug}`,
      label: "Board",
      value: board.title,
      imageUrl: board.board.imageURL,
    })),
  ];
}

function treasureSiteCategoryIcon(
  boards: BoardEntry[],
  siteName: string,
): Pick<CategoryChip, "imageUrl" | "imageCrop"> | undefined {
  const board = boards[0];
  if (!board) return undefined;
  const position = getBoardPositionForItem(board.board, siteName);
  if (!position) return { imageUrl: board.board.imageURL };
  return {
    imageUrl: board.board.imageURL,
    imageCrop: cropForBoardPosition(position),
  };
}

function siteTokenItems({
  site,
  treasureSiteToken,
  wildernessToken,
}: {
  site: SiteEntry;
  treasureSiteToken?: WildernessTokenNameEntry;
  wildernessToken?: WildernessTokenNameEntry;
}): SiteTokenItemDetail[] {
  return [
    {
      href: `/site-tokens/${site.slug}`,
      imageUrl: site.site.imageSecondaryURL || site.site.imageURL,
      name: site.name,
      label: "Site token",
    },
    ...(treasureSiteToken
      ? [wildernessTokenItem(treasureSiteToken, "Treasure site token")]
      : []),
    ...(wildernessToken
      ? [wildernessTokenItem(wildernessToken, "Wilderness token")]
      : []),
  ];
}

function wildernessTokenItem(
  token: WildernessTokenNameEntry,
  label: string,
): SiteTokenItemDetail {
  return {
    href: `/wilderness-tokens/${token.slug}`,
    imageUrl: token.tokens[0]?.imageURL ?? "",
    images: token.tokens.map((entry) => ({ imageURL: entry.imageURL })),
    name: token.name,
    label,
  };
}

function uniqueTerrainPackByName(
  terrainPackName: string | undefined,
): TerrainPackEntry | undefined {
  if (!terrainPackName) return undefined;
  const terrainPacks = getAllTerrainPacks().filter(
    (pack) => pack.name === terrainPackName,
  );
  return terrainPacks.length === 1 ? terrainPacks[0] : undefined;
}

function releaseCategoryValue(
  release: NonNullable<ReturnType<typeof getReleaseByBoxName>>,
): string {
  return release.sourceSlug === "core" ? "Core box" : release.title;
}

function siteSubtitle(kind: SiteEntry["kind"]): string {
  return kind === "wilderness-token"
    ? "Wilderness token Site"
    : "Site token Site";
}
