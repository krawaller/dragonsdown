/**
 * Apply transform.ts rules to parsed PDF JSON, writing transformed JSON.
 *
 * Run after `scripts/extract.py`. The input files in `data/parsed-pdf` are left
 * untouched; transformed files are written to `data/transformed-pdf`.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { TRANSFORMS } from "../src/lib/transform/rules";
import { applyTransforms } from "../src/lib/transform";
import { type RulebookFile, type Section } from "../src/lib/rulebooks";

const PARSED_DIR = path.join(process.cwd(), "data", "parsed-pdf");
const TRANSFORMED_DIR = path.join(process.cwd(), "data", "transformed-pdf");

async function main(): Promise<void> {
  await fs.mkdir(TRANSFORMED_DIR, { recursive: true });
  const fileNames = (await fs.readdir(PARSED_DIR))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  for (const fileName of fileNames) {
    const file = path.join(PARSED_DIR, fileName);
    const parsed = JSON.parse(await fs.readFile(file, "utf-8")) as RulebookFile;
    const before = parsed.content;
    const slug = before[0]?.source;
    if (!slug) throw new Error(`Missing section source in ${fileName}`);
    const after = applyTransforms(before, TRANSFORMS, slug);
    const payload: RulebookFile = { version: parsed.version, content: after };
    await fs.writeFile(
      path.join(TRANSFORMED_DIR, fileName),
      JSON.stringify(payload, null, 2),
    );
    const changed = countChangedSections(before, after);
    console.log(`${fileName}: ${after.length} sections (${changed} touched)`);
  }
}

function countChangedSections(before: Section[], after: Section[]): number {
  let n = 0;
  for (let i = 0; i < before.length; i++) {
    if (JSON.stringify(before[i]) !== JSON.stringify(after[i])) n++;
  }
  return n;
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
