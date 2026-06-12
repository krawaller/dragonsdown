import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllCivilisationTokenNames,
  getBoardsForMerchant,
  getCivilisationTokenBySlug,
  type CivilisationTokenListEntry,
} from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllCivilisationTokenNames().map((entry) => ({ slug: entry.slug }));
}

export default async function CivilisationTokenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getCivilisationTokenBySlug(slug);
  if (!entry) notFound();

  const total = entry.tokens.reduce(
    (sum, token) => sum + tokenTotalCount(token),
    0,
  );
  const boards = getBoardsForMerchant(entry.name);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/civilisation-tokens" className="hover:underline">
          Civilisation Tokens
        </Link>
      </div>
      <h1 className="text-4xl font-bold mt-4 mb-2">{entry.name}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {entry.tokens.length} images · {total} physical tokens
      </p>

      {boards.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium mb-2">Boards</h2>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {entry.tokens.map((token) => (
          <section
            key={`${token.terrainGroup}-${token.displayName}-${token.imageSecondaryURL}`}
            className="flex flex-col gap-2"
          >
            <div className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={token.imageSecondaryURL || token.imageURL}
                alt={civilisationTokenImageAlt(token)}
                className="block w-full aspect-square object-cover"
              />
            </div>
            <div>
              <h2 className="text-base font-semibold">{token.terrainGroup}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {civilisationTokenDetails(token)} · {tokenTotalCount(token)}{" "}
                total
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

function civilisationTokenDetails(token: CivilisationTokenListEntry): string {
  const parts = [token.attribute, token.gmNotes].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : token.terrainGroup;
}

function civilisationTokenImageAlt(token: CivilisationTokenListEntry): string {
  if (token.terrainGroup === token.displayName) return token.displayName;
  return `${token.displayName} ${token.terrainGroup}`;
}

function tokenTotalCount(token: CivilisationTokenListEntry): number {
  return token.locations.reduce((sum, loc) => sum + loc.count, 0);
}
