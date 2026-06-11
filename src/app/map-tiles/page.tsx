import Link from "next/link";
import { MapTileViewer, type MapTile } from "@/components/MapTileViewer";
import tiles from "../../../data/tts/map-tiles.json";

export default function MapTilesPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-8">Map Tiles</h1>
      <MapTileViewer tiles={tiles as MapTile[]} />
    </main>
  );
}
