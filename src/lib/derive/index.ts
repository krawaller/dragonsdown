import type { Section, SectionLevel } from "../rulebooks";
import { docMatchesTarget, selectMatchingIds, type Target } from "../doc-query";

/**
 * A "derived doc" is a virtual rulebook assembled by picking sections out of
 * the real rulebooks. There are two shapes:
 *
 * - Flat: one `pick` selector, results sorted into a single ordered list.
 * - Grouped: a sequence of `groups`, each with a `header` (a single section
 *   used as the group's heading) and `items` (the entries listed under it).
 *
 * Both shapes share the same Target language as transforms.
 */
export type DerivedDoc = FlatDerivedDoc | GroupedDerivedDoc;

type BaseDerivedDoc = {
  slug: string;
  title: string;
  /** How to order the result (within each group, for grouped docs). Default "title". */
  sortBy?: SortBy;
  /**
   * Whether the leaves of this doc are expected to correspond to TTS cards.
   * Defaults to true; set to false for rule lists or other non-card content
   * so audits like `missing-cards` skip it.
   */
  linksToCards?: boolean;
};

export type FlatDerivedDoc = BaseDerivedDoc & {
  /** Selector applied across every rulebook. */
  pick: Target;
  /** Include each picked section's descendants beneath it in document order. */
  withChildren?: boolean;
};

export type GroupedDerivedDoc = BaseDerivedDoc & {
  groups: DerivedGroup[];
};

export type DerivedGroup = {
  /** Selects one section across all rulebooks to act as the group's header. */
  header: Target;
  /** Selects items to list under that header. */
  items: Target;
};

export type SortBy = "title" | "source" | "id";

/**
 * A "player aid" is a themed rules compilation: hand-picked sections from
 * across the rulebooks, colocated under synthetic group headers. Unlike
 * derived docs, the order is authored (specs list picks in reading order,
 * nothing is sorted) and group headers are not sections from the rulebooks.
 */
export type PlayerAidSpec = {
  slug: string;
  title: string;
  /** Short blurb shown under the title on listing and doc pages. */
  description: string;
  groups: PlayerAidGroup[];
};

export type PlayerAidGroup = {
  /** Synthetic heading, emitted as a level-1 section. */
  title: string;
  /** Picks in authored order; each pick's matches keep rulebook order. */
  items: PlayerAidItem[];
};

export type PlayerAidItem = {
  /** Selector applied across every rulebook. */
  pick: Target;
  /** Also include every nested subsection of each match, in document order. */
  withChildren?: boolean;
};

/**
 * Tag put on synthetic group-header sections so renderers can treat them
 * differently (no source link, no id badge, no card lookup).
 */
export const SYNTHETIC_HEADER_TAG = "syntheticHeader";

export type RulebookInput = {
  slug: string;
  sections: Section[];
};

export type TreasureDeckIndex = Record<
  string,
  readonly { deck: "treasure" | "deep-treasure" | "legendary" }[]
>;

export function classifyTreasureSections(
  rulebooks: readonly RulebookInput[],
  treasures: TreasureDeckIndex,
): RulebookInput[] {
  const titleKey = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const decksByTitle = new Map<string, Set<string>>();
  for (const [title, cards] of Object.entries(treasures)) {
    const key = titleKey(title);
    const decks = decksByTitle.get(key) ?? new Set<string>();
    for (const card of cards) decks.add(card.deck);
    decksByTitle.set(key, decks);
  }

  return rulebooks.map((book) => ({
    ...book,
    sections: book.sections.map((section) => {
      if (
        !section.tags?.some(
          (tag) => tag === "treasure" || tag === "deepTreasure",
        )
      )
        return section;
      const decks = decksByTitle.get(titleKey(section.title));
      if (!decks?.size) return section;

      const tags = section.tags.filter(
        (tag) => tag !== "treasure" && tag !== "deepTreasure",
      );
      if (decks.has("treasure")) tags.push("treasure");
      if (decks.has("deep-treasure") || decks.has("legendary"))
        tags.push("deepTreasure");
      return { ...section, tags };
    }),
  }));
}

/**
 * Run a derived-doc spec against every rulebook and return the resulting
 * section list. Pure: no side effects.
 *
 * For grouped docs, headers are normalized to level 1 and items to level 2,
 * regardless of their source levels, so they render at consistent sizes.
 * Original `source`, `id`, `title`, `content`, and `tags` are preserved.
 */
export function deriveDocument(
  spec: DerivedDoc,
  rulebooks: readonly RulebookInput[],
): Section[] {
  if ("groups" in spec) return deriveGrouped(spec, rulebooks);
  return deriveFlat(spec, rulebooks);
}

function deriveFlat(
  spec: FlatDerivedDoc,
  rulebooks: readonly RulebookInput[],
): Section[] {
  const picked = selectAcrossRulebooks(spec.pick, rulebooks);
  const sorted = sortSections(picked, spec.sortBy ?? "title");
  if (!spec.withChildren) return sorted;
  return sorted.flatMap((section) => [
    section,
    ...childrenInDocumentOrder(
      section,
      rulebooks.find((book) => book.slug === section.source),
    ),
  ]);
}

function deriveGrouped(
  spec: GroupedDerivedDoc,
  rulebooks: readonly RulebookInput[],
): Section[] {
  const out: Section[] = [];
  for (const group of spec.groups) {
    const headers = selectAcrossRulebooks(group.header, rulebooks);
    if (headers.length === 0) continue;
    out.push({ ...headers[0], level: 1 });
    const items = sortSections(
      selectAcrossRulebooks(group.items, rulebooks),
      spec.sortBy ?? "title",
    );
    for (const item of items) {
      out.push({ ...item, level: 2 });
    }
  }
  return out;
}

/**
 * Build a player aid's section list. Pure: no side effects.
 *
 * Each group becomes a synthetic level-1 header (tagged SYNTHETIC_HEADER_TAG)
 * followed by its picks in authored order. Picked sections are normalized to
 * level 2; with `withChildren`, nested subsections follow in document order
 * with their depth relative to the match preserved. A section appearing in
 * multiple picks is kept only at its first occurrence.
 */
export function buildPlayerAid(
  spec: PlayerAidSpec,
  rulebooks: readonly RulebookInput[],
): Section[] {
  const out: Section[] = [];
  const seen = new Set<string>();

  const push = (section: Section, level: number) => {
    const key = `${section.source}/${section.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ...section, level: clampLevel(level) });
  };

  spec.groups.forEach((group, index) => {
    out.push({
      id: `${index + 1}`,
      source: spec.slug,
      level: 1,
      title: group.title,
      content: "",
      tags: [SYNTHETIC_HEADER_TAG],
    });
    for (const item of group.items) {
      for (const match of selectAcrossRulebooks(item.pick, rulebooks)) {
        push(match, 2);
        if (!item.withChildren) continue;
        const book = rulebooks.find((b) => b.slug === match.source);
        for (const child of childrenInDocumentOrder(match, book)) {
          push(child, 2 + child.level - match.level);
        }
      }
    }
  });
  return out;
}

function childrenInDocumentOrder(
  parent: Section,
  book: RulebookInput | undefined,
): Section[] {
  if (!book) return [];
  const prefix = parent.id + ".";
  return book.sections.filter((s) => s.id.startsWith(prefix));
}

function clampLevel(level: number): SectionLevel {
  return Math.min(8, Math.max(1, level)) as SectionLevel;
}

function selectAcrossRulebooks(
  target: Target,
  rulebooks: readonly RulebookInput[],
): Section[] {
  const out: Section[] = [];
  for (const book of rulebooks) {
    if (!docMatchesTarget(target, book.slug)) continue;
    const ids = selectMatchingIds(target, book.sections);
    for (const s of book.sections) {
      if (ids.has(s.id)) out.push(s);
    }
  }
  return out;
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
