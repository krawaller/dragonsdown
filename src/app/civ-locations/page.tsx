import Link from "next/link";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import { CivLocationGrid } from "@/components/CivLocationGrid";
import type { MapTile } from "@/components/MapTileViewer";
import {
  getAllCivLocations,
  getWildernessTokenBySlug,
  type CivLocationEntry,
} from "@/lib/tts/lookup";
import mapTiles from "../../../data/extracted-from-tts/map-tiles.json";

export default function CivLocationsPage() {
  const entries = getAllCivLocations();
  const mapTileCivLocationNames = new Set(
    (mapTiles as MapTile[])
      .filter((tile) => tile.clearings.length === 4)
      .map((tile) => tile.name),
  );
  const viaMapTile = entries.filter((entry) =>
    mapTileCivLocationNames.has(entry.name),
  );
  const viaWildernessToken = entries.filter((entry) =>
    getWildernessTokenBySlug(entry.slug),
  );

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
        {entries.length} civilization locations from the TTS mod
      </p>
      <div className="space-y-6">
        <CivLocationBox title="Via map tile" entries={viaMapTile} />
        <CivLocationBox
          title="Via wilderness token"
          entries={viaWildernessToken}
        />
      </div>
    </main>
  );
}

function CivLocationBox({
  title,
  entries,
}: {
  title: string;
  entries: CivLocationEntry[];
}) {
  return (
    <CollapsibleBox
      title={title}
      count={entries.length}
      countLabel={`${entries.length} location${entries.length === 1 ? "" : "s"}`}
    >
      <CivLocationGrid entries={entries} />
    </CollapsibleBox>
  );
}
