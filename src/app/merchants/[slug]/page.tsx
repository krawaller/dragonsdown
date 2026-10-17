import Link from "next/link";
import { notFound } from "next/navigation";
import { BoardPositionLinks } from "@/components/BoardPositionLinks";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { MissionCardLinks } from "@/components/MissionCardLinks";
import {
  PageHeader,
  type PageHeaderCategoryLink,
} from "@/components/PageHeader";
import { getReleaseByBoxName } from "@/lib/releases";
import {
  getAllMerchants,
  getAllTerrainPacks,
  getBoardsForMerchant,
  getMerchantBySlug,
  getMissionsForTarget,
  type CivilisationTokenListEntry,
  type MerchantEntry,
  type TerrainPackEntry,
} from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllMerchants().map((entry) => ({ slug: entry.slug }));
}

export default async function MerchantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getMerchantBySlug(slug);
  if (!entry) notFound();

  const totalTokens = entry.tokens.reduce(
    (sum, token) => sum + tokenTotalCount(token),
    0,
  );
  const boards = getBoardsForMerchant(entry.name);
  const missions = getMissionsForTarget(entry.name);
  const terrainPack = uniqueTerrainPackForMerchant(entry, boards);
  const releaseBox = uniqueDefinedValue(entry.tokens.map((token) => token.box));
  const release = releaseBox ? getReleaseByBoxName(releaseBox) : undefined;
  const categories = merchantHeaderCategories({
    release,
    entry,
    terrainPack,
    boards,
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <PageHeader
        title={entry.name}
        subtitle={`${entry.tokens.length} image${entry.tokens.length === 1 ? "" : "s"} · ${totalTokens} physical token${totalTokens === 1 ? "" : "s"}`}
        categories={categories}
      />

      <div className="space-y-6">
        <BoardPositionLinks
          boards={boards}
          itemName={entry.name}
          className=""
          showHeading={false}
          showCaption={false}
          linked={false}
          displaySides="both"
          collapsibleTitle="Board Position"
        />

        <CollapsibleBox
          title="Related Missions"
          count={missions.length}
          countLabel={`${missions.length} mission${missions.length === 1 ? "" : "s"}`}
        >
          <MissionCardLinks missions={missions} />
        </CollapsibleBox>

        <MerchantTokensBox entry={entry} totalTokens={totalTokens} />
      </div>
    </main>
  );
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
  boards: ReturnType<typeof getBoardsForMerchant>;
}): PageHeaderCategoryLink[] {
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

function MerchantTokensBox({
  entry,
  totalTokens,
}: {
  entry: MerchantEntry;
  totalTokens: number;
}) {
  return (
    <CollapsibleBox
      title="Tokens"
      count={entry.tokens.length}
      countLabel={`${totalTokens} physical token${totalTokens === 1 ? "" : "s"}`}
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {entry.tokens.map((token) => (
          <MerchantTokenCard
            key={`${token.terrainGroup}-${token.displayName}-${token.imageSecondaryURL}`}
            token={token}
          />
        ))}
      </div>
    </CollapsibleBox>
  );
}

function MerchantTokenCard({ token }: { token: CivilisationTokenListEntry }) {
  return (
    <Link
      href={`/civilisation-tokens/${token.slug}`}
      className="group flex min-w-0 flex-col gap-2"
    >
      <div className="overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={token.imageSecondaryURL || token.imageURL}
          alt={civilisationTokenImageAlt(token)}
          className="block aspect-square w-full object-cover"
        />
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-semibold group-hover:underline">
          Civilisation token
        </h2>
      </div>
    </Link>
  );
}

function uniqueTerrainPackForMerchant(
  entry: MerchantEntry,
  boards: ReturnType<typeof getBoardsForMerchant>,
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
