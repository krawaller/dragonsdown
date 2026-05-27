import type { Section, SectionLevel } from "../rulebooks";

/**
 * A query that picks out documents and/or sections. Used by transform rules
 * to scope their effect, and by derived-doc pickers to select content across
 * rulebooks.
 *
 * Vocabulary:
 *   "ALL"                                  — every section in every doc
 *   { doc: "core" }                        — every section in one doc
 *   { doc: "core", id: "2.2.0.12" }        — one specific entry
 *   { titleRegex: "Class Advantages" }     — sections whose title matches
 *   { contentRegex: "^Epic treasure\\." }  — sections whose markdown content matches
 *   { level: 2 } / { level: [2, 4] }       — sections at given level(s)
 *   { tags: ["spell", "blackMagic"] }      — sections having all listed tags
 *   { childrenOf: { parent: <Target> } }   — every section under a matched parent
 *                                             (by hierarchical id prefix)
 *   { and: [<Target>, <Target>] }          — intersection: must match all
 *   { not: <Target> }                      — complement: sections NOT matched by inner
 */
export type Target = "ALL" | DocTarget | ChildrenOfTarget | AndTarget | NotTarget;

export type DocTarget = {
  /** Match against doc slug. Omit to match any doc. */
  doc?: string;
  /** Exact id match. */
  id?: string;
  /** Pattern against section title. String form is compiled flagless. */
  titleRegex?: string | RegExp;
  /** Pattern against section markdown content. String form is compiled flagless. */
  contentRegex?: string | RegExp;
  /** Single level or set of levels. */
  level?: SectionLevel | SectionLevel[];
  /** Required tags. Array means every listed tag must be present (AND). */
  tags?: string | string[];
};

export type ChildrenOfTarget = {
  childrenOf: { parent: Target };
};

export type AndTarget = {
  and: readonly Target[];
};

export type NotTarget = {
  not: Target;
};

/**
 * Coarse doc-level filter. Recurses through compound targets so a nested
 * `doc` field still gates the outer rule.
 */
export function docMatchesTarget(target: Target, docSlug: string): boolean {
  if (target === "ALL") return true;
  if ("and" in target) {
    return target.and.every((t) => docMatchesTarget(t, docSlug));
  }
  if ("not" in target) {
    // Defensive: NOT can match any doc unless the inner target gates by doc
    // alone (the only case where we can confidently negate at doc level).
    // Per-section filtering in selectMatchingIds enforces correctness.
    return true;
  }
  if ("childrenOf" in target) {
    return docMatchesTarget(target.childrenOf.parent, docSlug);
  }
  return target.doc === undefined || target.doc === docSlug;
}

/**
 * Compute the set of section ids in `sections` that match the target.
 * Caller should already have checked `docMatchesTarget` for the current doc;
 * doc filtering is not re-applied here.
 */
export function selectMatchingIds(
  target: Target,
  sections: readonly Section[],
): Set<string> {
  if (target === "ALL") return new Set(sections.map((s) => s.id));

  if ("and" in target) {
    if (target.and.length === 0) return new Set();
    let acc: Set<string> | null = null;
    for (const t of target.and) {
      const ids = selectMatchingIds(t, sections);
      acc = acc === null ? ids : intersect(acc, ids);
      if (acc.size === 0) break;
    }
    return acc ?? new Set();
  }

  if ("not" in target) {
    const inner = selectMatchingIds(target.not, sections);
    return new Set(
      sections.filter((s) => !inner.has(s.id)).map((s) => s.id),
    );
  }

  if ("childrenOf" in target) {
    const parentIds = selectMatchingIds(target.childrenOf.parent, sections);
    const prefixes = Array.from(parentIds, (id) => id + ".");
    return new Set(
      sections
        .filter((s) => prefixes.some((p) => s.id.startsWith(p)))
        .map((s) => s.id),
    );
  }

  return new Set(
    sections
      .filter((s) => docTargetMatches(target, s))
      .map((s) => s.id),
  );
}

function intersect<T>(a: Set<T>, b: Set<T>): Set<T> {
  const out = new Set<T>();
  for (const x of a) if (b.has(x)) out.add(x);
  return out;
}

function docTargetMatches(target: DocTarget, section: Section): boolean {
  if (target.id !== undefined && target.id !== section.id) return false;
  if (target.titleRegex !== undefined) {
    const re =
      typeof target.titleRegex === "string"
        ? new RegExp(target.titleRegex)
        : target.titleRegex;
    if (!re.test(section.title)) return false;
  }
  if (target.contentRegex !== undefined) {
    const re =
      typeof target.contentRegex === "string"
        ? new RegExp(target.contentRegex)
        : target.contentRegex;
    if (!re.test(section.content)) return false;
  }
  if (target.level !== undefined) {
    const levels = Array.isArray(target.level) ? target.level : [target.level];
    if (!levels.includes(section.level)) return false;
  }
  if (target.tags !== undefined) {
    const required = typeof target.tags === "string" ? [target.tags] : target.tags;
    const have = section.tags ?? [];
    if (!required.every((t) => have.includes(t))) return false;
  }
  return true;
}
