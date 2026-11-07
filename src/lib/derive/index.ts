import type { Section } from "../rulebooks";
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
  return sortSections(picked, spec.sortBy ?? "title");
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
