import { readdirSync, readFileSync, promises as fs } from "node:fs";
import path from "node:path";

export type SectionLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type HeadingStyle =
  | "pdf-l1"
  | "pdf-l2"
  | "pdf-l3"
  | "pdf-l4"
  | "pdf-l5"
  | "pdf-body-bold-12"
  | "pdf-body-bold-11";

export type SectionLocation = {
  /** 1-based page number in the source PDF. */
  page: number;
  column: "left" | "right";
  section: "top" | "middle" | "bottom";
};

export type SectionMarkdownContentNode = {
  kind: "markdown";
  markdown: string;
};

export type SectionImageDisplay =
  | "block"
  | "float-left"
  | "float-left-companion"
  | "float-right"
  | "float-right-companion";

export type SectionImageContentNode = {
  kind: "image";
  src: string;
  display: SectionImageDisplay;
};

export type SectionContentNode =
  | SectionMarkdownContentNode
  | SectionImageContentNode;

export type Section = {
  /** Hierarchical id like "2.1.0.3"; digit count equals `level`. */
  id: string;
  /** Doc slug this section was extracted from (e.g. "core", "eastern-reaches"). */
  source: string;
  level: SectionLevel;
  title: string;
  /** Visual heading style from the source PDF; independent from hierarchy. */
  headingStyle?: HeadingStyle;
  /** Approximate heading position in the source PDF. */
  location?: SectionLocation;
  /** Optional section icon extracted from left-floating PDF art. */
  icon?: string;
  /** Optional section icons for headings with multiple left-floating images. */
  icons?: string[];
  /** Markdown: **bold**, *italic*, `- ` bullets, `![](/images/<hash>.<ext>)` */
  content: string;
  /** Structured content nodes derived from markdown for renderers. */
  contentNodes?: SectionContentNode[];
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
  return parsed.content.map(ensureContentNodes);
}

export function contentNodesForMarkdown(
  markdown: string,
): SectionContentNode[] {
  return markdown
    .trim()
    .split(/\n{2,}/)
    .flatMap(contentNodesForMarkdownBlock);
}

export function markdownFromContentNodes(nodes: SectionContentNode[]): string {
  return nodes.map(markdownForContentNode).filter(Boolean).join("\n\n");
}

export function sectionWithContentNodes(section: Section): Section {
  return { ...section, contentNodes: contentNodesForMarkdown(section.content) };
}

function ensureContentNodes(section: Section): Section {
  return section.contentNodes ? section : sectionWithContentNodes(section);
}

function contentNodesForMarkdownBlock(block: string): SectionContentNode[] {
  const nodes: SectionContentNode[] = [];
  let remaining = block.trimStart();

  while (true) {
    const match = remaining.match(
      /^([-*+]\s+)?!\[(float-left|float-left-companion|float-right|float-right-companion|)\]\(([^)]*)\)\s*/,
    );
    if (!match) break;

    const bullet = match[1] ?? "";
    const display = imageDisplayForAlt(match[2]);
    nodes.push({ kind: "image", src: match[3], display });
    remaining = `${bullet}${remaining.slice(match[0].length).trimStart()}`;
  }

  if (remaining) nodes.push({ kind: "markdown", markdown: remaining });
  return nodes;
}

function imageDisplayForAlt(alt: string): SectionImageDisplay {
  if (
    alt === "float-left" ||
    alt === "float-left-companion" ||
    alt === "float-right" ||
    alt === "float-right-companion"
  ) {
    return alt;
  }
  return "block";
}

function markdownForContentNode(node: SectionContentNode): string {
  if (node.kind === "markdown") return node.markdown;
  return `![${imageAltForDisplay(node.display)}](${node.src})`;
}

function imageAltForDisplay(display: SectionImageDisplay): string {
  return display === "block" ? "" : display;
}
