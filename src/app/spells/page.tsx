import Link from "next/link";
import { SpriteCell } from "@/components/CardSprite";
import type { TTSSpell, TTSSpellCard } from "@/lib/tts";
import { getAllSpells } from "@/lib/tts/lookup";

export default function SpellsPage() {
  const entries = getAllSpells();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Spells</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {entries.length} spells from the TTS mod
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {entries.map((entry) => {
          const spell = entry.spells[0];
          const card = spell?.spellCards[0] ?? spell?.cards[0];
          return (
            <section key={entry.slug} className="flex flex-col gap-2">
              <Link
                href={`/spells/${entry.slug}`}
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
                    href={`/spells/${entry.slug}`}
                    className="hover:underline"
                  >
                    {entry.name}
                  </Link>
                </h2>
                {spell && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {magicSummary(spell.magic)}
                    {` · ${copySummary(spell)}`}
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

function magicSummary(magic: string[]): string {
  if (magic.length === 0) return "Unclassified";
  return magic.map(capitalize).join(", ");
}

function copySummary(spell: TTSSpell): string {
  return [
    copyCountLabel("Spells", spellCopies(spell.spellCards)),
    copyCountLabel("Hero Starting", spellCopies(spell.startingSpellCards)),
  ].join(" · ");
}

function spellCopies(cards: TTSSpellCard[]): number {
  return cards.reduce((total, card) => total + card.copies, 0);
}

function copyCountLabel(label: string, copies: number): string {
  return `${label} ${copies} cop${copies === 1 ? "y" : "ies"}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
