import Link from "next/link";
import { SITE_FACE_URL } from "@/lib/tts";
import { getAllSites } from "@/lib/tts/lookup";
import { SiteGrid } from "@/components/SiteGrid";

export default function SitesPage() {
  const entries = getAllSites();
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-4">Sites</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SITE_FACE_URL}
        alt="Site card back"
        className="w-32 aspect-square object-contain rounded bg-zinc-100 mb-4"
      />
      <p className="text-sm text-zinc-500 mb-8">
        {entries.length} treasure sites from the TTS mod
      </p>
      <SiteGrid entries={entries} />
    </main>
  );
}
