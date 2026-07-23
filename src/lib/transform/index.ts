import type { Section } from "../rulebooks";
import { docMatchesTarget, selectMatchingIds, type Target } from "../doc-query";

/** Discriminated union of all rule operations. Extend as new ops appear. */
export type Rule =
  | IgnoreImagesRule
  | AddTagRule
  | ReplaceTitleRule
  | ExtractFooterRule
  | MoveImageRule
  | MoveImagesRule
  | FloatImagesRule
  | ReplaceSectionRangeRule;

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

export type ReplaceTitleRule = {
  op: "replaceTitle";
  target: Target;
  title: string;
};

export type FloatImagesRule = {
  op: "floatImages";
  target: Target;
  direction: "left" | "right";
};

export type ReplaceSectionRangeRule = {
  op: "replaceSectionRange";
  target: Target;
  from: Target;
  to: Target;
  title: string;
  content?: string;
  tag?: string | string[];
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
 * Relocate an image to a different place within a doc — useful when PDF flow
 * order put it under the wrong heading or in an awkward spot.
 *
 * The image (matched by hash) is stripped from every section in the matching
 * doc(s); a single instance is then re-inserted as its own paragraph just
 * before or just after the first occurrence of `before`/`after` text in any
 * section. Exactly one of `before`/`after` should be set; if both, `before`
 * wins. If the image or the anchor isn't found, the rule is a no-op.
 */
export type MoveImageRule = {
  op: "moveImage";
  target: Target;
  /** SHA1 (no extension) — same form as `IgnoreImagesRule.imageIds`. */
  imageId: string;
  before?: string;
  after?: string;
};

/**
 * Batch form of `moveImage` — relocate several images in one rule. Each key
 * is an image hash, each value is the anchor text. Moves are applied in
 * iteration order. Either or both of `toBefore` / `toAfter` may be set.
 */
export type MoveImagesRule = {
  op: "moveImages";
  target: Target;
  toBefore?: Record<string, string>;
  toAfter?: Record<string, string>;
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
    case "replaceTitle": {
      const ids = selectMatchingIds(rule.target, sections);
      if (ids.size === 0) return sections;
      return sections.map((s) =>
        ids.has(s.id) && s.title !== rule.title
          ? { ...s, title: rule.title }
          : s,
      );
    }
    case "floatImages": {
      const ids = selectMatchingIds(rule.target, sections);
      if (ids.size === 0) return sections;
      return sections.map((s) => {
        if (!ids.has(s.id)) return s;
        const content = floatImages(s.content, rule.direction);
        return content === s.content ? s : { ...s, content };
      });
    }
    case "replaceSectionRange":
      return replaceSectionRange(sections, rule);
    case "extractFooter":
      return extractFooter(sections, rule);
    case "moveImage": {
      const anchor = rule.before ?? rule.after;
      if (!anchor) return sections;
      return moveOneImage(
        sections,
        rule.imageId,
        anchor,
        rule.before === undefined,
      );
    }
    case "moveImages": {
      let result = sections;
      for (const [imageId, anchor] of Object.entries(rule.toBefore ?? {})) {
        result = moveOneImage(result, imageId, anchor, false);
      }
      for (const [imageId, anchor] of Object.entries(rule.toAfter ?? {})) {
        result = moveOneImage(result, imageId, anchor, true);
      }
      return result;
    }
  }
}

function moveOneImage(
  sections: Section[],
  imageId: string,
  anchor: string,
  insertAfter: boolean,
): Section[] {
  const refRe = new RegExp(
    `!\\[\\]\\(/images/(?:[a-z]+/)?${imageId}\\.[a-z]+\\)`,
  );
  // Capture the original ref so we can re-insert with the right extension.
  let imageRef: string | null = null;
  for (const s of sections) {
    const m = s.content.match(refRe);
    if (m) {
      imageRef = m[0];
      break;
    }
  }
  if (!imageRef) return sections;

  // No-op if the anchor isn't anywhere — don't risk stripping the image and
  // having nowhere to put it back.
  const anchorIdx = sections.findIndex((s) => s.content.includes(anchor));
  if (anchorIdx < 0) return sections;

  // Strip every occurrence, collapsing the whitespace around the image so
  // inline removals don't leave double spaces and paragraph removals don't
  // leave triple newlines.
  const surroundRe = new RegExp(`(\\s*)${refRe.source}(\\s*)`, "g");
  const strip = (content: string): string => {
    const out = content.replace(
      surroundRe,
      (_m, before: string, after: string) => {
        if (!before && !after) return "";
        return (before + after).includes("\n") ? "\n\n" : " ";
      },
    );
    return out.trim();
  };
  const stripped = sections.map((s) => {
    if (!s.content.includes(imageId)) return s;
    const content = strip(s.content);
    return content === s.content ? s : { ...s, content };
  });

  // Insert into the anchor section, as its own paragraph.
  return stripped.map((s, i) => {
    if (i !== anchorIdx) return s;
    const pos = s.content.indexOf(anchor);
    if (pos < 0) return s;
    if (insertAfter) {
      const cut = pos + anchor.length;
      const head = s.content.slice(0, cut);
      const tail = s.content.slice(cut).replace(/^\s+/, "");
      const content = tail
        ? `${head}\n\n${imageRef}\n\n${tail}`
        : `${head}\n\n${imageRef}`;
      return { ...s, content };
    }
    const head = s.content.slice(0, pos).replace(/\s+$/, "");
    const tail = s.content.slice(pos);
    const content = head
      ? `${head}\n\n${imageRef}\n\n${tail}`
      : `${imageRef}\n\n${tail}`;
    return { ...s, content };
  });
}

// Accepts both legacy refs (`/images/<hash>.<ext>`) and the current subdir
// layout (`/images/pdf/<hash>.<ext>`); the hash group is what we match against
// `imageIds`.
const IMAGE_REF_RE = /!\[\]\(\/images\/(?:[a-z]+\/)?([a-f0-9]+)\.[a-z]+\)/g;

function floatImages(content: string, direction: "left" | "right"): string {
  const display = `float-${direction}`;
  return content.replace(
    /!\[\]\((\/images\/(?:[a-z]+\/)?[a-f0-9]+\.[a-z]+)\)/g,
    `![${display}]($1)`,
  );
}

function replaceSectionRange(
  sections: Section[],
  rule: ReplaceSectionRangeRule,
): Section[] {
  const ids = selectMatchingIds(rule.target, sections);
  if (ids.size === 0) return sections;
  const fromIds = selectMatchingIds(rule.from, sections);
  const toIds = selectMatchingIds(rule.to, sections);

  const start = sections.findIndex(
    (section) => ids.has(section.id) && fromIds.has(section.id),
  );
  if (start < 0) return sections;

  const end = sections.findIndex(
    (section, index) =>
      index >= start && ids.has(section.id) && toIds.has(section.id),
  );
  if (end < start) return sections;

  const first = sections[start];
  const tag =
    rule.tag === undefined
      ? []
      : Array.isArray(rule.tag)
        ? rule.tag
        : [rule.tag];
  const replacement: Section = {
    id: first.id,
    source: first.source,
    level: first.level,
    title: rule.title,
    headingStyle: first.headingStyle,
    location: first.location,
    content: rule.content ?? "",
    tags: [...(first.tags ?? []), ...tag],
  };

  return [...sections.slice(0, start), replacement, ...sections.slice(end + 1)];
}

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
 * Find the byte offset within `content` where a trailing footer image run begins.
 * Two or more consecutive trailing images count as a publisher footer; a single
 * trailing image counts only when followed by footer/legal text.
 */
function findTrailingImageRunStart(content: string): number | null {
  const re = /!\[\]\(\/images\/(?:[a-z]+\/)?[a-f0-9]+\.[a-z]+\)/g;
  const matches: { start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length });
  }
  if (matches.length === 0) return null;

  // Whatever follows the last image must be either empty or look like a
  // copyright/publisher notice — not arbitrary body text. This prevents the
  // heuristic from misfiring on body content that happens to contain two
  // consecutive images.
  const trailing = content.slice(matches[matches.length - 1].end).trim();
  if (trailing && !FOOTER_KEYWORDS.test(trailing)) return null;

  // Walk backward from the last image, gathering adjacent images.
  let runStart = matches.length - 1;
  while (runStart > 0) {
    const gap = content.slice(
      matches[runStart - 1].end,
      matches[runStart].start,
    );
    if (!/^\s*$/.test(gap)) break;
    runStart--;
  }
  if (matches.length - runStart < 2 && !trailing) return null;
  return matches[runStart].start;
}

const FOOTER_KEYWORDS =
  /\b(copyright|trademark|reserved|reproduced|games|magic|rights)\b/i;

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
  // Idempotency: if there's nothing before the footer pattern, the section is
  // already the credits-style entry — running again would just split it into
  // an empty stub plus a duplicate Credits section.
  if (!body) return sections;

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
