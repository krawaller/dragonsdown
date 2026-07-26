import Link from "next/link";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import {
  getAllTerrainPacks,
  getAllWildernessTokenTerrains,
  type WildernessTokenTerrainEntry,
} from "@/lib/tts/lookup";

export default function WildernessTokensPage() {
  const terrains = getAllWildernessTokenTerrains();
  const terrainPacksByName = new Map(
    getAllTerrainPacks().map((pack) => [pack.name, pack]),
  );
  const total = terrains.reduce(
    (sum, terrain) => sum + terrainTokenTotalCount(terrain),
    0,
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Wilderness Tokens</h1>
      <p className="text-sm text-zinc-500 mb-8">
        {tokenCountLabel(total)} across {terrains.length} terrain packs
      </p>
      <div className="space-y-6">
        {terrains.map((terrain) => {
          const tokenCount = terrainTokenTotalCount(terrain);
          const pack = terrainPacksByName.get(terrain.terrain);

          return (
            <CollapsibleBox
              key={terrain.terrain}
              title={
                <TerrainPackTitle
                  name={terrain.terrain}
                  iconUrl={pack?.iconUrl}
                />
              }
              count={tokenCount}
              countLabel={`${tokenCount} token${tokenCount === 1 ? "" : "s"}`}
            >
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
                {terrain.tokens.map((token) => (
                  <section
                    key={`${token.terrain}-${token.imageURL}`}
                    className="flex flex-col gap-1"
                  >
                    <Link
                      href={`/wilderness-tokens/${token.slug}`}
                      className="overflow-hidden rounded border border-zinc-200 transition hover:ring-2 hover:ring-zinc-400 dark:border-zinc-800"
                      aria-label={`View ${token.name}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={token.imageURL}
                        alt={token.name}
                        className="block aspect-square w-full bg-zinc-100 object-cover dark:bg-zinc-900"
                      />
                    </Link>
                    <h2 className="mt-1 text-base font-semibold">
                      <Link
                        href={`/wilderness-tokens/${token.slug}`}
                        className="hover:underline"
                      >
                        {token.name}
                      </Link>
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {tokenCountLabel(tokenTotalCount(token))}
                    </p>
                  </section>
                ))}
              </div>
            </CollapsibleBox>
          );
        })}
      </div>
    </main>
  );
}

function TerrainPackTitle({
  name,
  iconUrl,
}: {
  name: string;
  iconUrl?: string;
}) {
  return (
    <span className="inline-flex items-center gap-3 align-middle">
      {iconUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={iconUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded border border-zinc-200 bg-zinc-100 object-cover dark:border-zinc-800 dark:bg-zinc-900"
        />
      )}
      <span>{name}</span>
    </span>
  );
}

function tokenTotalCount(
  token: WildernessTokenTerrainEntry["tokens"][number],
): number {
  return token.locations.reduce((sum, loc) => sum + loc.count, 0);
}

function tokenCountLabel(count: number): string {
  return `${count} token${count === 1 ? "" : "s"}`;
}

function terrainTokenTotalCount(terrain: WildernessTokenTerrainEntry): number {
  return terrain.tokens.reduce((sum, token) => sum + tokenTotalCount(token), 0);
}
