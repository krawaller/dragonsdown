import Link from "next/link";
import { SpriteCell } from "@/components/CardSprite";
import type { MissionEntry } from "@/lib/tts/lookup";

export function MissionCardLinks({ missions }: { missions: MissionEntry[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {missions.flatMap((mission) =>
        mission.cards.map((card, index) => (
          <Link
            key={`${mission.slug}-${card.faceURL}-${card.row}-${card.col}-${index}`}
            href={`/missions/${mission.slug}`}
            aria-label={mission.name}
            className="group block overflow-hidden rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 hover:ring-2 hover:ring-zinc-400 transition"
          >
            <SpriteCell
              card={card}
              className="w-full rounded-none transition-transform group-hover:scale-[1.02]"
            />
          </Link>
        )),
      )}
    </div>
  );
}
