import Link from "next/link";
import { notFound } from "next/navigation";
import { SpriteCell } from "@/components/CardSprite";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { MonsterGroupStack } from "@/components/MonsterGroupChips";
import { PageHeader } from "@/components/PageHeader";
import { SiteLink } from "@/components/SiteLink";
import {
  getAllMissionDetailSlugs,
  getMissionDetail,
} from "@/lib/entities/missions";
import type { MissionInvolvementDetail } from "@/lib/entities/types";
import type { MissionFeatureKind, MissionTargetKind } from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllMissionDetailSlugs().map((slug) => ({ slug }));
}

export default async function MissionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mission = getMissionDetail(slug);
  if (!mission) notFound();
  const { entry } = mission;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <PageHeader
        title={entry.name}
        subtitle={mission.subtitle}
        categories={mission.categories}
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 justify-items-center gap-4 sm:grid-cols-2">
          {entry.cards.map((card, index) => (
            <SpriteCell
              key={`${card.faceURL}-${card.row}-${card.col}-${index}`}
              card={card}
              className="w-full max-w-64 border border-zinc-200 shadow-sm dark:border-zinc-800"
            />
          ))}
        </div>

        <CollapsibleBox
          title="Involves"
          count={mission.involvements.length}
          countLabel={`${mission.involvements.length} item${mission.involvements.length === 1 ? "" : "s"}`}
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {mission.involvements.map((target) => (
              <MissionInvolvement key={target.key} target={target} />
            ))}
          </div>
        </CollapsibleBox>
      </div>
    </main>
  );
}

function MissionInvolvement({ target }: { target: MissionInvolvementDetail }) {
  if (target.kind === "native") {
    if (target.native) {
      return (
        <MonsterGroupStack
          group={target.native}
          hrefBase="/natives"
          summaryKind="native"
        />
      );
    }
  }

  if (target.kind === "site") {
    if (target.site) {
      return (
        <SiteLink
          name={target.site.name}
          href={`/sites/${target.site.slug}`}
          imageURL={
            target.sitePreview?.imageUrl ?? target.site.site.imageSecondaryURL
          }
          imageCrop={target.sitePreview?.imageCrop}
          size="compact"
          subtitle={target.site.site.terrainPack}
        />
      );
    }
  }

  if (target.kind === "monsterGroup") {
    if (target.monsterGroup) {
      return (
        <MonsterGroupStack
          group={target.monsterGroup}
          hrefBase="/monster-groups"
        />
      );
    }
  }

  if (target.kind === "civLocation") {
    if (target.civLocation) {
      return <CivLocationLink location={target.civLocation} />;
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
  location: NonNullable<MissionInvolvementDetail["civLocation"]>;
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
