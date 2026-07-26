import Link from "next/link";
import { CollapsibleBox } from "@/components/CollapsibleBox";
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
        <CollapsibleBox
          title="Site Token Sites"
          count={properSiteEntries.length}
          countLabel={`${properSiteEntries.length} site${properSiteEntries.length === 1 ? "" : "s"}`}
        >
          <SiteGrid entries={properSiteEntries} />
        </CollapsibleBox>

        <CollapsibleBox
          title="Wilderness Token Sites"
          count={wildernessTokenSiteEntries.length}
          countLabel={`${wildernessTokenSiteEntries.length} site${wildernessTokenSiteEntries.length === 1 ? "" : "s"}`}
        >
          <SiteGrid entries={wildernessTokenSiteEntries} />
        </CollapsibleBox>
      </div>
    </main>
  );
}
