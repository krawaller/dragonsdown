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
