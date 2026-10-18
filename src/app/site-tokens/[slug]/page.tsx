import { notFound } from "next/navigation";
import {
  PageHeader,
  PageHeaderCategoryChip,
  type PageHeaderCategoryLink,
} from "@/components/PageHeader";
import { getReleaseByBoxName } from "@/lib/releases";
import {
  getAllSites,
  getAllTerrainPacks,
  getSiteBySlug,
  type SiteEntry,
  type TerrainPackEntry,
} from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllSites()
    .filter((entry) => entry.kind === "proper")
    .map((entry) => ({ slug: entry.slug }));
}

export default async function SiteTokenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getSiteBySlug(slug);
  if (!entry || entry.kind !== "proper") notFound();

  const terrainPack = uniqueTerrainPackByName(entry.site.terrainPack);
  const releaseBox = entry.site.box ?? terrainPack?.box;
  const release = releaseBox ? getReleaseByBoxName(releaseBox) : undefined;
  const imageUrl = siteTokenImageUrl(entry);
  const treasureSiteCategory = siteTokenTreasureSiteCategory(entry);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <PageHeader
        title={entry.name}
        subtitle="Large same-sided token"
        categories={siteTokenHeaderCategories({
          entry,
          release,
          terrainPack,
          treasureSiteCategory,
        })}
      />

      <div className="mb-10 max-w-xs">
        <div className="overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={entry.name}
            className="block aspect-square w-full object-cover"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <span>For more details see</span>
          <PageHeaderCategoryChip {...treasureSiteCategory} />
        </div>
      </div>
    </main>
  );
}

function siteTokenHeaderCategories({
  entry,
  release,
  terrainPack,
  treasureSiteCategory,
}: {
  entry: SiteEntry;
  release?: ReturnType<typeof getReleaseByBoxName>;
  terrainPack?: TerrainPackEntry;
  treasureSiteCategory: PageHeaderCategoryLink;
}): PageHeaderCategoryLink[] {
  const imageUrl = siteTokenImageUrl(entry);

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
      href: "/site-tokens",
      label: "Component",
      value: "Site Tokens",
      imageUrl,
    },
    treasureSiteCategory,
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

function siteTokenTreasureSiteCategory(
  entry: SiteEntry,
): PageHeaderCategoryLink {
  const imageUrl = siteTokenImageUrl(entry);
  return {
    href: `/sites/${entry.slug}`,
    label: "Treasure site",
    value: entry.name,
    imageUrl,
  };
}

function siteTokenImageUrl(entry: SiteEntry): string {
  return entry.site.imageSecondaryURL || entry.site.imageURL;
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
