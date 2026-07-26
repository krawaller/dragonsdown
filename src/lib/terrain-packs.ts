import type { TerrainPackEntry } from "@/lib/tts/lookup";

export function terrainPackSummary(pack: TerrainPackEntry): string {
  return [
    countLabel(pack.boards.length, "board"),
    countLabel(pack.civilisationTokens.length, "civilization token"),
    countLabel(wildernessTokenCount(pack), "wilderness token"),
    countLabel(pack.terrainTreasures.length, "terrain treasure"),
    countLabel(pack.uniqueMissions.length, "mission"),
    countLabel(pack.civLocations.length, "civilization location"),
    countLabel(merchantCount(pack), "merchant"),
    countLabel(
      pack.uniqueNatives.length + pack.uniqueMonsters.length,
      pack.slug === "neutral"
        ? "native/monster group"
        : "unique native/monster group",
    ),
    countLabel(
      pack.natives.length + pack.monsters.length,
      "native/monster group",
    ),
    countLabel(pack.clearingTypes.length, "clearing type"),
    countLabel(pack.sites.length, "treasure site"),
    countLabel(pack.mapTiles.length, "map tile"),
  ]
    .filter(Boolean)
    .join(" · ");
}

function wildernessTokenCount(pack: TerrainPackEntry): number {
  return pack.wildernessTokens.reduce((sum, entry) => {
    const token =
      entry.tokens.find((tokenImage) => tokenImage.terrain === pack.name) ??
      entry.tokens[0];
    const tokenCount = token.locations.reduce(
      (tokenSum, location) => tokenSum + location.count,
      0,
    );
    return sum + tokenCount;
  }, 0);
}

function merchantCount(pack: TerrainPackEntry): number {
  return new Set(pack.boards.flatMap((entry) => entry.board.merchants)).size;
}

function countLabel(count: number, label: string): string | null {
  if (count === 0) return null;

  return `${count} ${label}${count === 1 ? "" : "s"}`;
}
