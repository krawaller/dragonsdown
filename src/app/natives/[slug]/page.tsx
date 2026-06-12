import Link from "next/link";
import { notFound } from "next/navigation";
import { MonsterGroupChipList } from "@/components/MonsterGroupChips";
import { getAllNativeGroups, getNativeGroupBySlug } from "@/lib/tts/lookup";

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

      <MonsterGroupChipList group={group} />
    </main>
  );
}
