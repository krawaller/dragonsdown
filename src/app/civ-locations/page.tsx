import Link from "next/link";
import { getAllCivLocations } from "@/lib/tts/lookup";
import { CivLocationGrid } from "@/components/CivLocationGrid";

export default function CivLocationsPage() {
  const entries = getAllCivLocations();
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Civ Locations</h1>
      <p className="text-sm text-zinc-500 mb-8">
        {entries.length} civilization locations from the TTS mod · click any
        tile to zoom
      </p>
      <CivLocationGrid entries={entries} />
    </main>
  );
}
