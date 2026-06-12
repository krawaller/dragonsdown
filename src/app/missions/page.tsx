import Link from "next/link";
import type { MissionKind } from "@/lib/tts";
import { getAllMissions } from "@/lib/tts/lookup";
import { MissionCardLinks } from "@/components/MissionCardLinks";
import { missionKindLabel } from "@/components/MissionKindBadge";

const MISSION_KINDS: MissionKind[] = ["expedition", "quest", "atrocity"];

export default async function MissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string | string[] }>;
}) {
  const selectedKind = missionKindFromSearchParam((await searchParams).kind);
  const allEntries = getAllMissions();
  const entries = selectedKind
    ? allEntries.filter((entry) => entry.kinds.includes(selectedKind))
    : allEntries;
  const total = entries.reduce((n, entry) => n + entry.cards.length, 0);
  const kindCounts = missionKindCounts(allEntries);
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Missions</h1>
      <p className="text-sm text-zinc-500 mb-8">
        {total} mission card{total === 1 ? "" : "s"} in the TTS mod
      </p>
      <nav aria-label="Mission kind" className="mb-8 flex flex-wrap gap-2">
        <FilterLink
          href="/missions"
          active={!selectedKind}
          label="All"
          count={allEntries.reduce((n, entry) => n + entry.cards.length, 0)}
        />
        {MISSION_KINDS.map((kind) => (
          <FilterLink
            key={kind}
            href={`/missions?kind=${kind}`}
            active={selectedKind === kind}
            label={missionKindLabel(kind)}
            count={kindCounts[kind]}
          />
        ))}
      </nav>
      <MissionCardLinks missions={entries} />
    </main>
  );
}

function FilterLink({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded border px-3 py-2 text-sm transition-colors ${
        active
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
          : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
      }`}
    >
      <span className="font-medium">{label}</span>
      <span className="ml-2 text-xs opacity-70">{count}</span>
    </Link>
  );
}

function missionKindFromSearchParam(
  value: string | string[] | undefined,
): MissionKind | undefined {
  const kind = Array.isArray(value) ? value[0] : value;
  return MISSION_KINDS.find((candidate) => candidate === kind);
}

function missionKindCounts(
  entries: ReturnType<typeof getAllMissions>,
): Record<MissionKind, number> {
  return MISSION_KINDS.reduce(
    (counts, kind) => ({
      ...counts,
      [kind]: entries.reduce(
        (total, entry) =>
          total + entry.cards.filter((card) => card.kind === kind).length,
        0,
      ),
    }),
    { expedition: 0, quest: 0, atrocity: 0 },
  );
}
