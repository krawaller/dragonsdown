import Link from "next/link";
import { getCardsWithTag } from "@/lib/tts/lookup";
import { CardGrid } from "@/components/CardGrid";

export default function MissionsPage() {
  const entries = getCardsWithTag("Mission");
  const total = entries.reduce((n, e) => n + e.cards.length, 0);
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Missions</h1>
      <p className="text-sm text-zinc-500 mb-8">
        {total} card{total === 1 ? "" : "s"} tagged{" "}
        <code className="text-xs">Mission</code> in the TTS mod · click any card
        to zoom
      </p>
      <CardGrid entries={entries} excludeTag="Mission" />
    </main>
  );
}
