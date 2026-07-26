import Link from "next/link";
import type { CSSProperties } from "react";
import { SpriteCell } from "@/components/CardSprite";
import { CollapsibleBox } from "@/components/CollapsibleBox";
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
    <CollapsibleBox
      title={<EquipmentDeckTitle group={group} />}
      count={group.entries.length}
      countLabel={`${group.entries.length} names · ${group.cards} card${
        group.cards === 1 ? "" : "s"
      } · ${group.copies} physical cop${group.copies === 1 ? "y" : "ies"}`}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-5">
        {group.entries.map((entry) => (
          <EquipmentTile
            key={`${entry.deck}-${entry.slug}`}
            entry={entry}
            legendaryLocationSlugs={legendaryLocationSlugs}
          />
        ))}
      </div>
    </CollapsibleBox>
  );
}

function EquipmentDeckTitle({ group }: { group: EquipmentDeckGroup }) {
  const card = representativeDeckCard(group);

  return (
    <span className="inline-flex items-center gap-3 align-middle">
      {card && <DeckBackIcon card={card} />}
      <span>{group.title}</span>
    </span>
  );
}

function DeckBackIcon({ card }: { card: EquipmentDeckEntry["cards"][number] }) {
  const numWidth = card.uniqueBack ? card.numWidth : 1;
  const numHeight = card.uniqueBack ? card.numHeight : 1;
  const row = card.uniqueBack ? card.row : 0;
  const col = card.uniqueBack ? card.col : 0;
  const style: CSSProperties = {
    backgroundImage: `url(${card.backURL})`,
    backgroundSize: `${numWidth * 100}% ${numHeight * 100}%`,
    backgroundPosition: `${(col / Math.max(numWidth - 1, 1)) * 100}% ${
      (row / Math.max(numHeight - 1, 1)) * 100
    }%`,
    backgroundRepeat: "no-repeat",
  };

  return (
    <span
      aria-hidden="true"
      className="block w-7 shrink-0 rounded border border-zinc-200 bg-zinc-100 bg-cover shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      style={{ ...style, aspectRatio: "5 / 7" }}
    />
  );
}

function representativeDeckCard(
  group: EquipmentDeckGroup,
): EquipmentDeckEntry["cards"][number] | undefined {
  return group.entries.find((entry) => entry.cards.length > 0)?.cards[0];
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
