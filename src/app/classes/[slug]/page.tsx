import Link from "next/link";
import { notFound } from "next/navigation";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { SpriteCell } from "@/components/CardSprite";
import { ClassAdvantageCard } from "@/components/ClassAdvantageCard";
import { classAbilityName } from "@/components/ClassLink";
import { RulebookLinks } from "@/components/RulebookLinks";
import { getManualClassChips } from "@/lib/class-chips";
import { resolveClassRulebookLinks } from "@/lib/rulebook-links";
import type { TTSCardImage, TTSClassTile } from "@/lib/tts";
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
  const classChips = [
    ...(ttsClass.classToken ? [ttsClass.classToken] : []),
    ...getManualClassChips(entry.slug),
  ];
  const hasSidebarTile =
    !ttsClass.advantageCard && Boolean(ttsClass.classToken);

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
        {classAbilityName(entry.name, ttsClass.advantageTitle)}
      </p>

      <div
        className={
          hasSidebarTile
            ? "grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
            : "space-y-6"
        }
      >
        <div className="space-y-6">
          <RulebookLinks links={rulebookLinks} heading={null} />

          {ttsClass.advantageCard && (
            <ClassCardImagesBox
              name={ttsClass.advantageTitle}
              card={ttsClass.advantageCard}
            />
          )}

          {ttsClass.advantageCard && (
            <ClassAdvantageCard setup={ttsClass.setup} />
          )}

          {classChips.length > 0 && (
            <ClassTileMaterialList
              title="Chips"
              tiles={classChips}
              unit="chip"
            />
          )}

          {ttsClass.targetingTokens.length > 0 && (
            <ClassTileMaterialList
              title="Targeting Tokens"
              tiles={ttsClass.targetingTokens}
              unit="token"
            />
          )}
        </div>

        {hasSidebarTile && ttsClass.classToken && (
          <aside className="lg:sticky lg:top-8 self-start">
            <TileImage
              src={ttsClass.classToken.imageURL}
              alt={`${entry.name} class token`}
              className="w-full"
            />
          </aside>
        )}
      </div>
    </main>
  );
}

function ClassCardImagesBox({
  name,
  card,
}: {
  name: string;
  card: TTSCardImage;
}) {
  return (
    <CollapsibleBox
      title="Class Card Images"
      count={2}
      countLabel="front and back"
      contentClassName="border-t border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
        <ClassCardImageFigure card={card} name={name} side="front" />
        <ClassCardImageFigure card={card} name={name} side="back" />
      </div>
    </CollapsibleBox>
  );
}

function ClassCardImageFigure({
  card,
  name,
  side,
}: {
  card: TTSCardImage;
  name: string;
  side: "front" | "back";
}) {
  return (
    <figure>
      <SpriteCell
        card={card}
        useBack={side === "back"}
        className="w-full border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm"
      />
      <figcaption className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {name} {side}
      </figcaption>
    </figure>
  );
}

function ClassTileMaterialList({
  title,
  tiles,
  unit,
}: {
  title: string;
  tiles: TTSClassTile[];
  unit: "chip" | "token";
}) {
  return (
    <CollapsibleBox
      title={title}
      count={tiles.length}
      countLabel={`${tiles.length} ${unit}${tiles.length === 1 ? "" : "s"}`}
      contentClassName="border-t border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {tiles.map((tile, index) => (
          <ClassTilePair
            key={`${tile.imageURL}-${tile.imageSecondaryURL}-${index}`}
            tile={tile}
            showName={unit === "chip" && tiles.length > 1}
          />
        ))}
      </div>
    </CollapsibleBox>
  );
}

function ClassTilePair({
  tile,
  showName = false,
}: {
  tile: TTSClassTile;
  showName?: boolean;
}) {
  return (
    <div>
      {showName && <h3 className="mb-2 text-sm font-semibold">{tile.name}</h3>}
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
