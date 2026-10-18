import Link from "next/link";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { PageHeader } from "@/components/PageHeader";
import { SITE_FACE_URL } from "@/lib/tts";
import {
  getAllSites,
  getAllTerrainPacks,
  type SiteEntry,
  type TerrainPackEntry,
} from "@/lib/tts/lookup";

export default function SiteTokensPage() {
  const siteTokens = getAllSites().filter((entry) => entry.kind === "proper");
  const siteTokensByTerrainPack = new Map(
    siteTokens.map((entry) => [entry.site.terrainPack, [] as SiteEntry[]]),
  );

  for (const token of siteTokens) {
    siteTokensByTerrainPack.get(token.site.terrainPack)?.push(token);
  }

  const terrainPacks = getAllTerrainPacks()
    .map((pack) => ({
      ...pack,
      siteTokens: siteTokensByTerrainPack.get(pack.name) ?? [],
    }))
    .filter((pack) => pack.siteTokens.length > 0);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <PageHeader
        title="Site Tokens"
        subtitle={`${siteTokens.length} treasure site tokens`}
        categories={[
          {
            href: "/components",
            label: "Category",
            value: "Components",
            imageUrl: SITE_FACE_URL,
          },
        ]}
      />

      <div className="space-y-6">
        {terrainPacks.map((pack) => (
          <CollapsibleBox
            key={pack.slug}
            title={<TerrainPackTitle pack={pack} />}
            count={pack.siteTokens.length}
            countLabel={siteTokenCountLabel(pack.siteTokens.length)}
          >
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              {pack.siteTokens.map((entry) => (
                <SiteTokenCard key={entry.slug} entry={entry} />
              ))}
            </div>
          </CollapsibleBox>
        ))}
      </div>
    </main>
  );
}

function TerrainPackTitle({ pack }: { pack: TerrainPackEntry }) {
  return (
    <span className="inline-flex items-center gap-3 align-middle">
      {pack.iconUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pack.iconUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded border border-zinc-200 bg-zinc-100 object-cover dark:border-zinc-800 dark:bg-zinc-900"
        />
      )}
      <span>{pack.name}</span>
    </span>
  );
}

function SiteTokenCard({ entry }: { entry: SiteEntry }) {
  const imageUrl = siteTokenImageUrl(entry);

  return (
    <section className="flex flex-col gap-2">
      <Link
        href={`/site-tokens/${entry.slug}`}
        className="overflow-hidden rounded border border-zinc-200 bg-zinc-100 transition hover:ring-2 hover:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
        aria-label={`View ${entry.name}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={entry.name}
          className="block aspect-square w-full object-cover"
        />
      </Link>
      <h2 className="text-base font-semibold">
        <Link href={`/site-tokens/${entry.slug}`} className="hover:underline">
          {entry.name}
        </Link>
      </h2>
    </section>
  );
}

function siteTokenImageUrl(entry: SiteEntry) {
  return entry.site.imageSecondaryURL || entry.site.imageURL;
}

function siteTokenCountLabel(count: number): string {
  return `${count} site token${count === 1 ? "" : "s"}`;
}
