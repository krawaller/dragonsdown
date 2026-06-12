import Link from "next/link";
import { notFound } from "next/navigation";
import { BoardImageToggle } from "@/components/BoardImageToggle";
import {
  getAllBoards,
  getBoardBySlug,
  getCivilisationTokenBySlug,
  getSiteBySlug,
  getWildernessTokenBySlug,
} from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllBoards().map((entry) => ({ slug: entry.slug }));
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getBoardBySlug(slug);
  if (!entry) notFound();

  const { title, board } = entry;
  const sites = board.sites
    .map(resolveSiteTarget)
    .filter((site): site is LinkTarget => site !== null);
  const merchants = board.merchants
    .map(resolveMerchantTarget)
    .filter((merchant): merchant is LinkTarget => merchant !== null);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/boards" className="hover:underline">
          Boards
        </Link>
      </div>
      <h1 className="text-4xl font-bold mt-4 mb-2">{title}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {board.terrain}
      </p>

      <BoardImageToggle
        title={title}
        imageURL={board.imageURL}
        imageSecondaryURL={board.imageSecondaryURL}
      />

      {(sites.length > 0 || merchants.length > 0) && (
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-10">
          {sites.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">Sites</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {sites.map(({ name, href, imageURL }) => (
                  <Link key={name} href={href} className="group block">
                    <span className="block overflow-hidden rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 group-hover:ring-2 group-hover:ring-zinc-400 transition">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageURL}
                        alt={name}
                        className="block w-full aspect-square object-cover"
                      />
                    </span>
                    <span className="mt-2 block text-sm font-medium group-hover:underline">
                      {name}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {merchants.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4">Merchant Tokens</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {merchants.map(({ name, href, imageURL }) => (
                  <Link key={name} href={href} className="group block">
                    <span className="block overflow-hidden rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 group-hover:ring-2 group-hover:ring-zinc-400 transition">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageURL}
                        alt={name}
                        className="block w-full aspect-square object-cover"
                      />
                    </span>
                    <span className="mt-2 block text-sm font-medium group-hover:underline">
                      {name}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

type LinkTarget = {
  name: string;
  href: string;
  imageURL: string;
};

function resolveSiteTarget(name: string): LinkTarget | null {
  const slug = slugify(name);
  const site = getSiteBySlug(slug);
  if (site) {
    return {
      name,
      href: `/sites/${site.slug}`,
      imageURL: site.site.imageSecondaryURL,
    };
  }
  const wildernessToken = getWildernessTokenBySlug(slug);
  if (!wildernessToken) return null;
  return {
    name,
    href: `/wilderness-tokens/${wildernessToken.slug}`,
    imageURL: wildernessToken.tokens[0].imageURL,
  };
}

function resolveMerchantTarget(name: string): LinkTarget | null {
  const slug = slugify(name);
  const civilisationToken = getCivilisationTokenBySlug(slug);
  if (civilisationToken) {
    const token = civilisationToken.tokens[0];
    return {
      name,
      href: `/civilisation-tokens/${civilisationToken.slug}`,
      imageURL: token.imageSecondaryURL || token.imageURL,
    };
  }
  const wildernessToken = getWildernessTokenBySlug(slug);
  if (!wildernessToken) return null;
  return {
    name,
    href: `/wilderness-tokens/${wildernessToken.slug}`,
    imageURL: wildernessToken.tokens[0].imageURL,
  };
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
