import Link from "next/link";
import { SpriteCell } from "@/components/CardSprite";
import { getAllWeatherCards, type WeatherCardEntry } from "@/lib/tts/lookup";

export default function WeatherCardsPage() {
  const entries = getAllWeatherCards();
  const totalCards = entries.reduce(
    (total, entry) => total + entry.cards.length,
    0,
  );
  const totalCopies = entries.reduce((total, entry) => total + entry.copies, 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Weather Cards</h1>
      <p className="text-sm text-zinc-500 mb-8">
        {totalCards} weather card variants across {entries.length} weather types
        {totalCopies !== totalCards ? ` (${totalCopies} physical copies)` : ""}
      </p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {entries.map((entry) => (
          <WeatherEntry key={entry.slug} entry={entry} />
        ))}
      </div>
    </main>
  );
}

function WeatherEntry({ entry }: { entry: WeatherCardEntry }) {
  return (
    <section className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-4 flex flex-wrap items-baseline gap-2">
        <h2 className="text-lg font-semibold">{entry.name}</h2>
        {entry.cards.length > 1 && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {entry.cards.length} variants
          </span>
        )}
      </div>
      <div className="space-y-4">
        {entry.cards.map((card, index) => (
          <article
            key={`${card.source}-${card.row}-${card.col}-${index}`}
            className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4"
          >
            <SpriteCell
              card={card}
              className="w-full rounded border border-zinc-200 shadow-sm dark:border-zinc-800"
            />
            <div className="min-w-0">
              {card.seasons?.length ? (
                <ul className="mb-2 flex flex-wrap gap-1.5">
                  {card.seasons.map((season) => (
                    <li
                      key={season}
                      className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    >
                      {season}
                    </li>
                  ))}
                </ul>
              ) : null}
              {card.description && (
                <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                  {card.description}
                </p>
              )}
              {card.copies > 1 && (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {card.copies} copies
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
