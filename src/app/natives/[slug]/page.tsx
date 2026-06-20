import Link from "next/link";
import { notFound } from "next/navigation";
import { MissionLinks } from "@/components/MissionLinks";
import { MonsterGroupChipList } from "@/components/MonsterGroupChips";
import { NativeCivilisationCard } from "@/components/NativeCivilisationCard";
import { RulebookLinks } from "@/components/RulebookLinks";
import { resolveNativeRulebookLinks } from "@/lib/rulebook-links";
import {
  getAllNativeGroups,
  getMissionsFeaturing,
  getMissionsForTarget,
  getNativeGroupBySlug,
  getSpellsForMonster,
  type MonsterSpellEntry,
} from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllNativeGroups().map((entry) => ({ slug: entry.slug }));
}

export default async function NativePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = getNativeGroupBySlug(slug);
  if (!group) notFound();
  const missions = getMissionsForTarget(group.prettyName);
  const featuredMissions = getMissionsFeaturing(group.prettyName);
  const chipNames = group.chips.flatMap((chip) =>
    chip.monsterName ? [chip.monsterName] : [],
  );
  const spells = getSpellsForMonster([group.prettyName, ...chipNames]);
  const rulebookLinks = await resolveNativeRulebookLinks(
    group.prettyName,
    chipNames,
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/natives" className="hover:underline">
          Natives
        </Link>
      </div>
      <h1 className="text-4xl font-bold mt-4 mb-2">{group.prettyName}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {group.chips.length} chip{" "}
        {group.chips.length === 1 ? "image" : "images"}
      </p>

      {group.civilisationCard && (
        <NativeCivilisationCard
          card={group.civilisationCard}
          name={group.prettyName}
        />
      )}

      {group.nativeSummons.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Summoning Sources</h2>
          <div className="flex flex-wrap gap-2">
            {group.nativeSummons.map((summon) => (
              <Link
                key={summon.name}
                href={summon.href}
                className="rounded border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                <span className="font-medium">{summon.name}</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {summon.natives.join(", ")}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <MissionLinks
        missions={missions}
        heading="Complete At Missions"
        className="mb-10"
        headingClassName="text-xl font-semibold mb-3"
      />

      <MissionLinks
        missions={featuredMissions}
        heading="Featured In Missions"
        className="mb-10"
        headingClassName="text-xl font-semibold mb-3"
      />

      {spells.length > 0 && (
        <NativeSpellLinks groupName={group.prettyName} spells={spells} />
      )}

      <RulebookLinks
        links={rulebookLinks}
        heading="Rulebook"
        className="mb-10"
      />

      <MonsterGroupChipList group={group} />
    </main>
  );
}

function NativeSpellLinks({
  groupName,
  spells,
}: {
  groupName: string;
  spells: MonsterSpellEntry[];
}) {
  return (
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
              {spell.casterNames.some((name) => name !== groupName) && (
                <>
                  {" "}
                  ·{" "}
                  {spell.casterNames
                    .filter((name) => name !== groupName)
                    .join(", ")}
                </>
              )}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
