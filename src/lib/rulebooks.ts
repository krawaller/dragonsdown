import { promises as fs } from "node:fs";
import path from "node:path";

export type SectionLevel = 1 | 2 | 3 | 4;

export type Section = {
  /** Hierarchical id like "2.1.0.3"; digit count equals `level`. */
  id: string;
  level: SectionLevel;
  title: string;
  /** Markdown: **bold**, *italic*, `- ` bullets, `![](/images/<hash>.<ext>)` */
  content: string;
  /** Free-form labels added by transform rules (e.g. "classAdvantage"). */
  tags?: string[];
};

export type Rulebook = {
  slug: string;
  title: string;
  fileName: string;
};

export const RULEBOOKS: Rulebook[] = [
  { slug: "core", title: "Core Rulebook", fileName: "core_1.2.json" },
  { slug: "desolation", title: "Desolation", fileName: "desolation_1.2.json" },
  { slug: "eastern-reaches", title: "Eastern Reaches", fileName: "eastern_reaches_1.0.json" },
  { slug: "natives-and-legends", title: "Natives & Legends", fileName: "natives_and_legends_1.2.json" },
];

export function findRulebook(slug: string): Rulebook | undefined {
  return RULEBOOKS.find((book) => book.slug === slug);
}

export async function loadSections(book: Rulebook): Promise<Section[]> {
  const file = path.join(process.cwd(), "data", book.fileName);
  const raw = await fs.readFile(file, "utf-8");
  return JSON.parse(raw) as Section[];
}
