import { promises as fs } from "node:fs";
import path from "node:path";
import { extractMapTiles } from "../src/lib/tts";

const SOURCE_FILE = path.join(process.cwd(), "sources", "dd_all_exp.json");
const OUT_DIR = path.join(process.cwd(), "data", "tts");
const OUT_FILE = path.join(OUT_DIR, "map-tiles.json");

async function main(): Promise<void> {
  const save = JSON.parse(await fs.readFile(SOURCE_FILE, "utf-8")) as unknown;
  const mapTiles = extractMapTiles(save);

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_FILE, `${JSON.stringify(mapTiles, null, 2)}\n`);

  const parentCounts = countBy(mapTiles, (tile) => tile.terrain);
  console.log(`map-tiles.json: ${mapTiles.length} map tiles`);
  console.log(formatCounts(parentCounts));
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

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
