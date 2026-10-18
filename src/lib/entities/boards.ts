import type { BoardAreaLink } from "@/components/BoardImageToggle";
import { getBoardImageCropTop } from "@/lib/board-image-crops";
import { getBoardPositionForItem } from "@/lib/board-positions";
import { getManualBoardReleaseBox } from "@/lib/board-releases";
import { getReleaseByBoxName } from "@/lib/releases";
import { slugify } from "@/lib/slug";
import {
  getAllBoards,
  getAllTerrainPacks,
  getBoardBySlug,
  getMerchantBySlug,
  getSiteBySlug,
  getWildernessTokenBySlug,
  type TerrainPackEntry,
} from "@/lib/tts/lookup";
import type { BoardDetail, CategoryChip } from "./types";

type LinkTarget = {
  name: string;
  href: string;
};

const boardDetailsBySlug = new Map<string, BoardDetail | undefined>();

export function getAllBoardDetailSlugs(): string[] {
  return getAllBoards().map((entry) => entry.slug);
}

export function getBoardDetail(slug: string): BoardDetail | undefined {
  if (boardDetailsBySlug.has(slug)) return boardDetailsBySlug.get(slug);

  const detail = buildBoardDetail(slug);
  boardDetailsBySlug.set(slug, detail);
  return detail;
}

function buildBoardDetail(slug: string): BoardDetail | undefined {
  const entry = getBoardBySlug(slug);
  if (!entry) return undefined;

  const { board } = entry;
  const terrainPack = uniqueTerrainPackForBoard(board);
  const releaseBox =
    board.box ?? terrainPack?.box ?? getManualBoardReleaseBox(entry.slug);
  const release = releaseBox ? getReleaseByBoxName(releaseBox) : undefined;
  const sites = board.sites
    .map(resolveSiteTarget)
    .filter((site): site is LinkTarget => site !== null);
  const merchants = board.merchants
    .map(resolveMerchantTarget)
    .filter((merchant): merchant is LinkTarget => merchant !== null);

  return {
    entry,
    subtitle: boardContentsLabel({
      merchants: merchants.length,
      treasureSites: sites.length,
    }),
    categories: boardHeaderCategories({
      release,
      boardIconUrl: board.imageSecondaryURL,
      terrainPack,
    }),
    areas: boardAreas(board, [...sites, ...merchants]),
    cropTop: getBoardImageCropTop(entry.slug),
  };
}

function boardAreas(
  board: Parameters<typeof getBoardPositionForItem>[0],
  targets: LinkTarget[],
): BoardAreaLink[] {
  return targets
    .map((target) => {
      const position = getBoardPositionForItem(board, target.name);
      return position
        ? { name: target.name, href: target.href, position }
        : null;
    })
    .filter((target): target is BoardAreaLink => target !== null);
}

function boardHeaderCategories({
  release,
  boardIconUrl,
  terrainPack,
}: {
  release?: ReturnType<typeof getReleaseByBoxName>;
  boardIconUrl: string;
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
      href: "/boards",
      label: "Component",
      value: "Boards",
      imageUrl: boardIconUrl,
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

function uniqueTerrainPackForBoard(board: {
  terrain: string;
  terrainPack?: string;
}): TerrainPackEntry | undefined {
  const terrainPackName = board.terrainPack ?? board.terrain;
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

function boardContentsLabel({
  merchants,
  treasureSites,
}: {
  merchants: number;
  treasureSites: number;
}): string {
  const parts = [];
  if (merchants > 0) {
    parts.push(`${merchants} merchant${merchants === 1 ? "" : "s"}`);
  }
  if (treasureSites > 0) {
    parts.push(
      `${treasureSites} treasure site${treasureSites === 1 ? "" : "s"}`,
    );
  }
  return parts.length > 0 ? parts.join(" and ") : "Empty board";
}

function resolveSiteTarget(name: string): LinkTarget | null {
  const slug = slugify(name);
  const site = getSiteBySlug(slug);
  if (site) {
    return {
      name,
      href: `/sites/${site.slug}`,
    };
  }
  const wildernessToken = getWildernessTokenBySlug(slug);
  if (!wildernessToken) return null;
  return {
    name,
    href: `/wilderness-tokens/${wildernessToken.slug}`,
  };
}

function resolveMerchantTarget(name: string): LinkTarget | null {
  const slug = slugify(name);
  const merchant = getMerchantBySlug(slug);
  if (merchant) {
    return {
      name,
      href: `/merchants/${merchant.slug}`,
    };
  }
  const wildernessToken = getWildernessTokenBySlug(slug);
  if (!wildernessToken) return null;
  return {
    name,
    href: `/wilderness-tokens/${wildernessToken.slug}`,
  };
}
