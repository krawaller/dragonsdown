/**
 * Build derived docs from the transformed rulebook JSON in data/.
 *
 * Run after `npm run transform`. The rulebooks must already be present and
 * transformed; this script doesn't trigger extract/transform itself.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { RULEBOOKS, loadSections } from "../src/lib/rulebooks";
import { deriveDocument } from "../src/lib/derive";
import { DERIVED_DOCS } from "../src/lib/derive/docs";

const OUT_DIR = path.join(process.cwd(), "data", "derived");

async function main(): Promise<void> {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const rulebookInputs = await Promise.all(
    RULEBOOKS.map(async (book) => ({
      slug: book.slug,
      sections: await loadSections(book),
    })),
  );

  for (const spec of DERIVED_DOCS) {
    const sections = deriveDocument(spec, rulebookInputs);
    const outPath = path.join(OUT_DIR, `${spec.slug}.json`);
    await fs.writeFile(outPath, JSON.stringify(sections, null, 2));
    const bySource = countBy(sections, (s) => s.source);
    console.log(
      `${spec.slug}.json: ${sections.length} sections (${formatCounts(bySource)})`,
    );
  }
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
  return Array.from(counts)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
