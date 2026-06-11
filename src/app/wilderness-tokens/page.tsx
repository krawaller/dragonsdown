import Link from "next/link";
import { Suspense } from "react";
import { WildernessTokenBrowser } from "@/components/WildernessTokenBrowser";
import { getAllWildernessTokenTerrains } from "@/lib/tts/lookup";

export default function WildernessTokensPage() {
  const terrains = getAllWildernessTokenTerrains();
  const total = terrains.reduce(
    (sum, terrain) => sum + terrain.tokens.length,
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
        {total} token images across {terrains.length} terrain packs
      </p>
      <Suspense fallback={null}>
        <WildernessTokenBrowser terrains={terrains} />
      </Suspense>
    </main>
  );
}
