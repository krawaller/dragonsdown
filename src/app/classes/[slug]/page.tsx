import Link from "next/link";
import { notFound } from "next/navigation";
import { SpriteCell } from "@/components/CardSprite";
import { ClassAdvantageCard } from "@/components/ClassAdvantageCard";
import { RulebookLinks } from "@/components/RulebookLinks";
import { resolveClassRulebookLinks } from "@/lib/rulebook-links";
import type { TTSClassTile } from "@/lib/tts";
import { getAllClasses, getClassBySlug } from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllClasses().map((entry) => ({ slug: entry.slug }));
}

export default async function ClassPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getClassBySlug(slug);
  if (!entry) notFound();
  const ttsClass = entry.classes[0];
  if (!ttsClass) notFound();
  const rulebookLinks = await resolveClassRulebookLinks({
    slug: entry.slug,
    advantageTitle: ttsClass.advantageTitle,
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/classes" className="hover:underline">
          Classes
        </Link>
      </div>
      <h1 className="text-4xl font-bold mt-4 mb-2">{entry.name}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {ttsClass.advantageTitle}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-10">
        <div className="space-y-10">
          {ttsClass.advantageCard && (
            <ClassAdvantageCard
              name={ttsClass.advantageTitle}
              card={ttsClass.advantageCard}
              setup={ttsClass.setup}
            />
          )}

          <RulebookLinks links={rulebookLinks} heading="Rulebook" />

          {ttsClass.classToken && (
            <ClassTileMaterial title="Class Token" tile={ttsClass.classToken} />
          )}

          {ttsClass.targetingTokens.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">Targeting Tokens</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {ttsClass.targetingTokens.map((token, index) => (
                  <ClassTilePair
                    key={`${token.imageURL}-${token.imageSecondaryURL}-${index}`}
                    tile={token}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-8 self-start">
          {ttsClass.advantageCard ? (
            <SpriteCell
              card={ttsClass.advantageCard}
              className="w-full border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm"
            />
          ) : ttsClass.classToken ? (
            <TileImage
              src={ttsClass.classToken.imageURL}
              alt={`${entry.name} class token`}
              className="w-full"
            />
          ) : null}
        </aside>
      </div>
    </main>
  );
}

function ClassTileMaterial({
  title,
  tile,
}: {
  title: string;
  tile: TTSClassTile;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="max-w-3xl">
        <ClassTilePair tile={tile} />
      </div>
    </section>
  );
}

function ClassTilePair({ tile }: { tile: TTSClassTile }) {
  return (
    <div className="rounded border border-zinc-200 dark:border-zinc-800 p-4">
      <h3 className="text-base font-semibold mb-3">{tile.name}</h3>
      <div className="grid grid-cols-2 gap-4">
        <figure>
          <TileImage src={tile.imageURL} alt={`${tile.name} front`} />
          <figcaption className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Front
          </figcaption>
        </figure>
        <figure>
          <TileImage src={tile.imageSecondaryURL} alt={`${tile.name} back`} />
          <figcaption className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Back
          </figcaption>
        </figure>
      </div>
    </div>
  );
}

function TileImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`${className} block aspect-square object-cover rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900`}
    />
  );
}
