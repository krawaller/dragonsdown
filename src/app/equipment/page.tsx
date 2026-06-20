import Link from "next/link";
import { SpriteCell } from "@/components/CardSprite";
import {
  getEquipmentDeckGroups,
  getAllLegendaryLocations,
  type EquipmentDeckEntry,
  type EquipmentDeckGroup,
} from "@/lib/tts/lookup";

export default function EquipmentPage() {
  const groups = getEquipmentDeckGroups();
  const legendaryLocationSlugs = new Set(
    getAllLegendaryLocations().map((entry) => entry.slug),
  );
  const totalEntries = groups.reduce(
    (sum, group) => sum + group.entries.length,
    0,
  );
  const totalCards = groups.reduce((sum, group) => sum + group.cards, 0);

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Equipment</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {totalEntries} named entries · {totalCards} card images across item,
        treasure, deep treasure, and legendary treasure decks
      </p>

      <div className="space-y-6">
        {groups.map((group) => (
          <EquipmentDeckDetails
            key={group.deck}
            group={group}
            legendaryLocationSlugs={legendaryLocationSlugs}
          />
        ))}
      </div>
    </main>
  );
}

function EquipmentDeckDetails({
  group,
  legendaryLocationSlugs,
}: {
  group: EquipmentDeckGroup;
  legendaryLocationSlugs: ReadonlySet<string>;
}) {
  return (
    <details
      open
      className="rounded border border-zinc-200 dark:border-zinc-800"
    >
      <summary className="cursor-pointer list-none px-4 py-3 sm:px-5 sm:py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold">{group.title}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {group.entries.length} names · {group.cards} card
            {group.cards === 1 ? "" : "s"} · {group.copies} physical cop
            {group.copies === 1 ? "y" : "ies"}
          </p>
        </div>
      </summary>
      <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {group.entries.map((entry) => (
            <EquipmentTile
              key={`${entry.deck}-${entry.slug}`}
              entry={entry}
              legendaryLocationSlugs={legendaryLocationSlugs}
            />
          ))}
        </div>
      </div>
    </details>
  );
}

function EquipmentTile({
  entry,
  legendaryLocationSlugs,
}: {
  entry: EquipmentDeckEntry;
  legendaryLocationSlugs: ReadonlySet<string>;
}) {
  const card = entry.cards[0];
  const href = equipmentEntryHref(entry, legendaryLocationSlugs);
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <Link
        href={href}
        className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900 hover:ring-2 hover:ring-zinc-400 transition"
        aria-label={`View ${entry.name}`}
      >
        {card ? <SpriteCell card={card} className="w-full" /> : null}
      </Link>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold leading-5">
          <Link href={href} className="hover:underline">
            {entry.name}
          </Link>
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {entry.copies} cop{entry.copies === 1 ? "y" : "ies"}
          {entry.cards.length > 1 ? ` · ${entry.cards.length} variants` : ""}
        </p>
      </div>
    </section>
  );
}

function equipmentEntryHref(
  entry: EquipmentDeckEntry,
  legendaryLocationSlugs: ReadonlySet<string>,
): string {
  if (
    entry.deck === "deep-treasure" &&
    legendaryLocationSlugs.has(entry.slug)
  ) {
    return `/legendary-locations/${entry.slug}`;
  }
  return `/equipment/${entry.slug}`;
}
