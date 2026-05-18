import type { Section } from "../rulebooks";

/**
 * A query that picks out documents and/or sections. Used by transform rules
 * to scope their effect, and (eventually) by ad-hoc querying / custom-doc
 * building to select content.
 *
 * Today's vocabulary:
 *   "ALL"                          — every section in every doc
 *   { doc: "core" }                — every section in one doc
 *   { doc: "core", id: "2.2.0.12" } — one specific entry
 *
 * New fields on DocTarget (e.g. titleRegex, level) can be added without
 * breaking existing callers.
 */
export type Target = "ALL" | DocTarget;

export type DocTarget = {
  doc: string;
  id?: string;
};

/** Does this target apply to the named doc at all? */
export function docMatchesTarget(target: Target, docSlug: string): boolean {
  if (target === "ALL") return true;
  return target.doc === docSlug;
}

/**
 * Does this target match a specific section? Assumes `docMatchesTarget` has
 * already returned true; this only refines further by id (and, in the future,
 * other selectors like titleRegex/level).
 */
export function sectionMatchesTarget(target: Target, section: Section): boolean {
  if (target === "ALL") return true;
  if (target.id !== undefined && target.id !== section.id) return false;
  return true;
}
