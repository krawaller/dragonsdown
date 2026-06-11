import Link from "next/link";
import type { CivLocationEntry } from "@/lib/tts/lookup";

export function CivLocationGrid({ entries }: { entries: CivLocationEntry[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
      {entries.map(({ name, slug, location }) => (
        <section
          key={`${name}-${location.imageURL}`}
          className="flex flex-col gap-1"
        >
          <Link
            href={`/civ-locations/${slug}`}
            className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:ring-2 hover:ring-zinc-400 transition"
            aria-label={`View ${name}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={location.imageURL}
              alt={name}
              className="w-full aspect-square object-cover block bg-zinc-100 dark:bg-zinc-900"
            />
          </Link>
          <h2 className="text-base font-semibold mt-1">
            <Link href={`/civ-locations/${slug}`} className="hover:underline">
              {name}
            </Link>
          </h2>
          {location.ancestry.length > 0 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {location.ancestry.join(" / ")}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
