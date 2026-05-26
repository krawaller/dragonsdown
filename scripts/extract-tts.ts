/**
 * Build the TTS card index and chip index from sources/*.json into
 * data/tts/cards.json and data/tts/chips.json.
 *
 * Each source file is a TTS save export. The source identifier (used in the
 * output) is the file's stem (e.g. "eastern", "core_desolation_natives").
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  extractCards,
  extractChips,
  type CardIndex,
  type ChipIndex,
} from "../src/lib/tts";

const SOURCES_DIR = path.join(process.cwd(), "sources");
const OUT_DIR = path.join(process.cwd(), "data", "tts");

async function main(): Promise<void> {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const files = (await fs.readdir(SOURCES_DIR))
    .filter((f) => f.endsWith(".json"))
    .sort();

  const cards: CardIndex = {};
  const chips: ChipIndex = {};

  for (const file of files) {
    const stem = path.basename(file, ".json");
    const raw = await fs.readFile(path.join(SOURCES_DIR, file), "utf-8");
    const save = JSON.parse(raw) as unknown;

    const cardIndex = extractCards(save, stem);
    const chipIndex = extractChips(save, stem);
    console.log(
      `${file}: ${countEntries(cardIndex)} cards / ${countEntries(chipIndex)} chips ` +
        `(${Object.keys(cardIndex).length} card names, ${Object.keys(chipIndex).length} chip names)`,
    );

    // Merge into combined indexes, de-duping by cell (cards) / image URL (chips).
    for (const [nick, items] of Object.entries(cardIndex)) {
      const bucket = (cards[nick] ??= []);
      for (const item of items) {
        if (
          !bucket.some(
            (c) =>
              c.faceURL === item.faceURL &&
              c.row === item.row &&
              c.col === item.col,
          )
        ) {
          bucket.push(item);
        }
      }
    }
    for (const [name, items] of Object.entries(chipIndex)) {
      const bucket = (chips[name] ??= []);
      for (const item of items) {
        if (
          !bucket.some(
            (c) =>
              c.imageURL === item.imageURL &&
              c.imageSecondaryURL === item.imageSecondaryURL,
          )
        ) {
          bucket.push(item);
        }
      }
    }
  }

  await writeSorted(path.join(OUT_DIR, "cards.json"), cards);
  await writeSorted(path.join(OUT_DIR, "chips.json"), chips);
  console.log(
    `→ cards.json: ${Object.keys(cards).length} names, ${countEntries(cards)} cards total`,
  );
  console.log(
    `→ chips.json: ${Object.keys(chips).length} names, ${countEntries(chips)} chips total`,
  );
}

function countEntries<T>(index: Record<string, T[]>): number {
  return Object.values(index).reduce((n, arr) => n + arr.length, 0);
}

async function writeSorted(
  file: string,
  index: Record<string, unknown>,
): Promise<void> {
  const sorted = Object.fromEntries(
    Object.entries(index).sort(([a], [b]) => a.localeCompare(b)),
  );
  await fs.writeFile(file, JSON.stringify(sorted, null, 2));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
