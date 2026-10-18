import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MapTileViewer } from "@/components/MapTileViewer";
import {
  getAllMapTileDetailSlugs,
  getMapTileDetail,
} from "@/lib/entities/map-tiles";

export function generateStaticParams() {
  return getAllMapTileDetailSlugs().map((slug) => ({ slug }));
}

export default async function MapTilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mapTile = await getMapTileDetail(slug);
  if (!mapTile) notFound();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/map-tiles" className="hover:underline">
          Map Tiles
        </Link>
      </div>
      <Suspense fallback={null}>
        <MapTileViewer
          tiles={[mapTile.tile]}
          civLocations={mapTile.civLocations}
          monsterGroups={mapTile.monsterGroups}
          missions={mapTile.missions}
          mapTileConnections={mapTile.mapTileConnections}
          magicIcons={mapTile.magicIcons}
          terrainPack={mapTile.terrainPack}
          showTileControls={false}
          headingLevel="h1"
        />
      </Suspense>
    </main>
  );
}
