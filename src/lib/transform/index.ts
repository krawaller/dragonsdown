import type { Section } from "../rulebooks";
import {
  docMatchesTarget,
  selectMatchingIds,
  type Target,
} from "../doc-query";

/** Discriminated union of all rule operations. Extend as new ops appear. */
export type Rule = IgnoreImagesRule | AddTagRule;

export type IgnoreImagesRule = {
  op: "ignoreImages";
  target: Target;
  /** SHA1 hashes without extension, matching `/images/<hash>.<ext>` refs. */
  imageIds: string[];
};

export type AddTagRule = {
  op: "addTag";
  target: Target;
  tag: string;
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

function applyRule(sections: Section[], rule: Rule): Section[] {
  const ids = selectMatchingIds(rule.target, sections);
  if (ids.size === 0) return sections;
  switch (rule.op) {
    case "ignoreImages":
      return sections.map((s) =>
        ids.has(s.id)
          ? { ...s, content: stripImages(s.content, rule.imageIds) }
          : s,
      );
    case "addTag":
      return sections.map((s) => {
        if (!ids.has(s.id)) return s;
        const existing = s.tags ?? [];
        if (existing.includes(rule.tag)) return s;
        return { ...s, tags: [...existing, rule.tag] };
      });
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
