import Link from "next/link";
import { notFound } from "next/navigation";
import { SpriteCell } from "@/components/CardSprite";
import { MissionKindBadge } from "@/components/MissionKindBadge";
import type {
  MissionTerrainPack,
  TTSMissionCard,
  TTSMissionRewards,
} from "@/lib/tts";
import type { MissionTargetKind } from "@/lib/tts/lookup";
import { getAllMissions, getMissionBySlug } from "@/lib/tts/lookup";

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

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/missions" className="hover:underline">
          Missions
        </Link>
      </div>

      <div className="mt-4 mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-3">{mission.name}</h1>
          {mission.kinds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {mission.kinds.map((kind) => (
                <MissionKindBadge key={kind} kind={kind} />
              ))}
            </div>
          )}
          {mission.terrainPacks.length > 0 && (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              Terrain pack:{" "}
              {mission.terrainPacks.map(terrainPackLabel).join(", ")}
            </p>
          )}
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {mission.cards.length} card{mission.cards.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-10">
        <div className="space-y-10">
          {mission.descriptions.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-3">Description</h2>
              <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                {mission.descriptions.map((description) => (
                  <p key={description}>{description}</p>
                ))}
              </div>
            </section>
          )}

          {mission.targets.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-3">Complete At</h2>
              <div className="flex flex-wrap gap-2">
                {mission.targets.map((target) => (
                  <Link
                    key={`${target.kind}-${target.name}`}
                    href={target.href}
                    className="rounded border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <span className="font-medium">{target.name}</span>
                    <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {missionTargetKindLabel(target.kind)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <MissionRewards cards={mission.cards} />

          <section>
            <h2 className="text-xl font-semibold mb-3">Source Cards</h2>
            <div className="space-y-4">
              {mission.cards.map((card, index) => (
                <SourceCardDetails
                  key={`${card.faceURL}-${card.row}-${card.col}-${index}`}
                  card={card}
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-8 self-start">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
            {mission.cards.map((card, index) => (
              <SpriteCell
                key={`${card.faceURL}-${card.row}-${card.col}-${index}`}
                card={card}
                className="w-full border border-zinc-200 dark:border-zinc-800 overflow-hidden"
              />
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}

function MissionRewards({ cards }: { cards: TTSMissionCard[] }) {
  const entries = uniqueRewardEntries(cards);
  if (entries.length === 0) return null;
  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">Rewards</h2>
      <div className="space-y-4">
        {entries.map(({ rewards, label }) => (
          <div
            key={label}
            className="rounded border border-zinc-200 dark:border-zinc-800 p-4"
          >
            {entries.length > 1 && (
              <h3 className="text-sm font-medium mb-3">{label}</h3>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RewardBlock title="Complete" rewards={rewards} />
              {rewards.steal && (
                <RewardBlock title="Steal" rewards={rewards.steal} />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function uniqueRewardEntries(cards: TTSMissionCard[]): {
  label: string;
  rewards: TTSMissionRewards;
}[] {
  const seen = new Set<string>();
  return cards.flatMap((card, index) => {
    if (!card.rewards) return [];
    const key = JSON.stringify(card.rewards);
    if (seen.has(key)) return [];
    seen.add(key);
    return [
      {
        label: `Card ${index + 1}`,
        rewards: card.rewards,
      },
    ];
  });
}

function RewardBlock({
  title,
  rewards,
}: {
  title: string;
  rewards: TTSMissionRewards | NonNullable<TTSMissionRewards["steal"]>;
}) {
  const rows = rewardRows(rewards);
  if (rows.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
        {rows.map((row) => (
          <div key={`${row.group}-${row.label}`} className="contents">
            <dt className="text-zinc-500 dark:text-zinc-400">{row.group}</dt>
            <dd className="text-zinc-700 dark:text-zinc-300">{row.label}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function rewardRows(
  rewards: TTSMissionRewards | NonNullable<TTSMissionRewards["steal"]>,
): { group: string; label: string }[] {
  return [
    ...("attributes" in rewards
      ? rewardValueRows("Attribute", rewards.attributes, {
          charisma: "Charisma",
          wisdom: "Wisdom",
          intellect: "Intellect",
        })
      : []),
    ...rewardValueRows("Draw", rewards.drawCards, {
      deep: "Deep card",
      treasure: "Treasure card",
      item: "Item card",
      spell: "Spell card",
    }),
    ...rewardValueRows("Points", rewards.points, {
      fame: "Fame",
      gold: "Gold",
    }),
    ...(rewards.outlaw
      ? [{ group: "Token", label: countLabel(rewards.outlaw, "Outlaw token") }]
      : []),
  ];
}

function rewardValueRows<T extends string>(
  group: string,
  values: Partial<Record<T, number>> | undefined,
  labels: Record<T, string>,
): { group: string; label: string }[] {
  if (!values) return [];
  return (Object.entries(labels) as [T, string][]).flatMap(([key, label]) => {
    const count = values[key];
    return count ? [{ group, label: countLabel(count, label) }] : [];
  });
}

function countLabel(count: number, label: string): string {
  if (count === 1) return `+1 ${label}`;
  if (label === "Fame" || label === "Gold") return `+${count} ${label}`;
  return `+${count} ${label}${label.endsWith("s") ? "" : "s"}`;
}

function SourceCardDetails({ card }: { card: TTSMissionCard }) {
  const tags = card.tags?.filter((tag) => tag !== "Mission") ?? [];
  return (
    <div className="rounded border border-zinc-200 dark:border-zinc-800 p-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-[8rem_8rem_minmax(0,1fr)]">
        <SpriteCell card={card} className="w-full overflow-hidden" />
        {card.uniqueBack ? (
          <SpriteCell card={card} useBack className="w-full overflow-hidden" />
        ) : (
          // Shared back: just an <img>, no cropping needed.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.backURL}
            alt="Mission card back"
            className="w-full aspect-[5/7] object-cover rounded bg-zinc-100"
          />
        )}
        <dl className="col-span-2 sm:col-span-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
          <dt className="text-zinc-500 dark:text-zinc-400">Source</dt>
          <dd>{card.source}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">Sheet</dt>
          <dd className="truncate">{sheetName(card.faceURL)}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">Cell</dt>
          <dd>
            row {card.row}, col {card.col}
          </dd>
          {card.terrainPack && (
            <>
              <dt className="text-zinc-500 dark:text-zinc-400">Terrain</dt>
              <dd>{terrainPackLabel(card.terrainPack)}</dd>
            </>
          )}
          {tags.length > 0 && (
            <>
              <dt className="text-zinc-500 dark:text-zinc-400">Tags</dt>
              <dd>{tags.join(", ")}</dd>
            </>
          )}
        </dl>
      </div>
    </div>
  );
}

function sheetName(url: string): string {
  return url.split("/").at(-1) ?? url;
}

function terrainPackLabel(pack: MissionTerrainPack): string {
  switch (pack) {
    case "neutral":
      return "Neutral";
    case "plains":
      return "Plains";
    case "woods":
      return "Woods";
    case "mountains":
      return "Mountains";
    case "caves":
      return "Caves";
    case "swamps":
      return "Swamps";
    case "riverlands":
      return "Riverlands";
    case "deserts":
      return "Deserts";
    case "oasis":
      return "Oasis";
  }
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
