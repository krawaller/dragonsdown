import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCivLocationBySlug,
  getAllWildernessTokenNames,
  getWildernessTokenBySlug,
  type WildernessTokenListEntry,
} from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllWildernessTokenNames().map((entry) => ({ slug: entry.slug }));
}

export default async function WildernessTokenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getWildernessTokenBySlug(slug);
  if (!entry) notFound();
  const civLocation = getCivLocationBySlug(entry.slug);

  const total = entry.tokens.reduce(
    (sum, token) => sum + tokenTotalCount(token),
    0,
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/wilderness-tokens" className="hover:underline">
          Wilderness Tokens
        </Link>
      </div>
      <h1 className="text-4xl font-bold mt-4 mb-2">{entry.name}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {entry.tokens.length} images · {total} physical tokens
      </p>

      {civLocation && (
        <Link
          href={`/civ-locations/${civLocation.slug}`}
          className="mb-8 inline-flex max-w-full items-center gap-3 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-2 pr-3 text-sm hover:ring-2 hover:ring-zinc-400 transition"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={civLocation.location.imageURL}
            alt={civLocation.name}
            className="block size-16 shrink-0 rounded object-cover"
          />
          <span className="min-w-0">
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              Civ location
            </span>
            <span className="block truncate font-medium">
              {civLocation.name}
            </span>
          </span>
        </Link>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {entry.tokens.map((token) => (
          <section
            key={`${token.terrain}-${token.imageURL}`}
            className="flex flex-col gap-2"
          >
            <div className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={token.imageURL}
                alt={`${entry.name} ${token.terrain}`}
                className="block w-full aspect-square object-cover"
              />
            </div>
            <div>
              <h2 className="text-base font-semibold">{token.terrain}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {wildernessTokenDetails(token)} · {tokenTotalCount(token)} total
              </p>
            </div>
            <ul className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              {token.locations.map((location) => (
                <li key={`${location.ancestry.join("/")}-${location.count}`}>
                  {location.ancestry.length > 0
                    ? location.ancestry.join(" / ")
                    : "Loose"}
                  {" · "}
                  {location.count}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}

function wildernessTokenDetails(token: WildernessTokenListEntry): string {
  if (token.clearing !== undefined) return `clearing ${token.clearing}`;
  if (token.draw !== undefined) return `draw ${token.draw}`;
  return token.terrain;
}

function tokenTotalCount(token: WildernessTokenListEntry): number {
  return token.locations.reduce((sum, loc) => sum + loc.count, 0);
}
