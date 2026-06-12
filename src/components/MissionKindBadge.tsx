import type { MissionKind } from "@/lib/tts";

export function MissionKindBadge({ kind }: { kind: MissionKind }) {
  return (
    <span
      className={`${missionKindClassName(kind)} rounded border px-2 py-1 text-xs font-medium`}
    >
      {missionKindLabel(kind)}
    </span>
  );
}

export function missionKindLabel(kind: MissionKind): string {
  switch (kind) {
    case "atrocity":
      return "Atrocity";
    case "quest":
      return "Quest";
    case "expedition":
      return "Expedition";
  }
}

export function missionKindClassName(kind: MissionKind): string {
  switch (kind) {
    case "atrocity":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300";
    case "quest":
      return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200";
    case "expedition":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
  }
}