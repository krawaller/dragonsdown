import type { Section } from "./rulebooks";

/**
 * Targets are designed to grow. Today we support:
 *   "ALL"                          — every section in every doc
 *   { doc: "core" }                — every section in one doc
 *   { doc: "core", id: "2.2.0.12" } — one specific entry
 *
 * New fields on DocTarget (e.g. titleRegex, level) can be added without
 * breaking existing rules.
 */
export type Target = "ALL" | DocTarget;

export type DocTarget = {
  doc: string;
  id?: string;
};

/** Discriminated union of all rule operations. Extend as new ops appear. */
export type Rule = IgnoreImagesRule;

export type IgnoreImagesRule = {
  op: "ignoreImages";
  target: Target;
  /** SHA1 hashes without extension, matching `/images/<hash>.<ext>` refs. */
  imageIds: string[];
};

/**
 * Run all matching rules against a doc's sections, in order. Each rule is
 * pure: it returns a new array. Later rules see the output of earlier ones,
 * so "later wins" by virtue of order (no special merge semantics).
 */
export function applyTransforms(
  sections: Section[],
  rules: readonly Rule[],
  docSlug: string,
): Section[] {
  let result = sections;
  for (const rule of rules) {
    if (!docMatchesTarget(rule.target, docSlug)) continue;
    result = applyRule(result, rule);
  }
  return result;
}

function docMatchesTarget(target: Target, docSlug: string): boolean {
  if (target === "ALL") return true;
  return target.doc === docSlug;
}

function sectionMatchesTarget(target: Target, section: Section): boolean {
  if (target === "ALL") return true;
  if (target.id !== undefined && target.id !== section.id) return false;
  return true;
}

function applyRule(sections: Section[], rule: Rule): Section[] {
  switch (rule.op) {
    case "ignoreImages":
      return sections.map((s) =>
        sectionMatchesTarget(rule.target, s)
          ? { ...s, content: stripImages(s.content, rule.imageIds) }
          : s,
      );
  }
}

const IMAGE_REF_RE = /!\[\]\(\/images\/([a-f0-9]+)\.[a-z]+\)/g;

function stripImages(content: string, imageIds: readonly string[]): string {
  if (!imageIds.length) return content;
  const ids = new Set(imageIds);
  const removed = content.replace(IMAGE_REF_RE, (match, hash: string) =>
    ids.has(hash) ? "" : match,
  );
  // Collapse the blank-line runs that removed images leave behind.
  return removed.replace(/\n{3,}/g, "\n\n").trim();
}
