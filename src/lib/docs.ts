import { promises as fs } from "node:fs";
import path from "node:path";
import {
  RULEBOOKS,
  findRulebook,
  loadSections,
  type Rulebook,
  type Section,
} from "./rulebooks";
import { DERIVED_DOCS } from "./derive/docs";

/**
 * Anything routable in the app: real rulebooks plus derived (cross-cutting)
 * docs assembled by `npm run derive`.
 */
export type Doc =
  | { kind: "rulebook"; slug: string; title: string; rulebook: Rulebook }
  | { kind: "derived"; slug: string; title: string };

/**
 * Short label for a source slug, used as the prefix in derived-doc renderings
 * (e.g. "core:8.1", "eastern:2.1"). Auto-derives by taking the slug's first
 * hyphen-segment; override here if that's not what you want.
 */
const SHORT_NAME_OVERRIDES: Record<string, string> = {};

export function shortNameForSource(slug: string): string {
  return SHORT_NAME_OVERRIDES[slug] ?? slug.split("-")[0];
}

export const ALL_DOCS: Doc[] = [
  ...RULEBOOKS.map(
    (rulebook): Doc => ({
      kind: "rulebook",
      slug: rulebook.slug,
      title: rulebook.title,
      rulebook,
    }),
  ),
  ...DERIVED_DOCS.map(
    (d): Doc => ({ kind: "derived", slug: d.slug, title: d.title }),
  ),
];

export function findDoc(slug: string): Doc | undefined {
  const book = findRulebook(slug);
  if (book) {
    return { kind: "rulebook", slug, title: book.title, rulebook: book };
  }
  const derived = DERIVED_DOCS.find((d) => d.slug === slug);
  if (derived) {
    return { kind: "derived", slug, title: derived.title };
  }
  return undefined;
}

const DERIVED_DIR = path.join(process.cwd(), "data", "derived");

export async function loadDocSections(doc: Doc): Promise<Section[]> {
  if (doc.kind === "rulebook") {
    return loadSections(doc.rulebook);
  }
  const file = path.join(DERIVED_DIR, `${doc.slug}.json`);
  const raw = await fs.readFile(file, "utf-8");
  return JSON.parse(raw) as Section[];
}
