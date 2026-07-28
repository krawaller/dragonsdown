import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BoardImageToggle,
  type BoardAreaLink,
} from "@/components/BoardImageToggle";
import { getBoardPositionForItem } from "@/lib/board-positions";
import {
  getAllBoards,
  getAllTerrainPacks,
  getBoardBySlug,
  getMerchantBySlug,
  getSiteBySlug,
  getWildernessTokenBySlug,
  type TerrainPackEntry,
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
  const terrainPackName = board.terrainPack ?? board.terrain;
  const terrainPack = getAllTerrainPacks().find(
    (pack) => pack.name === terrainPackName,
  );
  const sites = board.sites
    .map(resolveSiteTarget)
    .filter((site): site is LinkTarget => site !== null);
  const merchants = board.merchants
    .map(resolveMerchantTarget)
    .filter((merchant): merchant is LinkTarget => merchant !== null);
  const boardAreas = [...sites, ...merchants]
    .map((target) => {
      const position = getBoardPositionForItem(board, target.name);
      return position
        ? { name: target.name, href: target.href, position }
        : null;
    })
    .filter((target): target is BoardAreaLink => target !== null);
  const subtitle = boardContentsLabel({
    merchants: merchants.length,
    treasureSites: sites.length,
  });

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
      <div className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-4xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </p>
        </div>
        <HeaderContextLinks terrainPack={terrainPack} />
      </div>

      <BoardImageToggle
        title={title}
        imageURL={board.imageURL}
        imageSecondaryURL={board.imageSecondaryURL}
        areas={boardAreas}
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
              <h2 className="text-xl font-semibold mb-4">Merchants</h2>
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

function HeaderContextLinks({
  terrainPack,
}: {
  terrainPack?: TerrainPackEntry;
}) {
  if (!terrainPack) return null;

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <HeaderContextLink
        href={`/terrain-packs/${terrainPack.slug}`}
        label="Terrain pack"
        value={
          terrainPack.slug === "neutral" ? "Always in use" : terrainPack.name
        }
        imageUrl={terrainPack.iconUrl}
      />
    </div>
  );
}

function HeaderContextLink({
  href,
  label,
  value,
  imageUrl,
}: {
  href: string;
  label: string;
  value: string;
  imageUrl?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-w-0 items-center gap-2 rounded border border-zinc-200 bg-white px-2.5 py-2 text-xs transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
    >
      {imageUrl && (
        <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="block size-full object-cover" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-[0.6875rem] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        <span className="block truncate font-medium text-zinc-900 dark:text-zinc-100">
          {value}
        </span>
      </span>
    </Link>
  );
}

function boardContentsLabel({
  merchants,
  treasureSites,
}: {
  merchants: number;
  treasureSites: number;
}): string {
  const parts = [];
  if (merchants > 0) {
    parts.push(`${merchants} merchant${merchants === 1 ? "" : "s"}`);
  }
  if (treasureSites > 0) {
    parts.push(
      `${treasureSites} treasure site${treasureSites === 1 ? "" : "s"}`,
    );
  }
  return parts.length > 0 ? parts.join(" and ") : "Empty board";
}

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
  const merchant = getMerchantBySlug(slug);
  if (merchant) {
    const token = merchant.tokens[0];
    return {
      name,
      href: `/merchants/${merchant.slug}`,
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
