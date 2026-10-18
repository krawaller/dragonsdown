import { getReleaseByBoxName } from "@/lib/releases";
import {
  getAllMerchants,
  getAllTerrainPacks,
  getBoardsForMerchant,
  getMerchantBySlug,
  getMissionsForTarget,
  type BoardEntry,
  type CivilisationTokenListEntry,
  type MerchantEntry,
  type TerrainPackEntry,
} from "@/lib/tts/lookup";
import type {
  CategoryChip,
  MerchantDetail,
  MerchantTokenDetail,
} from "./types";

const merchantDetailsBySlug = new Map<string, MerchantDetail | undefined>();

export function getAllMerchantDetailSlugs(): string[] {
  return getAllMerchants().map((entry) => entry.slug);
}

export function getMerchantDetail(slug: string): MerchantDetail | undefined {
  if (merchantDetailsBySlug.has(slug)) return merchantDetailsBySlug.get(slug);

  const detail = buildMerchantDetail(slug);
  merchantDetailsBySlug.set(slug, detail);
  return detail;
}

function buildMerchantDetail(slug: string): MerchantDetail | undefined {
  const entry = getMerchantBySlug(slug);
  if (!entry) return undefined;

  const boards = getBoardsForMerchant(entry.name);
  const terrainPack = uniqueTerrainPackForMerchant(entry, boards);
  const releaseBox = uniqueDefinedValue(entry.tokens.map((token) => token.box));
  const release = releaseBox ? getReleaseByBoxName(releaseBox) : undefined;
  const totalTokens = entry.tokens.reduce(
    (sum, token) => sum + tokenTotalCount(token),
    0,
  );

  return {
    entry,
    categories: merchantHeaderCategories({
      release,
      entry,
      terrainPack,
      boards,
    }),
    boards,
    missions: getMissionsForTarget(entry.name),
    tokens: entry.tokens.map(merchantTokenDetail),
    totalTokens,
    totalTokensLabel: `${totalTokens} physical token${totalTokens === 1 ? "" : "s"}`,
  };
}

function merchantHeaderCategories({
  release,
  entry,
  terrainPack,
  boards,
}: {
  release?: ReturnType<typeof getReleaseByBoxName>;
  entry: MerchantEntry;
  terrainPack?: TerrainPackEntry;
  boards: BoardEntry[];
}): CategoryChip[] {
  const tokenIcon = merchantTokenIcon(entry);

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
      href: "/merchants",
      label: "Concept",
      value: "Merchants",
      imageUrl: tokenIcon,
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

function merchantTokenDetail(
  token: CivilisationTokenListEntry,
): MerchantTokenDetail {
  return {
    key: `${token.terrainGroup}-${token.displayName}-${token.imageSecondaryURL}`,
    href: `/civilisation-tokens/${token.slug}`,
    imageUrl: token.imageSecondaryURL || token.imageURL,
    alt: civilisationTokenImageAlt(token),
  };
}

function uniqueTerrainPackForMerchant(
  entry: MerchantEntry,
  boards: BoardEntry[],
): TerrainPackEntry | undefined {
  const terrainPackName = uniqueDefinedValue([
    ...entry.tokens.map((token) => token.terrainPack ?? token.terrainGroup),
    ...boards.map((board) => board.board.terrainPack ?? board.board.terrain),
  ]);
  if (!terrainPackName) return undefined;
  const terrainPacks = getAllTerrainPacks().filter(
    (pack) => pack.name === terrainPackName,
  );
  return terrainPacks.length === 1 ? terrainPacks[0] : undefined;
}

function merchantTokenIcon(entry: MerchantEntry): string | undefined {
  const token = entry.tokens[0];
  return token ? token.imageSecondaryURL || token.imageURL : undefined;
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

function civilisationTokenImageAlt(token: CivilisationTokenListEntry): string {
  if (token.terrainGroup === token.displayName) return token.displayName;
  return `${token.displayName} ${token.terrainGroup}`;
}

function tokenTotalCount(token: CivilisationTokenListEntry): number {
  return token.locations.reduce((sum, loc) => sum + loc.count, 0);
}
