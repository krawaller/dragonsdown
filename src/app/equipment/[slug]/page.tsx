import Link from "next/link";
import { notFound } from "next/navigation";
import { SpriteCell } from "@/components/CardSprite";
import { RulebookLinks } from "@/components/RulebookLinks";
import { resolveEquipmentRulebookLinks } from "@/lib/rulebook-links";
import type { TTSItemCard, TTSTreasureCard } from "@/lib/tts";
import { slugify } from "@/lib/slug";
import {
  getAllEquipment,
  getEquipmentBySlug,
  getLegendaryLocationsForEquipment,
  type EquipmentDeck,
  type EquipmentEntry,
} from "@/lib/tts/lookup";

type TreasureCardLink = NonNullable<TTSTreasureCard["cardLinks"]>[number];

export function generateStaticParams() {
  return getAllEquipment().map((entry) => ({ slug: entry.slug }));
}

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getEquipmentBySlug(slug);
  if (!entry) notFound();
  const sourceCards = equipmentSourceCards(entry);
  const legendaryLocations = getLegendaryLocationsForEquipment(entry.name);
  const rulebookLinks = await resolveEquipmentRulebookLinks({
    name: entry.name,
    hasTreasure: entry.treasures.length > 0,
    hasItem: entry.item !== undefined,
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/equipment" className="hover:underline">
          Equipment
        </Link>
      </div>

      <div className="mt-4 mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-3">{entry.name}</h1>
          <div className="flex flex-wrap gap-2">
            {entry.decks.map((deck) => (
              <span
                key={deck}
                className="rounded border border-zinc-200 dark:border-zinc-800 px-2 py-1 text-xs uppercase text-zinc-500 dark:text-zinc-400"
              >
                {equipmentDeckLabel(deck)}
              </span>
            ))}
          </div>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {entry.copies} physical cop{entry.copies === 1 ? "y" : "ies"} ·{" "}
          {sourceCards.length} source card{sourceCards.length === 1 ? "" : "s"}
        </p>
      </div>

      {legendaryLocations.length > 0 && (
        <section className="mb-8 rounded border border-zinc-200 dark:border-zinc-800 p-4">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
            Legendary Location{legendaryLocations.length === 1 ? "" : "s"}
          </h2>
          <div className="flex flex-wrap gap-2">
            {legendaryLocations.map((location) => (
              <Link
                key={location.slug}
                href={`/legendary-locations/${location.slug}`}
                className="rounded border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                {location.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-10">
        <div className="space-y-10">
          {entry.item && <ItemDetails entry={entry.item} />}
          {entry.treasures.length > 0 && (
            <TreasureDetails cards={entry.treasures} />
          )}

          <RulebookLinks links={rulebookLinks} heading="Rulebook" />

          <section>
            <h2 className="text-xl font-semibold mb-3">Source Cards</h2>
            <div className="space-y-4">
              {sourceCards.map(({ deck, card }, index) => (
                <SourceCardDetails
                  key={`${deck}-${card.faceURL}-${card.row}-${card.col}-${index}`}
                  deck={deck}
                  card={card}
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-8 self-start">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
            {sourceCards.map(({ deck, card }, index) => (
              <SpriteCell
                key={`${deck}-${card.faceURL}-${card.row}-${card.col}-${index}`}
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

function ItemDetails({
  entry,
}: {
  entry: NonNullable<EquipmentEntry["item"]>;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">Item Deck</h2>
      <div className="rounded border border-zinc-200 dark:border-zinc-800 p-4 space-y-5">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
          <dt className="text-zinc-500 dark:text-zinc-400">Copies</dt>
          <dd>{entry.copies}</dd>
          {entry.boxes.map((box) => (
            <div key={box.name} className="contents">
              <dt className="text-zinc-500 dark:text-zinc-400">{box.name}</dt>
              <dd>{box.count}</dd>
            </div>
          ))}
        </dl>
        {entry.startingClasses.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Starting Gear</h3>
            <div className="flex flex-wrap gap-2">
              {entry.startingClasses.map((startingClass) => (
                <Link
                  key={startingClass.slug}
                  href={`/classes/${startingClass.slug}`}
                  className="rounded border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <span className="font-medium">{startingClass.name}</span>
                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {startingSideSummary(startingClass.sides)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TreasureDetails({ cards }: { cards: TTSTreasureCard[] }) {
  const groups = groupTreasuresByDeck(cards);
  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">Treasure Decks</h2>
      <div className="space-y-4">
        {groups.map(({ deck, cards: deckCards }) => (
          <div
            key={deck}
            className="rounded border border-zinc-200 dark:border-zinc-800 p-4"
          >
            <h3 className="font-semibold mb-3">{equipmentDeckLabel(deck)}</h3>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <dt className="text-zinc-500 dark:text-zinc-400">Copies</dt>
              <dd>{deckCards.reduce((sum, card) => sum + card.copies, 0)}</dd>
              <dt className="text-zinc-500 dark:text-zinc-400">Cards</dt>
              <dd>{deckCards.length}</dd>
              <TreasureListRow
                label="Terrain Pack"
                values={uniqueStrings(
                  deckCards.flatMap((card) =>
                    card.terrainPack ? [card.terrainPack] : [],
                  ),
                )}
              />
              <TreasureLinksRow
                links={uniqueCardLinks(
                  deckCards.flatMap((card) => card.cardLinks ?? []),
                )}
              />
              <TreasureListRow
                label="Enchantments"
                values={uniqueStrings(
                  deckCards.flatMap((card) =>
                    (card.enchantments ?? []).map(
                      (entry) => `${entry.count} ${entry.color}`,
                    ),
                  ),
                )}
              />
              {deckCards.some((card) => card.cubePlacements?.length) && (
                <div className="contents">
                  <dt className="text-zinc-500 dark:text-zinc-400">
                    Cube Anchors
                  </dt>
                  <dd>
                    {deckCards.reduce(
                      (sum, card) => sum + (card.cubePlacements?.length ?? 0),
                      0,
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

function TreasureListRow({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  if (values.length === 0) return null;
  return (
    <div className="contents">
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd>{values.join(", ")}</dd>
    </div>
  );
}

function TreasureLinksRow({ links }: { links: TreasureCardLink[] }) {
  if (links.length === 0) return null;
  return (
    <div className="contents">
      <dt className="text-zinc-500 dark:text-zinc-400">Card Links</dt>
      <dd className="space-y-1">
        {links.map((link) =>
          link.type === "spell" ? (
            <Link
              key={cardLinkKey(link)}
              href={`/spells/${slugify(link.name)}`}
              className="block hover:underline"
            >
              {cardLinkLabel(link)}
            </Link>
          ) : (
            <span key={cardLinkKey(link)} className="block">
              {cardLinkLabel(link)}
            </span>
          ),
        )}
      </dd>
    </div>
  );
}

function SourceCardDetails({
  deck,
  card,
}: {
  deck: EquipmentDeck;
  card: TTSItemCard | TTSTreasureCard;
}) {
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
            alt={`${equipmentDeckLabel(deck)} card back`}
            className="w-full aspect-[5/7] object-cover rounded bg-zinc-100 dark:bg-zinc-900"
          />
        )}
        <dl className="col-span-2 sm:col-span-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
          <dt className="text-zinc-500 dark:text-zinc-400">Deck</dt>
          <dd>{equipmentDeckLabel(deck)}</dd>
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
          {isTreasureCard(card) && card.cardLinks?.length ? (
            <div className="contents">
              <dt className="text-zinc-500 dark:text-zinc-400">Links</dt>
              <dd className="space-y-1">
                {card.cardLinks.map((link) =>
                  link.type === "spell" ? (
                    <Link
                      key={`${link.type}-${link.name}`}
                      href={`/spells/${slugify(link.name)}`}
                      className="block hover:underline"
                    >
                      {cardLinkLabel(link)}
                    </Link>
                  ) : (
                    <span key={`${link.type}-${link.count}`} className="block">
                      {cardLinkLabel(link)}
                    </span>
                  ),
                )}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}

function equipmentSourceCards(entry: EquipmentEntry): {
  deck: EquipmentDeck;
  card: TTSItemCard | TTSTreasureCard;
}[] {
  return [
    ...(entry.item?.cards.map((card) => ({ deck: "item" as const, card })) ??
      []),
    ...entry.treasures.map((card) => ({ deck: card.deck, card })),
  ];
}

function groupTreasuresByDeck(cards: TTSTreasureCard[]): {
  deck: EquipmentDeck;
  cards: TTSTreasureCard[];
}[] {
  return (["treasure", "deep-treasure", "legendary"] as const).flatMap(
    (deck) => {
      const deckCards = cards.filter((card) => card.deck === deck);
      return deckCards.length > 0 ? [{ deck, cards: deckCards }] : [];
    },
  );
}

function isTreasureCard(
  card: TTSItemCard | TTSTreasureCard,
): card is TTSTreasureCard {
  return "deck" in card;
}

function equipmentDeckLabel(deck: EquipmentDeck): string {
  switch (deck) {
    case "item":
      return "Item";
    case "treasure":
      return "Treasure";
    case "deep-treasure":
      return "Deep Treasure";
    case "legendary":
      return "Legendary Treasure";
  }
}

function startingSideSummary(
  sides: { side: "front" | "back"; slot: string }[],
): string {
  return sides
    .map(
      (entry) =>
        `${entry.side}: ${entry.slot.replace(/^(slot)(\d+)$/i, "$1 $2")}`,
    )
    .join(", ");
}

function locationSummary(card: TTSItemCard | TTSTreasureCard): string {
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

function cardLinkLabel(link: TreasureCardLink): string {
  if (link.type === "spell-card") {
    return `Draws ${link.count} spell card${link.count === 1 ? "" : "s"}`;
  }
  return `Casts ${link.name}`;
}

function cardLinkKey(link: TreasureCardLink): string {
  return link.type === "spell-card"
    ? `${link.type}-${link.count}`
    : `${link.type}-${link.relationship}-${link.name}`;
}

function uniqueCardLinks(links: TreasureCardLink[]): TreasureCardLink[] {
  const seen = new Set<string>();
  return links
    .filter((link) => {
      const key = cardLinkKey(link);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => cardLinkLabel(a).localeCompare(cardLinkLabel(b)));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}
