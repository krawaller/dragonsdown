import Link from "next/link";
import { SpriteCell } from "@/components/CardSprite";
import { getAllLineages } from "@/lib/tts/lookup";

export default function LineagesPage() {
  const entries = getAllLineages();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Lineages</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {entries.length} lineages from the TTS mod
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {entries.map((entry) => {
          const lineage = entry.lineages[0];
          const card = lineage?.cards[0];
          return (
            <section key={entry.slug} className="flex flex-col gap-2">
              <Link
                href={`/lineages/${entry.slug}`}
                className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900 hover:ring-2 hover:ring-zinc-400 transition"
                aria-label={`View ${entry.name}`}
              >
                {card ? (
                  <SpriteCell card={card} className="w-full" />
                ) : (
                  <span className="block w-full aspect-[5/7]" />
                )}
              </Link>
              <div>
                <h2 className="text-base font-semibold">
                  <Link
                    href={`/lineages/${entry.slug}`}
                    className="hover:underline"
                  >
                    {entry.name}
                  </Link>
                </h2>
                {lineage && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {lineage.advantageTitle}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
