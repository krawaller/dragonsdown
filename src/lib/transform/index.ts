import type { Section } from "../rulebooks";
import {
  docMatchesTarget,
  selectMatchingIds,
  type Target,
} from "../doc-query";

/** Discriminated union of all rule operations. Extend as new ops appear. */
export type Rule = IgnoreImagesRule | AddTagRule | ExtractFooterRule;

export type IgnoreImagesRule = {
  op: "ignoreImages";
  target: Target;
  /** SHA1 hashes without extension, matching `/images/<hash>.<ext>` refs. */
  imageIds: string[];
};

export type AddTagRule = {
  op: "addTag";
  target: Target;
  /** A single tag or several to apply at once. Duplicates are skipped. */
  tag: string | string[];
};

/**
 * Splits the doc's last section: if it ends with a run of 2+ consecutive
 * images (publisher logos), that run plus any text after it becomes a new
 * top-level section with the given title. No-op if the pattern isn't found.
 *
 * `target` is used only for doc-level scoping (which docs to process).
 * Section-level selectors on the target are ignored.
 */
export type ExtractFooterRule = {
  op: "extractFooter";
  target: Target;
  title: string;
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
  switch (rule.op) {
    case "ignoreImages": {
      const ids = selectMatchingIds(rule.target, sections);
      if (ids.size === 0) return sections;
      return sections.map((s) =>
        ids.has(s.id)
          ? { ...s, content: stripImages(s.content, rule.imageIds) }
          : s,
      );
    }
    case "addTag": {
      const ids = selectMatchingIds(rule.target, sections);
      if (ids.size === 0) return sections;
      const toAdd = typeof rule.tag === "string" ? [rule.tag] : rule.tag;
      return sections.map((s) => {
        if (!ids.has(s.id)) return s;
        const existing = s.tags ?? [];
        const missing = toAdd.filter((t) => !existing.includes(t));
        if (missing.length === 0) return s;
        return { ...s, tags: [...existing, ...missing] };
      });
    }
    case "extractFooter":
      return extractFooter(sections, rule);
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

/**
 * Find the byte offset within `content` where a trailing run of 2+
 * whitespace-separated image refs begins. Returns null if no such run exists,
 * or if non-footer body content follows the run.
 */
function findTrailingImageRunStart(content: string): number | null {
  const re = /!\[\]\(\/images\/[a-f0-9]+\.[a-z]+\)/g;
  const matches: { start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length });
  }
  if (matches.length < 2) return null;

  // Whatever follows the last image must be either empty or look like a
  // copyright/publisher notice — not arbitrary body text. This prevents the
  // heuristic from misfiring on body content that happens to contain two
  // consecutive images.
  const trailing = content.slice(matches[matches.length - 1].end).trim();
  if (trailing && !FOOTER_KEYWORDS.test(trailing)) return null;

  // Walk backward from the last image, gathering adjacent images.
  let runStart = matches.length - 1;
  while (runStart > 0) {
    const gap = content.slice(matches[runStart - 1].end, matches[runStart].start);
    if (!/^\s*$/.test(gap)) break;
    runStart--;
  }
  if (matches.length - runStart < 2) return null;
  return matches[runStart].start;
}

const FOOTER_KEYWORDS = /\b(copyright|trademark|reserved|reproduced|games|magic|rights)\b/i;

function extractFooter(
  sections: Section[],
  rule: ExtractFooterRule,
): Section[] {
  if (sections.length === 0) return sections;
  const last = sections[sections.length - 1];
  const splitAt = findTrailingImageRunStart(last.content);
  if (splitAt === null) return sections;

  const body = last.content.slice(0, splitAt).trim();
  const footer = last.content.slice(splitAt).trim();
  if (!footer) return sections;

  const maxL1 = Math.max(
    0,
    ...sections
      .filter((s) => s.level === 1)
      .map((s) => Number.parseInt(s.id, 10))
      .filter((n) => Number.isFinite(n)),
  );
  const newId = String(maxL1 + 1);

  return [
    ...sections.slice(0, -1),
    { ...last, content: body },
    {
      id: newId,
      source: last.source,
      level: 1,
      title: rule.title,
      content: footer,
    },
  ];
}
