import Link from "next/link";
import { notFound } from "next/navigation";
import { SpriteCell } from "@/components/CardSprite";
import { RulebookLinks } from "@/components/RulebookLinks";
import { resolveLineageAdvantageRulebookLinks } from "@/lib/rulebook-links";
import type { TTSClassSetupSide } from "@/lib/tts";
import { getAllLineages, getLineageBySlug } from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllLineages().map((entry) => ({ slug: entry.slug }));
}

export default async function LineagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getLineageBySlug(slug);
  if (!entry) notFound();
  const lineage = entry.lineages[0];
  if (!lineage) notFound();
  const rulebookLinks = await resolveLineageAdvantageRulebookLinks(
    lineage.advantageTitle,
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/lineages" className="hover:underline">
          Lineages
        </Link>
      </div>

      <h1 className="text-4xl font-bold mt-4 mb-2">{entry.name}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {lineage.advantageTitle}
        {lineage.box ? ` · ${lineage.box}` : ""}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-10">
        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-semibold mb-4">Lineage Cards</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {lineage.cards.map((card, index) => (
                <div
                  key={`${card.faceURL}-${card.row}-${card.col}`}
                  className="rounded border border-zinc-200 dark:border-zinc-800 p-4"
                >
                  <h3 className="text-base font-semibold mb-3">
                    Card {index + 1}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <figure>
                      <SpriteCell card={card} className="w-full" />
                      <figcaption className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                        Front
                      </figcaption>
                    </figure>
                    <figure>
                      <SpriteCell card={card} useBack className="w-full" />
                      <figcaption className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                        Back
                      </figcaption>
                    </figure>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {lineage.setup && <LineageSetup setup={lineage.setup} />}

          <RulebookLinks links={rulebookLinks} heading="Rulebook" />
        </div>

        <aside className="lg:sticky lg:top-8 self-start">
          {lineage.cards[0] ? (
            <SpriteCell
              card={lineage.cards[0]}
              className="w-full border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm"
            />
          ) : null}
        </aside>
      </div>
    </main>
  );
}

function LineageSetup({
  setup,
}: {
  setup: { front?: TTSClassSetupSide; back?: TTSClassSetupSide };
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Setup</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        {setup.front && <LineageSetupSide title="Front" side={setup.front} />}
        {setup.back && <LineageSetupSide title="Back" side={setup.back} />}
      </div>
    </section>
  );
}

function LineageSetupSide({
  title,
  side,
}: {
  title: string;
  side: TTSClassSetupSide;
}) {
  return (
    <div className="rounded border border-zinc-200 dark:border-zinc-800 p-4">
      <h3 className="text-base font-semibold mb-3">{title}</h3>
      <div className="grid gap-5 sm:grid-cols-2">
        {side.items.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Items
            </h4>
            <ul className="space-y-1 text-sm">
              {side.items.map((item, index) => (
                <li key={`${item.name}-${item.slot}-${index}`}>{item.name}</li>
              ))}
            </ul>
          </div>
        )}
        {side.cubes.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Cubes
            </h4>
            <ul className="space-y-1 text-sm">
              {side.cubes.map((cube, index) => (
                <li key={`${cube.type}-${cube.color}-${index}`}>
                  {cube.count} {cube.color} {cube.type}
                </li>
              ))}
            </ul>
          </div>
        )}
        {side.gold !== undefined && (
          <div>
            <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Gold
            </h4>
            <p className="text-sm">{side.gold}</p>
          </div>
        )}
      </div>
    </div>
  );
}
