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
import { getClassBySlug, getLineageBySlug } from "@/lib/tts/lookup";
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
