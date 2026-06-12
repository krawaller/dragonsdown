import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllSites,
  getBoardsForSite,
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
  const monsterGroups = getMonsterGroupsForSite(entry.name);

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
          <h2 className="text-xl font-semibold mb-4">Monster Groups</h2>
          <div className="flex flex-wrap gap-2">
            {monsterGroups.map((group) => (
              <Link
                key={group.slug}
                href={`/monster-groups/${group.slug}`}
                className="rounded border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                <span className="font-medium">{group.name}</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {group.monsters.join(", ")}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {boards.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Boards</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {boards.map(({ slug, title, board }) => (
              <Link key={slug} href={`/boards/${slug}`} className="group block">
                <span className="block overflow-hidden rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 group-hover:ring-2 group-hover:ring-zinc-400 transition">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={board.imageURL}
                    alt={title}
                    className="block w-full aspect-square object-cover"
                  />
                </span>
                <span className="mt-2 block text-sm font-medium group-hover:underline">
                  {title}
                </span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {board.terrain}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
