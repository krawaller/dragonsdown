import { promises as fs } from "node:fs";
import path from "node:path";

const SOURCE_FILE = path.join(process.cwd(), "sources", "dd_all_exp.json");
const OUT_DIR = path.join(process.cwd(), "data", "crafted");
const OUT_FILE = path.join(OUT_DIR, "map-tiles.json");

type TTSObject = Record<string, unknown>;

type Ancestor = {
  name?: string;
  nickname?: string;
};

type MapTile = {
  name: string;
  terrain: string;
  imageUrl: string;
  imageSecondaryUrl: string;
  clearings: ClearingOffset[];
};

type ClearingOffset = {
  x: number;
  y: number;
};

async function main(): Promise<void> {
  const save = JSON.parse(await fs.readFile(SOURCE_FILE, "utf-8")) as unknown;
  const clearingOffsets = extractClearingOffsets(save);
  const mapTiles: MapTile[] = [];
  walk(save, [], clearingOffsets, mapTiles);

  mapTiles.sort(
    (a, b) =>
      a.terrain.localeCompare(b.terrain) || a.name.localeCompare(b.name),
  );

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_FILE, `${JSON.stringify(mapTiles, null, 2)}\n`);

  const parentCounts = countBy(mapTiles, (tile) => tile.terrain);
  console.log(`map-tiles.json: ${mapTiles.length} map tiles`);
  console.log(formatCounts(parentCounts));
}

function walk(
  obj: unknown,
  ancestors: Ancestor[],
  clearingOffsets: Map<string, ClearingOffset[]>,
  out: MapTile[],
): void {
  if (!isRecord(obj)) return;

  const mapTile = extractMapTile(obj, ancestors, clearingOffsets);
  if (mapTile) out.push(mapTile);

  const nextAncestors = [...ancestors, ancestorFor(obj)];
  const states = obj.ObjectStates;
  if (Array.isArray(states)) {
    for (const child of states) {
      walk(child, nextAncestors, clearingOffsets, out);
    }
  }
  const contained = obj.ContainedObjects;
  if (Array.isArray(contained)) {
    for (const child of contained) {
      walk(child, nextAncestors, clearingOffsets, out);
    }
  }
}

function extractMapTile(
  obj: TTSObject,
  ancestors: Ancestor[],
  clearingOffsets: Map<string, ClearingOffset[]>,
): MapTile | null {
  if (obj.Name !== "Custom_Tile") return null;

  const guid = text(obj.GUID);
  const clearings = clearingOffsets.get(guid);
  if (!clearings) return null;

  const customImage = obj.CustomImage;
  if (!isRecord(customImage)) return null;
  const customTile = customImage.CustomTile;
  if (!isRecord(customTile) || customTile.Type !== 1) return null;

  const parentBag = [...ancestors]
    .reverse()
    .find((ancestor) => ancestor.name === "Bag" && ancestor.nickname);
  if (!parentBag?.nickname) return null;

  const name = text(obj.Nickname);
  const imageUrl = text(customImage.ImageURL);
  const imageSecondaryUrl = text(customImage.ImageSecondaryURL);
  if (!guid || !name || !imageUrl || !imageSecondaryUrl) return null;

  return {
    name,
    terrain: terrainFor(parentBag.nickname),
    imageUrl,
    imageSecondaryUrl,
    clearings,
  };
}

function extractClearingOffsets(root: unknown): Map<string, ClearingOffset[]> {
  if (!isRecord(root)) return new Map();
  const luaScript = text(root.LuaScript);
  const offsets = new Map<string, ClearingOffset[]>();
  const tableEntry = /\["([0-9a-f]{6})"\]\s*=\s*\{([\s\S]*?)\}\s*,?\s*--/g;
  const coordinate =
    /\{\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\}/g;

  let entry: RegExpExecArray | null;
  while ((entry = tableEntry.exec(luaScript))) {
    const [, guid, body] = entry;
    const clearings: ClearingOffset[] = [];
    let match: RegExpExecArray | null;
    while ((match = coordinate.exec(body))) {
      clearings.push({
        x: Number(match[1]),
        y: Number(match[3]),
      });
    }
    if (clearings.length > 0) offsets.set(guid, clearings);
  }

  return offsets;
}

function terrainFor(parentNickname: string): string {
  switch (parentNickname) {
    case "Cruel CAVES":
      return "Cruel Caves";
    case "Dreadful DESERTS":
      return "Dreadful Deserts";
    case "Malevolent MOUNTAINS":
      return "Malevolent Mountains";
    case "Perilous PLAINS":
      return "Perilous Plains";
    case "Riverlands Tiles":
    case "Ruthless RIVERLANDS":
    case "Headwaters Tile":
      return "Ruthless Riverlands";
    case "Sinister SWAMPS":
      return "Sinister Swamps";
    case "Wicked WOODS":
      return "Wicked Woods";
    default:
      return parentNickname;
  }
}

function ancestorFor(obj: TTSObject): Ancestor {
  return {
    name: text(obj.Name) || undefined,
    nickname: text(obj.Nickname) || undefined,
  };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function countBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

function formatCounts(counts: Map<string, number>): string {
  return [...counts]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => `  ${key}: ${count}`)
    .join("\n");
}

function isRecord(value: unknown): value is TTSObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
