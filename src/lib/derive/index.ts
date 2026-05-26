import type { Section } from "../rulebooks";
import {
  docMatchesTarget,
  selectMatchingIds,
  type Target,
} from "../doc-query";

/**
 * A "derived doc" is a virtual rulebook assembled by picking sections out of
 * the real rulebooks. The picker uses the same Target language as transforms,
 * so any selector available there (childrenOf, titleRegex, level, AND ...)
 * works here too.
 */
export type DerivedDoc = {
  slug: string;
  title: string;
  /** Selector applied across every rulebook. */
  pick: Target;
  /** How to order the result. Default is "title". */
  sortBy?: SortBy;
};

export type SortBy = "title" | "source" | "id";

/** A single rulebook's worth of input to the picker. */
export type RulebookInput = {
  slug: string;
  sections: Section[];
};

/**
 * Run a derived-doc spec against every rulebook and return the ordered list
 * of picked sections. Pure: no side effects.
 *
 * Sections are returned with all original fields intact — `id`, `source`,
 * `title`, `content`, `level`, and `tags`. Original ids are retained so the
 * renderer can compose `<source>-<id>` for unique anchors and link back to
 * the source rulebook.
 */
export function deriveDocument(
  spec: DerivedDoc,
  rulebooks: readonly RulebookInput[],
): Section[] {
  const picked: Section[] = [];
  for (const book of rulebooks) {
    if (!docMatchesTarget(spec.pick, book.slug)) continue;
    const ids = selectMatchingIds(spec.pick, book.sections);
    for (const s of book.sections) {
      if (ids.has(s.id)) picked.push(s);
    }
  }
  return sortSections(picked, spec.sortBy ?? "title");
}

function sortSections(sections: Section[], sortBy: SortBy): Section[] {
  const sorted = [...sections];
  switch (sortBy) {
    case "title":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "source":
      sorted.sort(
        (a, b) =>
          a.source.localeCompare(b.source) || a.title.localeCompare(b.title),
      );
      break;
    case "id":
      sorted.sort((a, b) => a.id.localeCompare(b.id));
      break;
  }
  return sorted;
}
