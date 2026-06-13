import Link from "next/link";
import { notFound } from "next/navigation";
import { SpriteCell } from "@/components/CardSprite";
import type { TTSItemCard } from "@/lib/tts";
import { getAllItems, getItemBySlug } from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllItems().map((entry) => ({ slug: entry.slug }));
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = getItemBySlug(slug);
  if (!item) notFound();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/items" className="hover:underline">
          Items
        </Link>
      </div>

      <div className="mt-4 mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-3">{item.name}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {item.copies} physical cop{item.copies === 1 ? "y" : "ies"} across{" "}
            {item.boxes.length} box{item.boxes.length === 1 ? "" : "es"}
          </p>
        </div>
        {item.startingClasses.length > 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Starting gear for {item.startingClasses.length} class
            {item.startingClasses.length === 1 ? "" : "es"}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-10">
        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-semibold mb-3">Copies</h2>
            <dl className="max-w-xl rounded border border-zinc-200 dark:border-zinc-800 p-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <dt className="text-zinc-500 dark:text-zinc-400">Total</dt>
              <dd>{item.copies}</dd>
              {item.boxes.map((box) => (
                <div key={box.name} className="contents">
                  <dt className="text-zinc-500 dark:text-zinc-400">
                    {box.name}
                  </dt>
                  <dd>{box.count}</dd>
                </div>
              ))}
            </dl>
          </section>

          {item.startingClasses.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-3">Starting Gear</h2>
              <div className="flex flex-wrap gap-2">
                {item.startingClasses.map((entry) => (
                  <Link
                    key={entry.slug}
                    href={`/classes/${entry.slug}`}
                    className="rounded border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <span className="font-medium">{entry.name}</span>{" "}
                    <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {startingSideSummary(entry.sides)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xl font-semibold mb-3">Source Cards</h2>
            <div className="space-y-4">
              {item.cards.map((card, index) => (
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
            {item.cards.map((card, index) => (
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

function SourceCardDetails({ card }: { card: TTSItemCard }) {
  return (
    <div className="rounded border border-zinc-200 dark:border-zinc-800 p-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-[8rem_8rem_minmax(0,1fr)]">
        <SpriteCell card={card} className="w-full overflow-hidden" />
        {card.uniqueBack ? (
          <SpriteCell card={card} useBack className="w-full overflow-hidden" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.backURL}
            alt="Item card back"
            className="w-full aspect-[5/7] object-cover rounded bg-zinc-100"
          />
        )}
        <dl className="col-span-2 sm:col-span-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
          <dt className="text-zinc-500 dark:text-zinc-400">Source</dt>
          <dd>{card.source}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">Copies</dt>
          <dd>{card.copies}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">Sheet</dt>
          <dd className="truncate">{sheetName(card.faceURL)}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">Cell</dt>
          <dd>
            row {card.row}, col {card.col}
          </dd>
          <dt className="text-zinc-500 dark:text-zinc-400">Locations</dt>
          <dd>{locationSummary(card)}</dd>
        </dl>
      </div>
    </div>
  );
}

function startingSideSummary(
  sides: { side: "front" | "back"; slot: string }[],
): string {
  return sides
    .map((entry) => `${entry.side}: ${formatSlot(entry.slot)}`)
    .join(", ");
}

function formatSlot(slot: string): string {
  return slot.replace(/^(slot)(\d+)$/i, "$1 $2");
}

function locationSummary(card: TTSItemCard): string {
  return card.locations
    .map((location) => {
      const name = location.ancestry.join(" / ") || "table";
      return `${name} ${location.count}`;
    })
    .join(", ");
}

function sheetName(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname.split("/").filter(Boolean).at(-1) ?? url;
  } catch {
    return url;
  }
}
