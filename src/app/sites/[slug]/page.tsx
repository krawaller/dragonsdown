import Link from "next/link";
import { notFound } from "next/navigation";
import { BoardPositionLinks } from "@/components/BoardPositionLinks";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { MissionCardLinks } from "@/components/MissionCardLinks";
import { MonsterGroupStack } from "@/components/MonsterGroupChips";
import {
  PageHeader,
  type PageHeaderCategoryLink,
} from "@/components/PageHeader";
import { RulebookLinks } from "@/components/RulebookLinks";
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
  type MissionEntry,
  type SiteEntry,
  type TerrainPackEntry,
  type WildernessTokenNameEntry,
} from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllSites().map((entry) => ({ slug: entry.slug }));
}

export default async function SitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getSiteBySlug(slug);
  if (!entry) notFound();

  const boards = getBoardsForSite(entry.name);
  const terrainPackName =
    entry.site.terrainPack ??
    boards[0]?.board.terrainPack ??
    boards[0]?.board.terrain;
  const terrainPack = uniqueTerrainPackByName(terrainPackName);
  const releaseBox = entry.site.box ?? terrainPack?.box;
  const release = releaseBox ? getReleaseByBoxName(releaseBox) : undefined;
  const subtitle = siteSubtitle(entry.kind);
  const treasureSiteToken =
    entry.kind === "proper" ? getWildernessTokenBySlug("site") : undefined;
  const wildernessToken =
    entry.kind === "wilderness-token"
      ? getWildernessTokenBySlug(entry.slug)
      : undefined;
  const monsterGroups = getMonsterGroupsForSite(entry.name).flatMap((group) => {
    const fullGroup = getMonsterGroupBySlug(group.slug);
    return fullGroup ? [fullGroup] : [];
  });
  const tokenItems = siteTokenItems({
    site: entry,
    treasureSiteToken,
    wildernessToken,
  });
  const missions = getMissionsForTarget(entry.name);
  const rulebookLinks = await resolveSiteRulebookLinks(entry.name);
  const categories = siteHeaderCategories({
    release,
    siteName: entry.name,
    terrainPack,
    boards,
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <PageHeader
        title={entry.name}
        subtitle={subtitle}
        categories={categories}
      />

      <BoardPositionLinks
        boards={boards}
        itemName={entry.name}
        className="mb-10"
        showHeading={false}
        showCaption={false}
        linked={false}
        displaySides="both"
        collapsibleTitle="Board Position"
      />

      <TokensAndGuardiansBox
        monsterGroups={monsterGroups}
        tokenItems={tokenItems}
      />

      <RelatedMissionsBox missions={missions} />

      <RulebookLinks links={rulebookLinks} heading={null} className="mt-10" />
    </main>
  );
}

function RelatedMissionsBox({ missions }: { missions: MissionEntry[] }) {
  if (missions.length === 0) return null;

  return (
    <section className="mt-10">
      <CollapsibleBox
        title="Related Missions"
        count={missions.length}
        countLabel={missionCountLabel(missions.length)}
      >
        <MissionCardLinks missions={missions} />
      </CollapsibleBox>
    </section>
  );
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
  boards: ReturnType<typeof getBoardsForSite>;
}): PageHeaderCategoryLink[] {
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
  boards: ReturnType<typeof getBoardsForSite>,
  siteName: string,
): Pick<PageHeaderCategoryLink, "imageUrl" | "imageCrop"> | undefined {
  const board = boards[0];
  if (!board) return undefined;
  const position = getBoardPositionForItem(board.board, siteName);
  if (!position) return { imageUrl: board.board.imageURL };
  return {
    imageUrl: board.board.imageURL,
    imageCrop: cropForBoardPosition(position),
  };
}

type SiteTokenItem = {
  href?: string;
  imageUrl: string;
  name: string;
  label: string;
  images?: { imageURL: string }[];
};

function siteTokenItems({
  site,
  treasureSiteToken,
  wildernessToken,
}: {
  site: SiteEntry;
  treasureSiteToken?: WildernessTokenNameEntry;
  wildernessToken?: WildernessTokenNameEntry;
}): SiteTokenItem[] {
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
): SiteTokenItem {
  return {
    href: `/wilderness-tokens/${token.slug}`,
    imageUrl: token.tokens[0]?.imageURL ?? "",
    images: token.tokens.map((entry) => ({ imageURL: entry.imageURL })),
    name: token.name,
    label,
  };
}

function TokensAndGuardiansBox({
  monsterGroups,
  tokenItems,
}: {
  monsterGroups: ReturnType<typeof getMonsterGroupBySlug>[];
  tokenItems: SiteTokenItem[];
}) {
  const guardians = monsterGroups.filter(
    (group): group is NonNullable<ReturnType<typeof getMonsterGroupBySlug>> =>
      Boolean(group),
  );
  const count = guardians.length + tokenItems.length;

  return (
    <section className="mt-10">
      <CollapsibleBox
        title="Tokens & Guardians"
        count={count}
        countLabel={`${count} item${count === 1 ? "" : "s"}`}
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {tokenItems.map((item) => (
            <SiteTokenTile key={item.label} item={item} />
          ))}
          {guardians.map((group) => (
            <MonsterGroupStack
              key={group.slug}
              group={group}
              subtitle="guardian"
            />
          ))}
        </div>
      </CollapsibleBox>
    </section>
  );
}

function SiteTokenTile({ item }: { item: SiteTokenItem }) {
  const preview = item.images ?? [{ imageURL: item.imageUrl }];
  const previewHeightClass = preview.length <= 1 ? "h-20" : "h-28";
  const content = (
    <>
      <span className={`relative mb-4 block ${previewHeightClass}`}>
        {preview.map((token, index) => (
          <span
            key={`${token.imageURL}-${index}`}
            className="absolute block size-20 overflow-hidden rounded border border-zinc-200 bg-zinc-100 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            style={{
              left: `${index * 1.55}rem`,
              top: `${index % 2 === 0 ? 0 : 1.25}rem`,
              zIndex: preview.length - index,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={token.imageURL}
              alt=""
              className="block size-full object-cover"
            />
          </span>
        ))}
      </span>
      <span className="block min-w-0">
        <span className="block text-lg font-semibold group-hover:underline">
          {item.name}
        </span>
        <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">
          {item.label}
        </span>
      </span>
    </>
  );

  if (!item.href) {
    return (
      <div className="group block rounded border border-zinc-200 p-4 dark:border-zinc-800">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className="group block rounded border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      {content}
    </Link>
  );
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

function missionCountLabel(count: number): string {
  return `${count} mission${count === 1 ? "" : "s"}`;
}

function siteSubtitle(kind: SiteEntry["kind"]): string {
  return kind === "wilderness-token"
    ? "Wilderness token Site"
    : "Site token Site";
}
