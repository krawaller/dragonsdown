import Link from "next/link";
import { Suspense } from "react";
import {
  MapTileViewer,
  type MapTile,
  type MapTileCivLocation,
} from "@/components/MapTileViewer";
import { getAllCivLocations } from "@/lib/tts/lookup";
import tiles from "../../../data/tts/map-tiles.json";

export default function MapTilesPage() {
  const civLocations: MapTileCivLocation[] = getAllCivLocations().map(
    ({ name, slug, location }) => ({
      name,
      slug,
      imageUrl: location.imageURL,
    }),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-8">Map Tiles</h1>
      <Suspense fallback={null}>
        <MapTileViewer tiles={tiles as MapTile[]} civLocations={civLocations} />
      </Suspense>
    </main>
  );
}
