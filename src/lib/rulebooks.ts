import { readdirSync, readFileSync, promises as fs } from "node:fs";
import path from "node:path";

export type SectionLevel = 1 | 2 | 3 | 4 | 5;

export type SectionLocation = {
  /** 1-based page number in the source PDF. */
  page: number;
  column: "left" | "right";
  section: "top" | "middle" | "bottom";
};

export type Section = {
  /** Hierarchical id like "2.1.0.3"; digit count equals `level`. */
  id: string;
  /** Doc slug this section was extracted from (e.g. "core", "eastern-reaches"). */
  source: string;
  level: SectionLevel;
  title: string;
  /** Approximate heading position in the source PDF. */
  location?: SectionLocation;
  /** Optional section icon extracted from left-floating PDF art. */
  icon?: string;
  /** Markdown: **bold**, *italic*, `- ` bullets, `![](/images/<hash>.<ext>)` */
  content: string;
  /** Free-form labels added by transform rules (e.g. "classAdvantage"). */
  tags?: string[];
};

export type Rulebook = {
  slug: string;
  title: string;
  fileName: string;
  /** Version string from the source PDF (e.g. "1.2"); empty if unknown. */
  version: string;
};

/** On-disk shape of a rulebook JSON file. */
export type RulebookFile = {
  version: string;
  content: Section[];
};

const DATA_DIR = path.join(process.cwd(), "data", "transformed-pdf");

/**
 * Display-title overrides per slug. Slugs not listed here fall back to a
 * title-cased version of the slug (e.g. "eastern-reaches" → "Eastern Reaches").
 * Add an override when the auto-derived title doesn't read well.
 */
const TITLE_OVERRIDES: Record<string, string> = {
  core: "Core Rulebook",
  "natives-and-legends": "Natives & Legends",
};

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Build the rulebook registry by reading every transformed PDF JSON file and
 * pulling the `source` slug from each. The Python extractor is the single source
 * of truth for slugs; this file only adds display titles on top.
 */
function discoverRulebooks(): Rulebook[] {
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  return files
    .map((fileName): Rulebook => {
      const text = readFileSync(path.join(DATA_DIR, fileName), "utf-8");
      const data = JSON.parse(text) as RulebookFile;
      if (!Array.isArray(data.content) || data.content.length === 0) {
        throw new Error(
          `Empty or malformed data file: ${fileName}; re-run \`npm run extract\`.`,
        );
      }
      const slug = data.content[0].source;
      if (typeof slug !== "string" || !slug) {
        throw new Error(
          `Missing 'source' in ${fileName}; re-run \`npm run extract\`.`,
        );
      }
      const title = TITLE_OVERRIDES[slug] ?? titleCase(slug);
      return { slug, title, fileName, version: data.version ?? "" };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export const RULEBOOKS: Rulebook[] = discoverRulebooks();

export function findRulebook(slug: string): Rulebook | undefined {
  return RULEBOOKS.find((book) => book.slug === slug);
}

export async function loadSections(book: Rulebook): Promise<Section[]> {
  const file = path.join(DATA_DIR, book.fileName);
  const raw = await fs.readFile(file, "utf-8");
  const parsed = JSON.parse(raw) as RulebookFile;
  return parsed.content;
}
