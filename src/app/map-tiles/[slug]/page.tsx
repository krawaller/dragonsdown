import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MapTileViewer } from "@/components/MapTileViewer";
import { PageHeader } from "@/components/PageHeader";
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
      <PageHeader
        title={mapTile.tile.name}
        subtitle={mapTile.subtitle}
        categories={mapTile.categories}
      />
      <Suspense fallback={null}>
        <MapTileViewer
          tiles={[mapTile.tile]}
          civLocations={mapTile.civLocations}
          monsterGroups={mapTile.monsterGroups}
          missions={mapTile.missions}
          mapTileConnections={mapTile.mapTileConnections}
          magicIcons={mapTile.magicIcons}
          terrainPack={mapTile.terrainPack}
          showHeader={false}
          showTileControls={false}
        />
      </Suspense>
    </main>
  );
}
