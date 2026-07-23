import type { TerrainPackEntry } from "@/lib/tts/lookup";

export function terrainPackSummary(pack: TerrainPackEntry): string {
  return [
    countLabel(pack.boards.length, "board"),
    countLabel(pack.civilisationTokens.length, "civ token"),
    countLabel(pack.wildernessTokens.length, "wilderness token"),
    countLabel(pack.terrainTreasures.length, "terrain treasure"),
    countLabel(pack.uniqueMissions.length, "mission"),
    countLabel(pack.civLocations.length, "civ location"),
    countLabel(
      pack.uniqueNatives.length + pack.uniqueMonsters.length,
      pack.slug === "neutral" ? "native/monster" : "unique native/monster",
    ),
    countLabel(pack.clearingTypes.length, "clearing type"),
    countLabel(pack.sites.length, "site"),
    countLabel(pack.mapTiles.length, "map tile"),
  ]
    .filter(Boolean)
    .join(" · ");
}

function countLabel(count: number, label: string): string | null {
  if (count === 0) return null;

  return `${count} ${label}${count === 1 ? "" : "s"}`;
}
