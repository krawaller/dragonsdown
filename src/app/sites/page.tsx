import Link from "next/link";
import { OptionalRuleLinks } from "@/components/OptionalRuleLinks";
import { SiteGrid } from "@/components/SiteGrid";
import { SITE_FACE_URL } from "@/lib/tts";
import { getAllSites } from "@/lib/tts/lookup";

export default async function SitesPage() {
  const entries = getAllSites();
  const properSiteEntries = entries.filter((entry) => entry.kind === "proper");
  const wildernessTokenSiteEntries = entries.filter(
    (entry) => entry.kind === "wilderness-token",
  );

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
      <OptionalRuleLinks
        rules={["Magic Sites", "Watchful Guardians"]}
        className="mb-8"
      />
      <div className="space-y-6">
        <details
          open
          className="rounded border border-zinc-200 dark:border-zinc-800 p-4"
        >
          <summary className="cursor-pointer text-lg font-semibold">
            Site Token Sites ({properSiteEntries.length})
          </summary>
          <SiteGrid entries={properSiteEntries} className="mt-6" />
        </details>

        <details
          open
          className="rounded border border-zinc-200 dark:border-zinc-800 p-4"
        >
          <summary className="cursor-pointer text-lg font-semibold">
            Wilderness Token Sites ({wildernessTokenSiteEntries.length})
          </summary>
          <SiteGrid entries={wildernessTokenSiteEntries} className="mt-6" />
        </details>
      </div>
    </main>
  );
}
