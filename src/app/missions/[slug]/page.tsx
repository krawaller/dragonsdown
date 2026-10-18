import Link from "next/link";
import { notFound } from "next/navigation";
import { SpriteCell } from "@/components/CardSprite";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { missionKindLabel } from "@/components/MissionKindBadge";
import { MonsterGroupStack } from "@/components/MonsterGroupChips";
import {
  PageHeader,
  type PageHeaderCategoryLink,
} from "@/components/PageHeader";
import { SiteLink } from "@/components/SiteLink";
import { getReleaseByBoxName } from "@/lib/releases";
import type { MissionKind, MissionTerrainPack, TTSCardImage } from "@/lib/tts";
import type {
  MissionFeatureKind,
  MissionFeatureLink,
  MissionTargetKind,
  MissionTargetLink,
} from "@/lib/tts/lookup";
import {
  getAllMissions,
  getAllTerrainPacks,
  getCivLocationBySlug,
  getMissionBySlug,
  getMonsterGroupBySlug,
  getNativeGroupBySlug,
  getSiteBySlug,
  type TerrainPackEntry,
} from "@/lib/tts/lookup";

type MissionInvolvementLink = MissionTargetLink | MissionFeatureLink;

export function generateStaticParams() {
  return getAllMissions().map((entry) => ({ slug: entry.slug }));
}

export default async function MissionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mission = getMissionBySlug(slug);
  if (!mission) notFound();
  const missionCard = mission.cards[0];
  const releaseBox = uniqueDefinedValue(mission.cards.map((card) => card.box));
  const release = releaseBox ? getReleaseByBoxName(releaseBox) : undefined;
  const terrainPack = uniqueTerrainPackForMission(mission.terrainPacks);
  const involvements = missionInvolvementLinks(
    mission.targets,
    mission.features,
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <PageHeader
        title={mission.name}
        subtitle={missionKindSummary(mission.kinds)}
        categories={missionHeaderCategories({
          release,
          missionCard,
          terrainPack,
        })}
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 justify-items-center gap-4 sm:grid-cols-2">
          {mission.cards.map((card, index) => (
            <SpriteCell
              key={`${card.faceURL}-${card.row}-${card.col}-${index}`}
              card={card}
              className="w-full max-w-64 border border-zinc-200 shadow-sm dark:border-zinc-800"
            />
          ))}
        </div>

        <CollapsibleBox
          title="Involves"
          count={involvements.length}
          countLabel={`${involvements.length} item${involvements.length === 1 ? "" : "s"}`}
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {involvements.map((target) => (
              <MissionInvolvement
                key={`${target.kind}-${target.href}-${target.name}`}
                target={target}
              />
            ))}
          </div>
        </CollapsibleBox>
      </div>
    </main>
  );
}

function missionHeaderCategories({
  release,
  missionCard,
  terrainPack,
}: {
  release?: ReturnType<typeof getReleaseByBoxName>;
  missionCard: TTSCardImage | undefined;
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

function MissionInvolvement({ target }: { target: MissionInvolvementLink }) {
  const slug = lastPathSegment(target.href);

  if (target.kind === "native") {
    const native = slug ? getNativeGroupBySlug(slug) : undefined;
    if (native) {
      return (
        <MonsterGroupStack
          group={native}
          hrefBase="/natives"
          summaryKind="native"
        />
      );
    }
  }

  if (target.kind === "site") {
    const site = slug ? getSiteBySlug(slug) : undefined;
    if (site) {
      return (
        <SiteLink
          name={site.name}
          href={`/sites/${site.slug}`}
          imageURL={site.site.imageSecondaryURL}
          subtitle={site.site.terrainPack}
        />
      );
    }
  }

  if (target.kind === "monsterGroup") {
    const group = slug ? getMonsterGroupBySlug(slug) : undefined;
    if (group) {
      return <MonsterGroupStack group={group} hrefBase="/monster-groups" />;
    }
  }

  if (target.kind === "civLocation") {
    const location = slug ? getCivLocationBySlug(slug) : undefined;
    if (location) {
      return <CivLocationLink location={location} />;
    }
  }

  return (
    <Link
      href={target.href}
      className="rounded border border-zinc-200 px-3 py-2 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      <span className="font-medium">{target.name}</span>
      <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
        {missionInvolvementKindLabel(target.kind)}
      </span>
    </Link>
  );
}

function CivLocationLink({
  location,
}: {
  location: NonNullable<ReturnType<typeof getCivLocationBySlug>>;
}) {
  const href = `/civ-locations/${location.slug}`;

  return (
    <section className="flex flex-col items-start gap-1">
      <Link
        href={href}
        className="w-40 overflow-hidden rounded border border-zinc-200 bg-zinc-100 transition hover:ring-2 hover:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 sm:w-44"
        aria-label={`View ${location.name}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={location.location.imageURL}
          alt={location.name}
          className="block aspect-square w-full object-contain"
        />
      </Link>
      <h2 className="mt-1 text-base font-semibold">
        <Link href={href} className="hover:underline">
          {location.name}
        </Link>
      </h2>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {location.location.terrainPack ?? "Civ location"}
      </p>
    </section>
  );
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

function missionInvolvementKindLabel(
  kind: MissionTargetKind | MissionFeatureKind,
): string {
  switch (kind) {
    case "native":
      return "native";
    case "monsterGroup":
      return "monster group";
    case "site":
      return "site";
    case "merchant":
      return "merchant";
    case "civLocation":
      return "civ";
    case "wildernessToken":
      return "token";
    case "mapTile":
      return "map tile";
  }
}
