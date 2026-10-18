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
import type { MissionKind, TTSCardImage } from "@/lib/tts";
import type { MissionTargetKind, MissionTargetLink } from "@/lib/tts/lookup";
import {
  getAllMissions,
  getMissionBySlug,
  getNativeGroupBySlug,
  getSiteBySlug,
} from "@/lib/tts/lookup";

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

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <PageHeader
        title={mission.name}
        subtitle={missionKindSummary(mission.kinds)}
        categories={missionHeaderCategories(missionCard)}
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
          title="Complete at"
          count={mission.targets.length}
          countLabel={`${mission.targets.length} location${mission.targets.length === 1 ? "" : "s"}`}
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {mission.targets.map((target) => (
              <CompleteAtTarget key={`${target.kind}-${target.name}`} target={target} />
            ))}
          </div>
        </CollapsibleBox>
      </div>
    </main>
  );
}

function missionHeaderCategories(
  missionCard: TTSCardImage | undefined,
): PageHeaderCategoryLink[] {
  return [
    {
      href: "/missions",
      label: "Component",
      value: "Mission cards",
      imageUrl: missionCard?.backURL,
      imageCrop:
        missionCard?.uniqueBack === true ? cardImageCrop(missionCard) : undefined,
      imageFit: "contain",
    },
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

function CompleteAtTarget({ target }: { target: MissionTargetLink }) {
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

  return (
    <Link
      href={target.href}
      className="rounded border border-zinc-200 px-3 py-2 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      <span className="font-medium">{target.name}</span>
      <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
        {missionTargetKindLabel(target.kind)}
      </span>
    </Link>
  );
}

function missionKindSummary(kinds: MissionKind[]): string | undefined {
  if (kinds.length === 0) return undefined;
  return kinds.map((kind) => missionKindLabel(kind)).join(", ");
}

function lastPathSegment(href: string): string | undefined {
  return href.split("/").filter(Boolean).at(-1);
}

function missionTargetKindLabel(kind: MissionTargetKind): string {
  switch (kind) {
    case "native":
      return "native";
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
