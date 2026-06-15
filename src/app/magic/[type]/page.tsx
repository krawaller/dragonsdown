import Link from "next/link";
import { notFound } from "next/navigation";
import { SpriteCell } from "@/components/CardSprite";
import { RulebookLinks } from "@/components/RulebookLinks";
import { MAGIC_TYPES, getMagicTypeBySlug } from "@/lib/magic";
import { resolveMagicRulebookLinks } from "@/lib/rulebook-links";
import type { TTSSpell, TTSSpellCard } from "@/lib/tts";
import { getSpellsByMagic } from "@/lib/tts/lookup";

export function generateStaticParams() {
  return MAGIC_TYPES.map((type) => ({ type: type.slug }));
}

export default async function MagicTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type: slug } = await params;
  const type = getMagicTypeBySlug(slug);
  if (!type) notFound();
  const entries = getSpellsByMagic(type.id);
  const rulebookLinks = await resolveMagicRulebookLinks(type.id, "core");
  const icon = rulebookLinks.find((link) => Boolean(link.icon))?.icon;

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
      </div>

      <div className="mt-4 mb-8 flex flex-wrap items-center gap-4">
        <MagicIcon icon={icon} label={type.label} />
        <div>
          <h1 className="text-4xl font-bold">{type.label}</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {entries.length} spell{entries.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <RulebookLinks
        links={rulebookLinks}
        heading="Rulebook"
        className="mb-10 max-w-3xl"
      />

      <section>
        <h2 className="text-xl font-semibold mb-4">Spells</h2>
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
                  <h3 className="text-base font-semibold">
                    <Link
                      href={`/spells/${entry.slug}`}
                      className="hover:underline"
                    >
                      {entry.name}
                    </Link>
                  </h3>
                  {spell && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {copySummary(spell)}
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
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

function MagicIcon({ icon, label }: { icon?: string; label: string }) {
  if (!icon) {
    return (
      <span
        className="block h-14 w-14 rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
        aria-hidden="true"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={icon}
      alt={`${label} icon`}
      className="block h-14 w-14 rounded border border-zinc-200 bg-zinc-100 object-contain p-1 dark:border-zinc-800 dark:bg-zinc-900"
    />
  );
}
