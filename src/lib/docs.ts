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
import { PLAYER_AIDS } from "./derive/player-aids";

/**
 * Anything routable in the app: real rulebooks plus derived (cross-cutting)
 * docs and player aids assembled by `npm run derive`.
 */
export type Doc =
  | { kind: "rulebook"; slug: string; title: string; rulebook: Rulebook }
  | { kind: "derived"; slug: string; title: string }
  | { kind: "playerAid"; slug: string; title: string; description: string };

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
  ...PLAYER_AIDS.map(
    (aid): Doc => ({
      kind: "playerAid",
      slug: aid.slug,
      title: aid.title,
      description: aid.description,
    }),
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
  const aid = PLAYER_AIDS.find((a) => a.slug === slug);
  if (aid) {
    return {
      kind: "playerAid",
      slug,
      title: aid.title,
      description: aid.description,
    };
  }
  return undefined;
}

const DERIVED_DIR = path.join(process.cwd(), "data", "derived");
const PLAYER_AIDS_DIR = path.join(DERIVED_DIR, "player-aids");

export async function loadDocSections(doc: Doc): Promise<Section[]> {
  if (doc.kind === "rulebook") {
    return loadSections(doc.rulebook);
  }
  const dir = doc.kind === "playerAid" ? PLAYER_AIDS_DIR : DERIVED_DIR;
  const file = path.join(dir, `${doc.slug}.json`);
  const raw = await fs.readFile(file, "utf-8");
  return JSON.parse(raw) as Section[];
}
