import Link from "next/link";
import { SpriteCell } from "@/components/CardSprite";
import { getAllLegendaryLocations } from "@/lib/tts/lookup";

export default function LegendaryLocationsPage() {
  const entries = getAllLegendaryLocations();
  const siteCount = entries.filter((entry) => entry.kind === "site").length;
  const testCount = entries.filter((entry) => entry.kind === "test").length;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Legendary Locations</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {entries.length} locations from the TTS mod · {siteCount} sites ·{" "}
        {testCount} tests
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {entries.map((entry) => {
          const location = entry.locations[0];
          return (
            <section key={entry.slug} className="flex flex-col gap-2">
              <Link
                href={`/legendary-locations/${entry.slug}`}
                className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900 hover:ring-2 hover:ring-zinc-400 transition"
                aria-label={`View ${entry.name}`}
              >
                <SpriteCell card={location.card} className="w-full" />
              </Link>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold">
                    <Link
                      href={`/legendary-locations/${entry.slug}`}
                      className="hover:underline"
                    >
                      {entry.name}
                    </Link>
                  </h2>
                  <span className="rounded border border-zinc-200 dark:border-zinc-800 px-1.5 py-0.5 text-xs uppercase text-zinc-500 dark:text-zinc-400">
                    {entry.kind}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {legendarySummary(location)}
                </p>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function legendarySummary(
  location: ReturnType<
    typeof getAllLegendaryLocations
  >[number]["locations"][number],
): string {
  const parts: string[] = [];
  if (location.treasureSetup?.deepTreasureCards) {
    parts.push(`${location.treasureSetup.deepTreasureCards} deep treasure`);
  }
  const namedTreasures = [
    ...(location.treasureSetup?.namedTreasures ?? []),
    ...(location.rewards?.namedTreasures ?? []),
  ];
  if (namedTreasures.length > 0) {
    parts.push(namedTreasures.map((treasure) => treasure.name).join(", "));
  }
  if (location.monsterChips?.length) {
    parts.push(location.monsterChips.map((chip) => chip.name).join(", "));
  }
  return parts.join(" · ") || "Site token linked";
}
