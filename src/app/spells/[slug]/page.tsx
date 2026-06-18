import Link from "next/link";
import { notFound } from "next/navigation";
import { SpriteCell } from "@/components/CardSprite";
import { RulebookLinks } from "@/components/RulebookLinks";
import { getMagicTypeById, magicLabel } from "@/lib/magic";
import { resolveSpellRulebookLinks } from "@/lib/rulebook-links";
import type { TTSSpellCard, TTSSpellDeck } from "@/lib/tts";
import {
  getAllSpells,
  getSpellBySlug,
  getSpellCastersForSpell,
  type SpellCasterEntry,
} from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllSpells().map((entry) => ({ slug: entry.slug }));
}

export default async function SpellPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getSpellBySlug(slug);
  if (!entry) notFound();
  const spell = entry.spells[0];
  if (!spell) notFound();
  const rulebookLinks = await resolveSpellRulebookLinks(entry.name);
  const casters = getSpellCastersForSpell(entry.name);
  const heroCard = spell.startingSpellCards[0];
  const spellCard = spell.spellCards[0] ?? spell.cards[0];
  const primaryMagic = spell.magic[0];
  const magicType = primaryMagic ? getMagicTypeById(primaryMagic) : undefined;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/magic" className="hover:underline">
          Magic
        </Link>
        {magicType && (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/magic/${magicType.slug}`} className="hover:underline">
              {magicType.label}
            </Link>
          </>
        )}
      </div>

      <h1 className="text-4xl font-bold mt-4 mb-2">{entry.name}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {magicSummary(spell.magic)}
        {spell.rulebookSource ? ` · ${spell.rulebookSource}` : ""}
        {spell.decks.length > 0 ? ` · ${deckSummary(spell.decks)}` : ""}
        {` · ${copyCountLabel("Spells", spellCopies(spell.spellCards))}`}
        {` · ${copyCountLabel(
          "Hero Starting Spells",
          spellCopies(spell.startingSpellCards),
        )}`}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-10">
        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-semibold mb-4">Spell Cards</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <SpellCardSet
                title="Spells"
                cards={spell.spellCards}
                copies={spellCopies(spell.spellCards)}
                emptyLabel="No Spells-backed card found"
              />
              <SpellCardSet
                title="Hero Starting Spells"
                cards={spell.startingSpellCards}
                copies={spellCopies(spell.startingSpellCards)}
                emptyLabel="No Hero Starting Spells-backed card found"
              />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Details</h2>
            <dl className="max-w-xl rounded border border-zinc-200 dark:border-zinc-800 p-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <dt className="text-zinc-500 dark:text-zinc-400">Magic</dt>
              <dd>{magicSummary(spell.magic)}</dd>
              <dt className="text-zinc-500 dark:text-zinc-400">Decks</dt>
              <dd>{deckSummary(spell.decks)}</dd>
              <dt className="text-zinc-500 dark:text-zinc-400">
                Spells Copies
              </dt>
              <dd>{spellCopies(spell.spellCards)}</dd>
              <dt className="text-zinc-500 dark:text-zinc-400">
                Hero Starting Copies
              </dt>
              <dd>{spellCopies(spell.startingSpellCards)}</dd>
              <dt className="text-zinc-500 dark:text-zinc-400">Source</dt>
              <dd>{spell.source}</dd>
              {spell.rulebookSource && (
                <>
                  <dt className="text-zinc-500 dark:text-zinc-400">
                    Rulebook Source
                  </dt>
                  <dd>{spell.rulebookSource}</dd>
                </>
              )}
            </dl>
          </section>

          <RulebookLinks links={rulebookLinks} heading="Rulebook" />

          {casters.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-3">Cast By</h2>
              <div className="flex flex-wrap gap-2">
                {casters.map((caster) => (
                  <Link
                    key={caster.monsterName}
                    href={`/monster-groups/${caster.monsterSlug}`}
                    className="rounded border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <span className="font-medium">{caster.monsterName}</span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                      {caster.sides.join(" & ")}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-8 self-start">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
            {spellCard ? (
              <SpriteCell
                card={spellCard}
                className="w-full border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm"
              />
            ) : null}
            {heroCard ? (
              <CardBackImage
                card={heroCard}
                alt={`${entry.name} starting spell back`}
              />
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}

function SpellCardSet({
  title,
  cards,
  copies,
  emptyLabel,
}: {
  title: string;
  cards: TTSSpellCard[];
  copies: number;
  emptyLabel: string;
}) {
  return (
    <div className="rounded border border-zinc-200 dark:border-zinc-800 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {copyCountLabel("", copies).trim()}
        </p>
      </div>
      {cards.length > 0 ? (
        <div className="grid gap-4">
          {cards.map((card, index) => (
            <div
              key={`${card.faceURL}-${card.backURL}-${card.row}-${card.col}-${index}`}
              className="grid grid-cols-2 gap-4"
            >
              <figure>
                <SpriteCell card={card} className="w-full" />
                <figcaption className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Front
                </figcaption>
              </figure>
              <figure>
                <CardBackImage card={card} alt={`${title} card back`} />
                <figcaption className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Back
                </figcaption>
              </figure>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyLabel}</p>
      )}
    </div>
  );
}

function CardBackImage({ card, alt }: { card: TTSSpellCard; alt: string }) {
  if (card.uniqueBack) {
    return <SpriteCell card={card} useBack className="w-full" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={card.backURL}
      alt={alt}
      className="w-full aspect-[5/7] object-cover rounded bg-zinc-100 border border-zinc-200 dark:border-zinc-800"
    />
  );
}

function magicSummary(magic: string[]): string {
  if (magic.length === 0) return "Unclassified";
  return magic.map(magicLabel).join(", ");
}

function deckSummary(decks: TTSSpellDeck[]): string {
  if (decks.length === 0) return "None";
  return decks.map(deckLabel).join(", ");
}

function deckLabel(deck: TTSSpellDeck): string {
  switch (deck) {
    case "spells":
      return "Spells";
    case "heroStartingSpells":
      return "Hero Starting Spells";
  }
}

function spellCopies(cards: TTSSpellCard[]): number {
  return cards.reduce((total, card) => total + card.copies, 0);
}

function copyCountLabel(label: string, copies: number): string {
  const prefix = label ? `${label} ` : "";
  return `${prefix}${copies} cop${copies === 1 ? "y" : "ies"}`;
}
