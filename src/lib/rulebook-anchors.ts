import type { Section } from "./rulebooks";
import { normalizeTitle } from "./tts";

type SectionAnchorSource = Pick<Section, "id" | "source">;

export function sectionAnchorIdFor(section: SectionAnchorSource): string {
  return `${section.source}-${section.id}`;
}

export function sectionContentAnchorIdFor(
  section: SectionAnchorSource,
  anchor: string,
): string {
  return `${sectionAnchorIdFor(section)}--${anchorSlugFor(anchor)}`;
}

export function anchorSlugFor(anchor: string): string {
  return normalizeTitle(anchor)
    .replace(/[.:]+$/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function markdownSliceForAnchor(
  markdown: string,
  anchor: string,
): string | undefined {
  const blocks = markdown.trim().split(/\n{2,}/);
  const start = blocks.findIndex((block) =>
    markdownBlockMatchesAnchor(block, anchor),
  );
  if (start === -1) return undefined;

  const nextAnchor = blocks.findIndex(
    (block, index) => index > start && Boolean(markdownBlockAnchorFor(block)),
  );
  const end = nextAnchor === -1 ? blocks.length : nextAnchor;
  return blocks.slice(start, end).join("\n\n");
}

export function markdownBlockAnchorFor(
  markdownBlock: string,
): string | undefined {
  return (
    pseudoHeadingAnchorFor(markdownBlock) ?? listItemAnchorFor(markdownBlock)
  );
}

export function markdownBlockMatchesAnchor(
  markdownBlock: string,
  anchor: string,
): boolean {
  const blockAnchor = markdownBlockAnchorFor(markdownBlock);
  if (blockAnchor && anchorSlugFor(blockAnchor) === anchorSlugFor(anchor)) {
    return true;
  }

  return normalizedMarkdownText(markdownBlock).startsWith(
    normalizedMarkdownText(anchor),
  );
}

function pseudoHeadingAnchorFor(markdownBlock: string): string | undefined {
  return markdownBlock
    .match(
      /^(?:[-*+]\s+)?(?:!\[[^\]]*\]\([^)]*\)\s+)*\*\*([^*\n:]+)(?::\*\*|\*\*:)/,
    )?.[1]
    ?.trim();
}

function listItemAnchorFor(markdownBlock: string): string | undefined {
  const listItem = markdownBlock.match(/^[-*+]\s+([\s\S]*)$/)?.[1];
  if (!listItem) return undefined;

  const boldLabel = listItem.match(
    /^(?:!\[[^\]]*\]\([^)]*\)\s+)*\*\*([^*\n:]+)(?::\*\*|\*\*:)/,
  )?.[1];
  if (boldLabel) return boldLabel.trim();

  const text = listItem
    .replace(/^!\[[^\]]*\]\([^)]*\)\s+/, "")
    .replace(/[*_`]/g, "")
    .trim();
  const label = text.match(
    /^(\p{Lu}[\p{L}'’]*(?:\s+\p{Lu}[\p{L}'’]*){0,3}):\s/u,
  )?.[1];
  if (label) return label.trim();

  const numberedPhrase = text.match(
    /^\d+\s+\p{Lu}[\p{L}'’]*(?:\s+\p{Lu}[\p{L}'’]*){0,3}/u,
  )?.[0];
  return numberedPhrase?.trim();
}

function normalizedMarkdownText(markdown: string): string {
  return normalizeTitle(
    markdown
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[[^\]]*\]\(([^)]*)\)/g, "$1")
      .replace(/[*_`#>]/g, ""),
  )
    .replace(/[.:]+$/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
