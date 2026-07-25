import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { RulebookLinks } from "@/components/RulebookLinks";
import {
  type ClearingTypeId,
  getAllClearingTypes,
  getClearingTypeBySlug,
} from "@/lib/clearing-types";
import {
  resolveClassAdvantageRulebookLinks,
  resolveLineageAdvantageRulebookLinks,
  resolveRulebookLinks,
  type RulebookLink,
  type RulebookLinkQuery,
} from "@/lib/rulebook-links";
import {
  getAllTerrainPacks,
  getClassBySlug,
  getLineageBySlug,
  type TerrainPackEntry,
} from "@/lib/tts/lookup";
import clearingTypeRules from "../../../../data/manual/clearing-type-rules.json";

export function generateStaticParams() {
  return getAllClearingTypes().map((entry) => ({ slug: entry.slug }));
}

export default async function ClearingTypePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const clearingType = getClearingTypeBySlug(slug);
  if (!clearingType) notFound();
  const rulebookLinks = await resolveClearingTypeRulebookLinks(clearingType.id);
  const terrainPacks = terrainPacksForClearingType(clearingType.id);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/clearing-types" className="hover:underline">
          Clearing Types
        </Link>
      </div>
      <div className="mt-4 mb-2 flex items-center gap-4">
        <Image
          src={clearingType.icon}
          alt=""
          width={64}
          height={64}
          className="h-16 w-16 shrink-0 object-contain"
        />
        <h1 className="text-4xl font-bold">{clearingType.label}</h1>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {clearingType.tileCount} map{" "}
        {clearingType.tileCount === 1 ? "tile" : "tiles"}
        {" · "}
        {clearingType.clearingCount} clearing
        {clearingType.clearingCount === 1 ? "" : "s"}
      </p>

      <RulebookLinks
        links={rulebookLinks}
        heading="Rulebook"
        className="mb-10"
      />

      {terrainPacks.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Terrain Packs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {terrainPacks.map((entry) => (
              <TerrainPackClearingTypeTile
                key={entry.slug}
                entry={entry}
                clearingTypeLabel={clearingType.label}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3">Map Tiles</h2>
        <div className="flex flex-wrap gap-2">
          {clearingType.occurrences.map((occurrence) => (
            <Link
              key={`${occurrence.terrain}-${occurrence.tileName}-${occurrence.side}`}
              href={occurrence.href}
              className="rounded border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              <span className="font-medium">{occurrence.tileName}</span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                {occurrence.terrain} · {occurrence.side} · {occurrence.count}{" "}
                {occurrence.count === 1 ? "clearing" : "clearings"}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

type ClearingTypeTerrainPackEntry = {
  name: string;
  slug: string;
  iconUrl?: string;
  count: number;
  percentage: number;
};

function terrainPacksForClearingType(
  clearingType: ClearingTypeId,
): ClearingTypeTerrainPackEntry[] {
  return getAllTerrainPacks()
    .flatMap((pack) => {
      const entry = pack.clearingTypes.find((type) => type.id === clearingType);
      return entry
        ? [
            {
              name: terrainPackDisplayName(pack),
              slug: pack.slug,
              iconUrl: pack.iconUrl,
              count: entry.count,
              percentage: entry.percentage,
            },
          ]
        : [];
    })
    .sort(
      (left, right) =>
        right.percentage - left.percentage ||
        left.name.localeCompare(right.name),
    );
}

function TerrainPackClearingTypeTile({
  clearingTypeLabel,
  entry,
}: {
  clearingTypeLabel: string;
  entry: ClearingTypeTerrainPackEntry;
}) {
  return (
    <Link
      href={`/terrain-packs/${entry.slug}`}
      className="rounded border border-zinc-200 dark:border-zinc-800 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3">
          {entry.iconUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.iconUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded border border-zinc-200 bg-zinc-100 object-cover dark:border-zinc-800 dark:bg-zinc-900"
            />
          )}
          <h3 className="min-w-0 text-base font-semibold leading-5">
            {entry.name}
          </h3>
        </span>
        <span className="shrink-0 text-lg font-semibold tabular-nums">
          {formatPercentage(entry.percentage)}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
        <span
          className="block h-full rounded-full bg-zinc-700 dark:bg-zinc-300"
          style={{ width: `${entry.percentage}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {entry.count} {singularClearingTypeLabel(clearingTypeLabel)} clearing
        {entry.count === 1 ? "" : "s"}
      </p>
    </Link>
  );
}

function singularClearingTypeLabel(label: string): string {
  return label.toLowerCase().replace(/s$/u, "");
}

function terrainPackDisplayName(pack: TerrainPackEntry): string {
  return pack.slug === "neutral" ? "Always in use" : pack.name;
}

function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

type ClearingTypeRuleReferences = Partial<
  Record<
    ClearingTypeId,
    {
      classes?: string[];
      lineages?: string[];
      rulebookLinks?: RulebookLinkQuery[];
    }
  >
>;

async function resolveClearingTypeRulebookLinks(
  clearingType: ClearingTypeId,
): Promise<RulebookLink[]> {
  const references = (clearingTypeRules as ClearingTypeRuleReferences)[
    clearingType
  ];
  if (!references) return [];

  const links = await Promise.all([
    ...uniqueRulebookQueries(references.rulebookLinks).map((query) =>
      resolveRulebookLinks(query),
    ),
    ...uniqueSlugs(references.lineages).map((slug) =>
      resolveLineageRulebookLinks(slug),
    ),
    ...uniqueSlugs(references.classes).map((slug) =>
      resolveClassRulebookLinks(slug),
    ),
  ]);

  return uniqueRulebookLinks(links.flat());
}

async function resolveClassRulebookLinks(
  slug: string,
): Promise<RulebookLink[]> {
  const entry = getClassBySlug(CLASS_RULE_ALIASES[slug] ?? slug);
  const ttsClass = entry?.classes[0];
  if (!entry || !ttsClass) {
    throw new Error(`Unknown clearing type class rule reference: ${slug}`);
  }
  return resolveClassAdvantageRulebookLinks(ttsClass.advantageTitle);
}

async function resolveLineageRulebookLinks(
  slug: string,
): Promise<RulebookLink[]> {
  const entry = getLineageBySlug(slug);
  const lineage = entry?.lineages[0];
  if (!entry || !lineage) {
    throw new Error(`Unknown clearing type lineage rule reference: ${slug}`);
  }
  return resolveLineageAdvantageRulebookLinks(lineage.advantageTitle);
}

function uniqueSlugs(slugs: string[] = []): string[] {
  return Array.from(new Set(slugs));
}

function uniqueRulebookQueries(
  queries: RulebookLinkQuery[] = [],
): RulebookLinkQuery[] {
  return Array.from(
    new Map(
      queries.map(
        (query) =>
          [
            `${query.doc}:${query.headings.join("|")}:${query.anchor ?? ""}`,
            query,
          ] as const,
      ),
    ).values(),
  );
}

function uniqueRulebookLinks(links: RulebookLink[]): RulebookLink[] {
  return Array.from(
    new Map(
      links.map(
        (link) =>
          [
            `${link.docSlug}:${link.sectionId}:${link.anchor ?? ""}`,
            link,
          ] as const,
      ),
    ).values(),
  );
}

const CLASS_RULE_ALIASES: Record<string, string> = {
  fighter: "warrior",
  thief: "rogue",
};
