"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { WildernessTokenTerrainEntry } from "@/lib/tts/lookup";

export function WildernessTokenBrowser({
  terrains,
}: {
  terrains: WildernessTokenTerrainEntry[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const terrainNames = useMemo(
    () => terrains.map((entry) => entry.terrain),
    [terrains],
  );
  const terrainParam = searchParams.get("terrain") ?? "";
  const terrain = terrainNames.includes(terrainParam)
    ? terrainParam
    : (terrainNames[0] ?? "");
  const selected = terrains.find((entry) => entry.terrain === terrain);

  useEffect(() => {
    if (!terrain || terrainParam === terrain) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("terrain", terrain);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams, terrain, terrainParam]);

  function selectTerrain(nextTerrain: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("terrain", nextTerrain);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  if (!selected) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No wilderness tokens found.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <label className="block max-w-sm">
        <span className="block text-sm font-medium mb-2">Terrain</span>
        <select
          value={terrain}
          onChange={(event) => selectTerrain(event.target.value)}
          className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
        >
          {terrainNames.map((terrainName) => (
            <option key={terrainName} value={terrainName}>
              {terrainName}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {selected.tokens.map((token) => (
          <section
            key={`${token.terrain}-${token.imageURL}`}
            className="flex flex-col gap-1"
          >
            <Link
              href={`/wilderness-tokens/${token.slug}`}
              className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:ring-2 hover:ring-zinc-400 transition"
              aria-label={`View ${token.name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={token.imageURL}
                alt={token.name}
                className="w-full aspect-square object-cover block bg-zinc-100 dark:bg-zinc-900"
              />
            </Link>
            <h2 className="text-base font-semibold mt-1">
              <Link
                href={`/wilderness-tokens/${token.slug}`}
                className="hover:underline"
              >
                {token.name}
              </Link>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {wildernessTokenDetails(token)} · {tokenTotalCount(token)} total
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}

function wildernessTokenDetails(
  token: WildernessTokenTerrainEntry["tokens"][number],
): string {
  if (token.clearing !== undefined) return `clearing ${token.clearing}`;
  if (token.draw !== undefined) return `draw ${token.draw}`;
  return token.terrain;
}

function tokenTotalCount(
  token: WildernessTokenTerrainEntry["tokens"][number],
): number {
  return token.locations.reduce((sum, loc) => sum + loc.count, 0);
}
