import Link from "next/link";
import { getAllChips } from "@/lib/tts/lookup";
import { ChipGrid } from "@/components/ChipGrid";

export default function ChipsPage() {
  const entries = getAllChips();
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Chips</h1>
      <p className="text-sm text-zinc-500 mb-8">
        {entries.length} chip types from the TTS mod · click any chip to zoom
      </p>
      <ChipGrid entries={entries} />
    </main>
  );
}
