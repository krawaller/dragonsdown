import Link from "next/link";
import { notFound } from "next/navigation";
import { BoardPositionLinks } from "@/components/BoardPositionLinks";
import { MissionLinks } from "@/components/MissionLinks";
import { MonsterGroupStack } from "@/components/MonsterGroupChips";
import { RulebookLinks } from "@/components/RulebookLinks";
import { resolveSiteRulebookLinks } from "@/lib/rulebook-links";
import {
  getAllSites,
  getBoardsForSite,
  getMissionsForTarget,
  getMonsterGroupBySlug,
  getMonsterGroupsForSite,
  getSiteBySlug,
} from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllSites().map((entry) => ({ slug: entry.slug }));
}

export default async function SitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getSiteBySlug(slug);
  if (!entry) notFound();

  const boards = getBoardsForSite(entry.name);
  const monsterGroups = getMonsterGroupsForSite(entry.name).flatMap((group) => {
    const fullGroup = getMonsterGroupBySlug(group.slug);
    return fullGroup ? [fullGroup] : [];
  });
  const missions = getMissionsForTarget(entry.name);
  const rulebookLinks = await resolveSiteRulebookLinks(entry.name);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/sites" className="hover:underline">
          Sites
        </Link>
      </div>
      <h1 className="text-4xl font-bold mt-4 mb-2">{entry.name}</h1>
      {entry.site.ancestry.length > 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
          {entry.site.ancestry.join(" / ")}
        </p>
      )}

      <div className="max-w-2xl rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.site.imageSecondaryURL}
          alt={entry.name}
          className="block w-full aspect-square object-contain"
        />
      </div>

      {monsterGroups.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Guardian</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {monsterGroups.map((group) => (
              <MonsterGroupStack key={group.slug} group={group} />
            ))}
          </div>
        </section>
      )}

      <MissionLinks
        missions={missions}
        className="mt-10"
        headingClassName="text-xl font-semibold mb-4"
      />

      <BoardPositionLinks
        boards={boards}
        itemName={entry.name}
        className="mt-10"
        headingClassName="text-xl font-semibold"
      />

      <RulebookLinks
        links={rulebookLinks}
        heading="Rulebook"
        className="mt-10"
      />
    </main>
  );
}
