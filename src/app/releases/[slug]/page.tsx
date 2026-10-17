import Link from "next/link";
import { notFound } from "next/navigation";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import {
  getAllReleases,
  getReleaseBySlug,
  getReleaseComponentGroups,
  type ReleaseComponentGroup,
} from "@/lib/releases";

export function generateStaticParams() {
  return getAllReleases().map((release) => ({ slug: release.slug }));
}

export default async function ReleasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const release = getReleaseBySlug(slug);
  if (!release) notFound();
  const groups = getReleaseComponentGroups(release);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/releases" className="hover:underline">
          Releases
        </Link>
      </div>

      <h1 className="text-4xl font-bold mt-4 mb-2">{release.title}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        Version {release.version}
      </p>

      <div className="space-y-6">
        {groups.map((group) => (
          <ReleaseComponentBox key={group.title} group={group} />
        ))}
      </div>
    </main>
  );
}

function ReleaseComponentBox({ group }: { group: ReleaseComponentGroup }) {
  return (
    <CollapsibleBox
      title={group.title}
      count={group.items.length}
      countLabel={`${group.items.length} ${group.items.length === 1 ? "entry" : "entries"}`}
      contentClassName="border-t border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {group.items.map((item) => (
          <Link
            key={`${item.href}-${item.name}`}
            href={item.href}
            className="block rounded border border-zinc-200 p-3 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <span className="block truncate text-sm font-semibold">
              {item.name}
            </span>
            {item.detail && (
              <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                {item.detail}
              </span>
            )}
          </Link>
        ))}
      </div>
    </CollapsibleBox>
  );
}
