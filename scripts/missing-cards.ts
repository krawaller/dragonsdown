/**
 * Report leaf entries in derived docs whose title has no matching TTS card.
 *
 * Run after `npm run derive`. Group headers (level 1 in grouped derived docs)
 * are skipped — they're container labels like "Black Spells", not cards.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Section } from "../src/lib/rulebooks";
import { DERIVED_DOCS } from "../src/lib/derive/docs";
import { findCards } from "../src/lib/tts/lookup";

const DERIVED_DIR = path.join(process.cwd(), "data", "derived");

async function main(): Promise<void> {
  let totalChecked = 0;
  let totalMissing = 0;

  for (const doc of DERIVED_DOCS) {
    if (doc.linksToCards === false) {
      console.log(`${doc.slug}: skipped (linksToCards=false)`);
      continue;
    }
    const file = path.join(DERIVED_DIR, `${doc.slug}.json`);
    let sections: Section[];
    try {
      sections = JSON.parse(await fs.readFile(file, "utf-8")) as Section[];
    } catch {
      console.log(`${doc.slug}: data file missing — skipping`);
      continue;
    }
    const isGrouped = "groups" in doc;
    const leaves = sections.filter((s) => !(isGrouped && s.level === 1));
    const missing = leaves.filter((s) => findCards(s.title).length === 0);
    totalChecked += leaves.length;
    totalMissing += missing.length;

    if (missing.length === 0) {
      console.log(`${doc.slug}: ✓ all ${leaves.length} leaves matched`);
      continue;
    }
    console.log(
      `${doc.slug}: ${missing.length} of ${leaves.length} leaves unmatched`,
    );
    for (const s of missing) {
      console.log(`  [${s.source}] ${s.id.padEnd(10)} ${s.title}`);
    }
  }

  console.log();
  console.log(
    `Total: ${totalMissing} unmatched of ${totalChecked} checked across ${DERIVED_DOCS.length} derived docs`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
