import Link from "next/link";
import { Suspense } from "react";
import { CivilisationTokenBrowser } from "@/components/CivilisationTokenBrowser";
import { getAllCivilisationTokenTerrains } from "@/lib/tts/lookup";

export default function CivilisationTokensPage() {
  const terrains = getAllCivilisationTokenTerrains();
  const totalImages = terrains.reduce(
    (sum, terrain) => sum + terrain.tokens.length,
    0,
  );
  const totalPhysical = terrains.reduce(
    (sum, terrain) =>
      sum +
      terrain.tokens.reduce(
        (terrainSum, token) =>
          terrainSum + token.locations.reduce((n, loc) => n + loc.count, 0),
        0,
      ),
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
      <h1 className="text-4xl font-bold mt-4 mb-2">Civilisation Tokens</h1>
      <p className="text-sm text-zinc-500 mb-8">
        {totalImages} token images · {totalPhysical} physical tokens across{" "}
        {terrains.length} groups
      </p>
      <Suspense fallback={null}>
        <CivilisationTokenBrowser terrains={terrains} />
      </Suspense>
    </main>
  );
}
