import Link from "next/link";
import { MonsterGroupStack } from "@/components/MonsterGroupChips";
import { getAllMonsterGroups } from "@/lib/tts/lookup";

export default function MonsterGroupsPage() {
  const groups = getAllMonsterGroups();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Monster Groups</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {groups.length} groups from the TTS chip index
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {groups.map((group) => (
          <MonsterGroupStack
            key={group.slug}
            group={group}
            summaryKind="monsterIndex"
          />
        ))}
      </div>
    </main>
  );
}
