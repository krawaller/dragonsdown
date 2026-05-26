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
  extractSites,
  isSameCell,
  mergeTags,
  sameAncestry,
  type CardIndex,
  type ChipIndex,
  type SiteIndex,
} from "../src/lib/tts";

const SOURCES_DIR = path.join(process.cwd(), "sources");
const OUT_DIR = path.join(process.cwd(), "data", "tts");

/**
 * The Eastern Reaches TTS save is a strict superset of the
 * core_desolation_natives save (verified: every card and chip in the latter
 * appears in the former with identical URLs and copy counts), so we only
 * need to read this one file. Add to this list if a future save adds
 * content not present in `eastern.json`.
 */
const SOURCE_FILES = ["eastern.json"];

async function main(): Promise<void> {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const files = SOURCE_FILES;

  const cards: CardIndex = {};
  const chips: ChipIndex = {};
  const sites: SiteIndex = {};

  for (const file of files) {
    const stem = path.basename(file, ".json");
    const raw = await fs.readFile(path.join(SOURCES_DIR, file), "utf-8");
    const save = JSON.parse(raw) as unknown;

    const cardIndex = extractCards(save, stem);
    const chipIndex = extractChips(save, stem);
    const siteIndex = extractSites(save, stem);
    console.log(
      `${file}: ${countEntries(cardIndex)} cards / ${countEntries(chipIndex)} chips / ${countEntries(siteIndex)} sites ` +
        `(${Object.keys(cardIndex).length} card names, ${Object.keys(chipIndex).length} chip names, ${Object.keys(siteIndex).length} site names)`,
    );

    // Merge into combined indexes, de-duping by cell (cards) / image URL (chips).
    for (const [nick, items] of Object.entries(cardIndex)) {
      const bucket = (cards[nick] ??= []);
      for (const item of items) {
        const existing = bucket.find((c) => isSameCell(c, item));
        if (existing) {
          existing.tags = mergeTags(existing.tags, item.tags);
        } else {
          bucket.push(item);
        }
      }
    }
    // Sites: no dedup needed (each site appears once per save). Cross-source
    // collisions just append (so we can spot duplicate entries if any).
    for (const [name, items] of Object.entries(siteIndex)) {
      (sites[name] ??= []).push(...items);
    }
    // Chips dedup by URL pair across sources; per-ancestry counts are summed.
    for (const [name, items] of Object.entries(chipIndex)) {
      const bucket = (chips[name] ??= []);
      for (const item of items) {
        const existing = bucket.find(
          (c) =>
            c.imageURL === item.imageURL &&
            c.imageSecondaryURL === item.imageSecondaryURL,
        );
        if (existing) {
          for (const loc of item.locations) {
            const match = existing.locations.find((l) =>
              sameAncestry(l.ancestry, loc.ancestry),
            );
            if (match) match.count += loc.count;
            else existing.locations.push({ ...loc });
          }
        } else {
          bucket.push({
            ...item,
            locations: item.locations.map((l) => ({ ...l })),
          });
        }
      }
    }
  }

  await writeSorted(path.join(OUT_DIR, "cards.json"), cards);
  await writeSorted(path.join(OUT_DIR, "chips.json"), chips);
  await writeSorted(path.join(OUT_DIR, "sites.json"), sites);
  console.log(
    `→ cards.json: ${Object.keys(cards).length} names, ${countEntries(cards)} cards total`,
  );
  console.log(
    `→ chips.json: ${Object.keys(chips).length} names, ${countEntries(chips)} chips total`,
  );
  console.log(
    `→ sites.json: ${Object.keys(sites).length} names, ${countEntries(sites)} sites total`,
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
