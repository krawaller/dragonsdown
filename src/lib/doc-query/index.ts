import type { Section } from "../rulebooks";

/**
 * A query that picks out documents and/or sections. Used by transform rules
 * to scope their effect, and (eventually) by ad-hoc querying / custom-doc
 * building to select content.
 *
 * Today's vocabulary:
 *   "ALL"                                 — every section in every doc
 *   { doc: "core" }                       — every section in one doc
 *   { doc: "core", id: "2.2.0.12" }       — one specific entry
 *   { titleRegex: "Class Advantages" }    — sections whose title matches
 *   { childrenOf: { parent: <Target> } }  — every section under a matched parent
 *                                            (by hierarchical id prefix)
 */
export type Target = "ALL" | DocTarget | ChildrenOfTarget;

export type DocTarget = {
  /** Match against doc slug. Omit to match any doc. */
  doc?: string;
  /** Exact id match. */
  id?: string;
  /** Pattern against section title. String form is compiled flagless. */
  titleRegex?: string | RegExp;
};

export type ChildrenOfTarget = {
  childrenOf: { parent: Target };
};

/**
 * Coarse doc-level filter for a rule. Recurses through `childrenOf` so a
 * nested target's `doc` still gates the outer rule.
 */
export function docMatchesTarget(target: Target, docSlug: string): boolean {
  if (target === "ALL") return true;
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

function docTargetMatches(target: DocTarget, section: Section): boolean {
  if (target.id !== undefined && target.id !== section.id) return false;
  if (target.titleRegex !== undefined) {
    const re =
      typeof target.titleRegex === "string"
        ? new RegExp(target.titleRegex)
        : target.titleRegex;
    if (!re.test(section.title)) return false;
  }
  return true;
}
