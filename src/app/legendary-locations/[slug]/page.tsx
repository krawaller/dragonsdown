import Link from "next/link";
import { notFound } from "next/navigation";
import { SpriteCell } from "@/components/CardSprite";
import { RulebookLinks } from "@/components/RulebookLinks";
import { ANY_DOC, resolveRulebookLinks } from "@/lib/rulebook-links";
import { slugify } from "@/lib/slug";
import type {
  TTSLegendaryLocation,
  TTSLegendarySiteToken,
  TTSLegendaryTreasureCard,
} from "@/lib/tts";
import {
  getAllLegendaryLocations,
  getLegendaryLocationBySlug,
  type LegendaryMonsterLink,
} from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllLegendaryLocations().map((entry) => ({ slug: entry.slug }));
}

export default async function LegendaryLocationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getLegendaryLocationBySlug(slug);
  if (!entry) notFound();
  const location = entry.locations[0];
  const rulebookLinks = await resolveRulebookLinks({
    doc: ANY_DOC,
    headings: ["Legendary Location Manifest", entry.name],
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/legendary-locations" className="hover:underline">
          Legendary Locations
        </Link>
      </div>

      <div className="mt-4 mb-10 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div>
          <h1 className="text-4xl font-bold mb-3">{entry.name}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {entry.kind === "site" ? "Permanent site" : "Temporary test"}
            {location.siteToken ? " · site token linked" : ""}
          </p>
          {entry.monsterChips.length > 0 && (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              {entry.monsterChips.length} monster chip link
              {entry.monsterChips.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <div className="space-y-6">
          <h2 className="text-sm font-semibold uppercase text-zinc-500 dark:text-zinc-400 mb-2">
            Location Card
          </h2>
          <SpriteCell
            card={location.card}
            className="w-full max-w-72 border border-zinc-200 dark:border-zinc-800 overflow-hidden lg:max-w-none"
          />
          {location.siteToken && <SiteToken token={location.siteToken} />}
          <RulebookLinks links={rulebookLinks} heading="Rulebook" />
        </div>
      </div>

      <div>
        <div className="space-y-10">
          {(location.treasureSetup || location.rewards) && (
            <section>
              <h2 className="text-xl font-semibold mb-3">Treasure</h2>
              <div className="space-y-4">
                {location.treasureSetup && (
                  <TreasureBlock
                    title="Setup"
                    deepTreasureCards={location.treasureSetup.deepTreasureCards}
                    usesContainingSiteDeepTreasures={
                      location.treasureSetup.usesContainingSiteDeepTreasures
                    }
                    treasures={location.treasureSetup.namedTreasures}
                  />
                )}
                {location.rewards && (
                  <TreasureBlock
                    title="Rewards"
                    treasures={location.rewards.namedTreasures}
                    other={location.rewards.other}
                  />
                )}
              </div>
            </section>
          )}

          {entry.monsterChips.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-3">Monsters</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {entry.monsterChips.map((chip) => (
                  <MonsterChip key={`${chip.name}-${chip.guid}`} chip={chip} />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xl font-semibold mb-3">Source</h2>
            <SourceDetails location={location} />
          </section>
        </div>
      </div>
    </main>
  );
}

function TreasureBlock({
  title,
  deepTreasureCards,
  usesContainingSiteDeepTreasures,
  treasures = [],
  other = [],
}: {
  title: string;
  deepTreasureCards?: number;
  usesContainingSiteDeepTreasures?: boolean;
  treasures?: TTSLegendaryTreasureCard[];
  other?: string[];
}) {
  return (
    <div className="rounded border border-zinc-200 dark:border-zinc-800 p-4">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2 text-sm mb-4">
        {deepTreasureCards !== undefined && (
          <span className="rounded border border-zinc-200 dark:border-zinc-800 px-2 py-1">
            {deepTreasureCards} deep treasure card
            {deepTreasureCards === 1 ? "" : "s"}
          </span>
        )}
        {usesContainingSiteDeepTreasures && (
          <span className="rounded border border-zinc-200 dark:border-zinc-800 px-2 py-1">
            Existing site deep treasures
          </span>
        )}
        {other.map((item) => (
          <span
            key={item}
            className="rounded border border-zinc-200 dark:border-zinc-800 px-2 py-1"
          >
            {item}
          </span>
        ))}
      </div>
      {treasures.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {treasures.map((treasure) => (
            <Link
              key={treasure.name}
              href={`/equipment/${slugify(treasure.name)}`}
              className="space-y-2 rounded border border-transparent p-2 -m-2 hover:border-zinc-200 hover:bg-zinc-50 dark:hover:border-zinc-800 dark:hover:bg-zinc-900 transition-colors"
            >
              {treasure.card && (
                <SpriteCell
                  card={treasure.card}
                  className="w-full border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                />
              )}
              <p className="text-sm font-medium">{treasure.name}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MonsterChip({ chip }: { chip: LegendaryMonsterLink }) {
  const body = (
    <div className="rounded border border-zinc-200 dark:border-zinc-800 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
      <div className="flex gap-4 items-center">
        {chip.imageURL && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={chip.imageURL}
            alt={chip.name}
            className="w-20 h-20 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900"
          />
        )}
        <div className="min-w-0">
          <h3 className="font-semibold">{chip.name}</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {chip.href ? "Monster group" : "Linked monster chip"}
          </p>
        </div>
      </div>
    </div>
  );
  return chip.href ? <Link href={chip.href}>{body}</Link> : body;
}

function SiteToken({ token }: { token: TTSLegendarySiteToken }) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase text-zinc-500 dark:text-zinc-400 mb-2">
        Site Token
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={token.imageURL}
          alt={token.name ?? "Legendary site token face"}
          className="w-full aspect-square object-cover rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900"
        />
        {token.imageSecondaryURL &&
          token.imageSecondaryURL !== token.imageURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={token.imageSecondaryURL}
              alt={
                token.name
                  ? `${token.name} token back`
                  : "Legendary site token back"
              }
              className="w-full aspect-square object-cover rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900"
            />
          )}
      </div>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {token.connection === "lua-token-comment"
          ? "Linked from card Lua"
          : "Linked by matching name"}
      </p>
    </div>
  );
}

function SourceDetails({ location }: { location: TTSLegendaryLocation }) {
  return (
    <dl className="max-w-xl rounded border border-zinc-200 dark:border-zinc-800 p-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
      <dt className="text-zinc-500 dark:text-zinc-400">Source</dt>
      <dd>{location.source}</dd>
      <dt className="text-zinc-500 dark:text-zinc-400">Kind</dt>
      <dd>{location.kind}</dd>
      <dt className="text-zinc-500 dark:text-zinc-400">Sheet</dt>
      <dd className="truncate">{sheetName(location.card.faceURL)}</dd>
      <dt className="text-zinc-500 dark:text-zinc-400">Cell</dt>
      <dd>
        row {location.card.row}, col {location.card.col}
      </dd>
      <dt className="text-zinc-500 dark:text-zinc-400">Card Bag</dt>
      <dd>{location.card.ancestry?.join(" / ") ?? "Loose"}</dd>
    </dl>
  );
}

function sheetName(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname.split("/").filter(Boolean).at(-1) ?? url;
  } catch {
    return url;
  }
}
