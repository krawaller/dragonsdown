import Link from "next/link";
import { SpriteCell } from "@/components/CardSprite";
import { getAllItems } from "@/lib/tts/lookup";

export default function ItemsPage() {
  const entries = getAllItems();
  const totalCopies = entries.reduce((n, entry) => n + entry.copies, 0);
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Items</h1>
      <p className="text-sm text-zinc-500 mb-8">
        {entries.length} item cards · {totalCopies} physical copies in the TTS
        mod
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {entries.map((entry) => {
          const card = entry.cards[0];
          return (
            <section key={entry.slug} className="flex flex-col gap-2">
              <Link
                href={`/items/${entry.slug}`}
                className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900 hover:ring-2 hover:ring-zinc-400 transition"
                aria-label={`View ${entry.name}`}
              >
                {card ? <SpriteCell card={card} className="w-full" /> : null}
              </Link>
              <div>
                <h2 className="text-base font-semibold">
                  <Link
                    href={`/items/${entry.slug}`}
                    className="hover:underline"
                  >
                    {entry.name}
                  </Link>
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {entry.copies} cop{entry.copies === 1 ? "y" : "ies"}
                  {entry.boxes.length > 0
                    ? ` · ${boxSummary(entry.boxes)}`
                    : ""}
                </p>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function boxSummary(boxes: { name: string; count: number }[]): string {
  return boxes.map((box) => `${box.name} ${box.count}`).join(", ");
}
