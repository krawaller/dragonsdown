/**
 * Build the TTS card index from sources/*.json into data/tts/cards.json.
 *
 * Each source file is a TTS save export. The source identifier (used in the
 * output) is the file's stem (e.g. "eastern", "core_desolation_natives").
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { extractCards, type CardIndex } from "../src/lib/tts";

const SOURCES_DIR = path.join(process.cwd(), "sources");
const OUT_FILE = path.join(process.cwd(), "data", "tts", "cards.json");

async function main(): Promise<void> {
  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  const files = (await fs.readdir(SOURCES_DIR))
    .filter((f) => f.endsWith(".json"))
    .sort();

  const merged: CardIndex = {};
  let totalCards = 0;
  for (const file of files) {
    const stem = path.basename(file, ".json");
    const raw = await fs.readFile(path.join(SOURCES_DIR, file), "utf-8");
    const save = JSON.parse(raw) as unknown;
    const index = extractCards(save, stem);
    const cardCount = Object.values(index).reduce((n, arr) => n + arr.length, 0);
    totalCards += cardCount;
    console.log(`${file}: ${cardCount} cards under ${Object.keys(index).length} nicknames`);
    // Merge into combined index, de-duping by face cell (a card present in
    // multiple TTS saves with the same sheet position is a single logical card).
    for (const [nick, cards] of Object.entries(index)) {
      const bucket = (merged[nick] ??= []);
      for (const card of cards) {
        if (
          !bucket.some(
            (c) => c.faceURL === card.faceURL && c.row === card.row && c.col === card.col,
          )
        ) {
          bucket.push(card);
        }
      }
    }
  }
  // Sort keys for stable diffs
  const sorted = Object.fromEntries(
    Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)),
  );
  await fs.writeFile(OUT_FILE, JSON.stringify(sorted, null, 2));
  console.log(
    `→ ${OUT_FILE}: ${Object.keys(sorted).length} nicknames, ${totalCards} cards total`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
