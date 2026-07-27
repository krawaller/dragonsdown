import { slugify } from "@/lib/slug";
import clearingTypeTiles from "../../data/clearing-types.json";

export const CLEARING_TYPES = [
  { id: "plains", label: "Plains" },
  { id: "caves", label: "Caves" },
  { id: "mountains", label: "Mountains" },
  { id: "woods", label: "Woods" },
  { id: "swamps", label: "Swamps" },
  { id: "river", label: "River" },
  { id: "desert", label: "Desert" },
] as const;

export type ClearingTypeId = (typeof CLEARING_TYPES)[number]["id"];
export type MapTileSide = "front" | "back";

export type ClearingTypeClearing = {
  x: number;
  y: number;
  type: [ClearingTypeId, ClearingTypeId];
};

export type ClearingTypeTile = {
  name: string;
  terrain: string;
  clearings: ClearingTypeClearing[];
};

export type ClearingTypeOccurrence = {
  tileName: string;
  terrain: string;
  side: MapTileSide;
  count: number;
  href: string;
};

export type ClearingTypeEntry = {
  id: ClearingTypeId;
  slug: string;
  label: string;
  icon: string;
  occurrences: ClearingTypeOccurrence[];
  tileCount: number;
  clearingCount: number;
};

const CLEARING_TYPE_LABELS = new Map(
  CLEARING_TYPES.map((type) => [type.id, type.label]),
);

export function getAllClearingTypes(): ClearingTypeEntry[] {
  return CLEARING_TYPES.map((type) => clearingTypeEntry(type.id));
}

export function getClearingTypeBySlug(
  slug: string,
): ClearingTypeEntry | undefined {
  return getAllClearingTypes().find((type) => type.slug === slug);
}

export function getClearingTypeLabel(type: ClearingTypeId): string {
  return CLEARING_TYPE_LABELS.get(type) ?? type;
}

export function getClearingTypeIcon(type: ClearingTypeId): string {
  return CLEARING_TYPE_ICONS[type];
}

export function getClearingTypeTiles(): ClearingTypeTile[] {
  return clearingTypeTiles as ClearingTypeTile[];
}

export function mapTileHref({
  tileName,
}: {
  terrain: string;
  tileName: string;
  side: MapTileSide;
}): string {
  return `/map-tiles/${slugify(tileName)}`;
}

function clearingTypeEntry(type: ClearingTypeId): ClearingTypeEntry {
  const occurrences = getClearingTypeTiles()
    .flatMap((tile) => {
      const frontCount = tile.clearings.filter(
        (clearing) => clearing.type[0] === type,
      ).length;
      const backCount = tile.clearings.filter(
        (clearing) => clearing.type[1] === type,
      ).length;
      return [
        occurrenceFor(tile, type, "front", frontCount),
        occurrenceFor(tile, type, "back", backCount),
      ].filter((occurrence) => occurrence.count > 0);
    })
    .sort(compareOccurrences);

  return {
    id: type,
    slug: slugify(type),
    label: getClearingTypeLabel(type),
    icon: getClearingTypeIcon(type),
    occurrences,
    tileCount: new Set(occurrences.map((occurrence) => occurrence.tileName))
      .size,
    clearingCount: occurrences.reduce(
      (sum, occurrence) => sum + occurrence.count,
      0,
    ),
  };
}

const CLEARING_TYPE_ICONS: Record<ClearingTypeId, string> = {
  plains: "/images/terrain/plains.png",
  caves: "/images/terrain/cave.png",
  mountains: "/images/terrain/mountain.png",
  woods: "/images/terrain/woods.png",
  swamps: "/images/terrain/swamp.png",
  river: "/images/terrain/river.png",
  desert: "/images/terrain/desert.png",
};

function occurrenceFor(
  tile: ClearingTypeTile,
  type: ClearingTypeId,
  side: MapTileSide,
  count: number,
): ClearingTypeOccurrence {
  return {
    tileName: tile.name,
    terrain: tile.terrain,
    side,
    count,
    href: mapTileHref({ terrain: tile.terrain, tileName: tile.name, side }),
  };
}

function compareOccurrences(
  left: ClearingTypeOccurrence,
  right: ClearingTypeOccurrence,
): number {
  return (
    left.terrain.localeCompare(right.terrain) ||
    left.tileName.localeCompare(right.tileName) ||
    left.side.localeCompare(right.side)
  );
}
