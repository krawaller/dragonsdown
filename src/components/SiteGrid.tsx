import Link from "next/link";
import type { SiteEntry } from "@/lib/tts/lookup";

export function SiteGrid({
  entries,
  className,
}: {
  entries: SiteEntry[];
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 ${className ?? ""}`}
    >
      {entries.map(({ name, slug, site }) => (
        <section
          key={`${name}-${site.imageSecondaryURL}`}
          className="flex flex-col gap-1"
        >
          <Link
            href={`/sites/${slug}`}
            className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:ring-2 hover:ring-zinc-400 transition"
            aria-label={`View ${name}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={site.imageSecondaryURL}
              alt={name}
              className="w-full aspect-square object-cover block bg-zinc-100 dark:bg-zinc-900"
            />
          </Link>
          <h2 className="text-base font-semibold mt-1">
            <Link href={`/sites/${slug}`} className="hover:underline">
              {name}
            </Link>
          </h2>
          {site.ancestry.length > 0 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {site.ancestry.join(" / ")}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
