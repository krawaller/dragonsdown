import Link from "next/link";
import { getAllReleases } from "@/lib/releases";

export default function ReleasesPage() {
  const releases = getAllReleases();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Releases</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {releases.length} rulebook releases
      </p>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {releases.map((release) => (
          <Link
            key={release.slug}
            href={`/releases/${release.slug}`}
            className="block rounded-lg border border-zinc-200 px-5 py-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <span className="flex items-center gap-3">
              {release.iconUrl && (
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={release.iconUrl}
                    alt=""
                    className="block size-full object-contain"
                  />
                </span>
              )}
              <span className="block min-w-0 text-lg font-semibold">
                {release.title}
              </span>
            </span>
            <span className="mt-2 block text-sm text-zinc-500 dark:text-zinc-400">
              Version {release.version}
            </span>
            <span className="mt-1 block truncate text-xs text-zinc-500 dark:text-zinc-400">
              {release.file}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
