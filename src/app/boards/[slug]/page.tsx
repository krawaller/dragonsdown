import { notFound } from "next/navigation";
import {
  BoardImageToggle,
  type BoardAreaLink,
} from "@/components/BoardImageToggle";
import {
  PageHeader,
  type PageHeaderCategoryLink,
} from "@/components/PageHeader";
import { getBoardImageCropTop } from "@/lib/board-image-crops";
import { getBoardPositionForItem } from "@/lib/board-positions";
import { getManualBoardReleaseBox } from "@/lib/board-releases";
import { getReleaseByBoxName } from "@/lib/releases";
import {
  getAllBoards,
  getAllTerrainPacks,
  getBoardBySlug,
  getMerchantBySlug,
  getSiteBySlug,
  getWildernessTokenBySlug,
  type TerrainPackEntry,
} from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllBoards().map((entry) => ({ slug: entry.slug }));
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getBoardBySlug(slug);
  if (!entry) notFound();

  const { title, board } = entry;
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
  const boardAreas = [...sites, ...merchants]
    .map((target) => {
      const position = getBoardPositionForItem(board, target.name);
      return position
        ? { name: target.name, href: target.href, position }
        : null;
    })
    .filter((target): target is BoardAreaLink => target !== null);
  const subtitle = boardContentsLabel({
    merchants: merchants.length,
    treasureSites: sites.length,
  });
  const categories = boardHeaderCategories({
    release,
    boardIconUrl: board.imageSecondaryURL,
    terrainPack,
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <PageHeader title={title} subtitle={subtitle} categories={categories} />

      <BoardImageToggle
        title={title}
        imageURL={board.imageURL}
        imageSecondaryURL={board.imageSecondaryURL}
        areas={boardAreas}
        cropTop={getBoardImageCropTop(entry.slug)}
      />
    </main>
  );
}

type LinkTarget = {
  name: string;
  href: string;
  imageURL: string;
};

function boardHeaderCategories({
  release,
  boardIconUrl,
  terrainPack,
}: {
  release?: ReturnType<typeof getReleaseByBoxName>;
  boardIconUrl: string;
  terrainPack?: TerrainPackEntry;
}): PageHeaderCategoryLink[] {
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
      imageURL: site.site.imageSecondaryURL,
    };
  }
  const wildernessToken = getWildernessTokenBySlug(slug);
  if (!wildernessToken) return null;
  return {
    name,
    href: `/wilderness-tokens/${wildernessToken.slug}`,
    imageURL: wildernessToken.tokens[0].imageURL,
  };
}

function resolveMerchantTarget(name: string): LinkTarget | null {
  const slug = slugify(name);
  const merchant = getMerchantBySlug(slug);
  if (merchant) {
    const token = merchant.tokens[0];
    return {
      name,
      href: `/merchants/${merchant.slug}`,
      imageURL: token.imageSecondaryURL || token.imageURL,
    };
  }
  const wildernessToken = getWildernessTokenBySlug(slug);
  if (!wildernessToken) return null;
  return {
    name,
    href: `/wilderness-tokens/${wildernessToken.slug}`,
    imageURL: wildernessToken.tokens[0].imageURL,
  };
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
