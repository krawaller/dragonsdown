/**
 * Apply transform.ts rules to the extracted JSON in data/, in place.
 *
 * Run after `npm run extract`. Idempotent: re-running on already-transformed
 * data should produce the same result (so long as individual rules are
 * idempotent, which they should be by design).
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { TRANSFORMS } from "../transform";
import { applyTransforms } from "../src/lib/transform";
import { RULEBOOKS, type Section } from "../src/lib/rulebooks";

const DATA_DIR = path.join(process.cwd(), "data");

async function main(): Promise<void> {
  for (const book of RULEBOOKS) {
    const file = path.join(DATA_DIR, book.fileName);
    const before = JSON.parse(await fs.readFile(file, "utf-8")) as Section[];
    const after = applyTransforms(before, TRANSFORMS, book.slug);
    const out = JSON.stringify(after, null, 2);
    await fs.writeFile(file, out);
    const changed = countChangedSections(before, after);
    console.log(`${book.fileName}: ${after.length} sections (${changed} touched)`);
  }
}

function countChangedSections(before: Section[], after: Section[]): number {
  let n = 0;
  for (let i = 0; i < before.length; i++) {
    if (before[i].content !== after[i].content) n++;
  }
  return n;
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
