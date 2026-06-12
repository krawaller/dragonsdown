import Link from "next/link";
import type { MissionEntry } from "@/lib/tts/lookup";

export function MissionLinks({
  missions,
  className = "mb-8",
  headingClassName = "text-sm font-medium mb-2",
}: {
  missions: MissionEntry[];
  className?: string;
  headingClassName?: string;
}) {
  if (missions.length === 0) return null;
  return (
    <section className={className}>
      <h2 className={headingClassName}>Missions</h2>
      <div className="flex flex-wrap gap-2">
        {missions.map((mission) => (
          <Link
            key={mission.slug}
            href={`/missions#${mission.slug}`}
            className="rounded border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <span className="font-medium">{mission.name}</span>
            {mission.descriptions.length > 0 && (
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                {mission.descriptions[0]}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
