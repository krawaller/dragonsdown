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
 *   { level: 2 } / { level: [2, 4] }       — sections at given level(s)
 *   { childrenOf: { parent: <Target> } }   — every section under a matched parent
 *                                             (by hierarchical id prefix)
 *   { and: [<Target>, <Target>] }          — intersection: must match all
 */
export type Target = "ALL" | DocTarget | ChildrenOfTarget | AndTarget;

export type DocTarget = {
  /** Match against doc slug. Omit to match any doc. */
  doc?: string;
  /** Exact id match. */
  id?: string;
  /** Pattern against section title. String form is compiled flagless. */
  titleRegex?: string | RegExp;
  /** Single level or set of levels. */
  level?: SectionLevel | SectionLevel[];
};

export type ChildrenOfTarget = {
  childrenOf: { parent: Target };
};

export type AndTarget = {
  and: Target[];
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
  if (target.level !== undefined) {
    const levels = Array.isArray(target.level) ? target.level : [target.level];
    if (!levels.includes(section.level)) return false;
  }
  return true;
}
