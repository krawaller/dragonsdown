import Link from "next/link";
import { notFound } from "next/navigation";
import { MissionLinks } from "@/components/MissionLinks";
import { MonsterGroupChipList } from "@/components/MonsterGroupChips";
import { RulebookLinks } from "@/components/RulebookLinks";
import { resolveMonsterRulebookLinks } from "@/lib/rulebook-links";
import type { RulebookLink } from "@/lib/rulebook-links";
import { chipTotalCount } from "@/lib/tts";
import {
  getAllMonsterGroups,
  getMissionsFeaturing,
  getMonsterGroupBySlug,
  getSpellsForMonster,
  type MonsterGroupEntry,
  type MonsterSpellEntry,
} from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllMonsterGroups().map((entry) => ({ slug: entry.slug }));
}

export default async function MonsterGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = getMonsterGroupBySlug(slug);
  if (!group) notFound();
  const featuredMissions = getMissionsFeaturing(group.prettyName);
  const chipNames = group.chips.flatMap((chip) =>
    chip.monsterName ? [chip.monsterName] : [],
  );
  const spells = getSpellsForMonster([group.prettyName, ...chipNames]);
  const rulebookLinks = await resolveMonsterRulebookLinks(
    group.prettyName,
    group.chips.flatMap((chip) => (chip.monsterName ? [chip.monsterName] : [])),
  );
  const displayGroup = withRulebookMonsterNames(group, rulebookLinks);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/monster-groups" className="hover:underline">
          Monster Groups
        </Link>
      </div>
      <h1 className="text-4xl font-bold mt-4 mb-2">{group.prettyName}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {group.chips.length} chip{" "}
        {group.chips.length === 1 ? "image" : "images"}
      </p>

      {(group.mapTiles.length > 0 || group.sites.length > 0) && (
        <section className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {group.mapTiles.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Map Tiles</h2>
              <div className="flex flex-wrap gap-2">
                {group.mapTiles.map((summon) => (
                  <Link
                    key={`${summon.terrain}-${summon.tileName}-${summon.role}`}
                    href={summon.href}
                    className="rounded border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <span className="font-medium">{summon.tileName}</span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                      {summon.terrain} · {summon.role}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {group.sites.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Sites</h2>
              <div className="flex flex-wrap gap-2">
                {group.sites.map((summon) => (
                  <Link
                    key={summon.name}
                    href={summon.href}
                    className="rounded border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <span className="font-medium">{summon.name}</span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                      {summon.monsters.join(", ")}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {spells.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Spells</h2>
          <div className="flex flex-wrap gap-2">
            {spells.map((spell) => (
              <Link
                key={spell.spellName}
                href={`/spells/${spell.spellSlug}`}
                className="rounded border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                <span className="font-medium">{spell.spellName}</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {spell.sides.join(" & ")}
                  {spell.casterNames.some((n) => n !== group.prettyName) && (
                    <>
                      {" "}
                      ·{" "}
                      {spell.casterNames
                        .filter((n) => n !== group.prettyName)
                        .join(", ")}
                    </>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <MissionLinks
        missions={featuredMissions}
        heading="Featured In Missions"
        className="mb-10"
        headingClassName="text-xl font-semibold mb-3"
      />

      <RulebookLinks
        links={rulebookLinks}
        heading="Rulebook"
        className="mb-10"
      />

      <MonsterGroupChipList group={displayGroup} />
    </main>
  );
}

function withRulebookMonsterNames(
  group: MonsterGroupEntry,
  rulebookLinks: RulebookLink[],
): MonsterGroupEntry {
  if (group.chips.every((chip) => chip.monsterName)) return group;

  const uniqueNames = rulebookLinks
    .filter((link) => /\bunique Monster\b/i.test(link.content))
    .map((link) => link.sectionTitle)
    .filter((title) => title !== group.prettyName);
  if (uniqueNames.length === 0) return group;

  const remainingUniqueNames = [...uniqueNames];
  return {
    ...group,
    chips: group.chips.map((chip) => {
      if (chip.monsterName) return chip;
      const total = chipTotalCount(chip);
      if (total === 1 && remainingUniqueNames.length > 0) {
        return { ...chip, monsterName: remainingUniqueNames.shift() };
      }
      return { ...chip, monsterName: group.prettyName };
    }),
  };
}
