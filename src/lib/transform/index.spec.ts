import { describe, it, expect } from "vitest";
import { applyTransforms, type Rule } from ".";
import type { Section, SectionLevel } from "../rulebooks";

function s(
  id: string,
  content: string,
  opts: { level?: SectionLevel; title?: string } = {},
): Section {
  return {
    id,
    source: "test",
    level: opts.level ?? 1,
    title: opts.title ?? `Section ${id}`,
    content,
  };
}

const IMG = (hash: string) => `![](/images/${hash}.png)`;

describe("ignoreImages — content effect", () => {
  it("strips a referenced image ref", () => {
    const sections = [s("1", `Before\n\n${IMG("abc")}\n\nAfter`)];
    const rules: Rule[] = [
      { op: "ignoreImages", target: "ALL", imageIds: ["abc"] },
    ];
    expect(applyTransforms(sections, rules, "core")[0].content).toBe(
      "Before\n\nAfter",
    );
  });

  it("preserves non-referenced images", () => {
    const sections = [s("1", `${IMG("abc")}\n\n${IMG("def")}`)];
    const rules: Rule[] = [
      { op: "ignoreImages", target: "ALL", imageIds: ["abc"] },
    ];
    const result = applyTransforms(sections, rules, "core")[0].content;
    expect(result).toContain("def.png");
    expect(result).not.toContain("abc.png");
  });

  it("handles multiple ignored hashes in one rule", () => {
    const sections = [s("1", `${IMG("abc")} ${IMG("def")} ${IMG("fad")}`)];
    const rules: Rule[] = [
      { op: "ignoreImages", target: "ALL", imageIds: ["abc", "fad"] },
    ];
    const result = applyTransforms(sections, rules, "core")[0].content;
    expect(result).toContain("def.png");
    expect(result).not.toContain("abc.png");
    expect(result).not.toContain("fad.png");
  });

  it("empty imageIds is a no-op", () => {
    const original = `Hello ${IMG("abc")}`;
    const sections = [s("1", original)];
    const rules: Rule[] = [{ op: "ignoreImages", target: "ALL", imageIds: [] }];
    expect(applyTransforms(sections, rules, "core")[0].content).toBe(original);
  });

  it("matches refs with any lowercase extension", () => {
    const sections = [s("1", `![](/images/abc.jpeg) ![](/images/def.png)`)];
    const rules: Rule[] = [
      { op: "ignoreImages", target: "ALL", imageIds: ["abc", "def"] },
    ];
    expect(applyTransforms(sections, rules, "core")[0].content).toBe("");
  });

  it("is idempotent", () => {
    const sections = [s("1", `Before\n\n${IMG("abc")}\n\nAfter`)];
    const rules: Rule[] = [
      { op: "ignoreImages", target: "ALL", imageIds: ["abc"] },
    ];
    const once = applyTransforms(sections, rules, "core");
    const twice = applyTransforms(once, rules, "core");
    expect(twice).toEqual(once);
  });
});

describe("Pipeline", () => {
  it("respects target scoping when applying rules", () => {
    // Sanity check that applyTransforms wires through doc-query's matching.
    // Exhaustive target-matching tests live in doc-query/index.spec.ts.
    const sections = [
      s("1", IMG("ab"), { title: "First" }),
      s("2", IMG("ab"), { title: "Second" }),
    ];
    const rules: Rule[] = [
      {
        op: "ignoreImages",
        target: { doc: "core", id: "2" },
        imageIds: ["ab"],
      },
    ];
    // Wrong doc: nothing changes.
    expect(applyTransforms(sections, rules, "desolation")).toEqual(sections);
    // Right doc, wrong id: id "1" untouched, id "2" stripped.
    const out = applyTransforms(sections, rules, "core");
    expect(out[0].content).toContain("ab.png");
    expect(out[1].content).toBe("");
  });

  it("applies rules in order; later rules see earlier output", () => {
    const sections = [s("1", `${IMG("a")} ${IMG("b")}`)];
    const rules: Rule[] = [
      { op: "ignoreImages", target: "ALL", imageIds: ["a"] },
      { op: "ignoreImages", target: "ALL", imageIds: ["b"] },
    ];
    expect(applyTransforms(sections, rules, "core")[0].content).toBe("");
  });

  it("empty rule list is a no-op", () => {
    const sections = [s("1", "anything")];
    expect(applyTransforms(sections, [], "core")).toEqual(sections);
  });

  it("returns sections in original order with unchanged metadata", () => {
    const sections = [
      s("1", IMG("a"), { title: "First", level: 1 }),
      s("1.1", "body", { title: "Sub", level: 2 }),
    ];
    const rules: Rule[] = [
      { op: "ignoreImages", target: "ALL", imageIds: ["a"] },
    ];
    const out = applyTransforms(sections, rules, "core");
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ id: "1", title: "First", level: 1 });
    expect(out[1]).toMatchObject({ id: "1.1", title: "Sub", level: 2 });
  });
});

describe("floatImages", () => {
  it("floats block images in matched sections", () => {
    const sections = [
      s(
        "1",
        `${IMG("aaa")}

Body`,
        { title: "Credits" },
      ),
      s("2", IMG("bbb"), { title: "Other" }),
    ];
    const rules: Rule[] = [
      {
        op: "floatImages",
        target: { titleRegex: "^Credits$" },
        direction: "right",
      },
    ];
    const out = applyTransforms(sections, rules, "core");

    expect(out[0].content).toBe(`![float-right](/images/aaa.png)

Body`);
    expect(out[1].content).toBe(IMG("bbb"));
  });
});

describe("extractFooter", () => {
  it("splits a trailing image pair (no copyright text) into a new L1 section", () => {
    const sections = [
      s("1", "Intro body", { level: 1, title: "Intro" }),
      s("2", `Last entry body.\n\n${IMG("aa")}\n\n${IMG("bb")}`, {
        level: 1,
        title: "Last",
      }),
    ];
    const rules: Rule[] = [
      { op: "extractFooter", target: "ALL", title: "Credits" },
    ];
    const out = applyTransforms(sections, rules, "core");
    expect(out).toHaveLength(3);
    expect(out[1].content).toBe("Last entry body.");
    expect(out[2]).toMatchObject({
      id: "3",
      level: 1,
      title: "Credits",
      source: "test",
    });
    expect(out[2].content).toContain(IMG("aa"));
    expect(out[2].content).toContain(IMG("bb"));
  });

  it("includes trailing copyright text after the image pair", () => {
    const sections = [
      s(
        "1",
        `Body.\n\n${IMG("aa")}\n\n${IMG("bb")}\n\nCopyright Active Magic Games, all rights reserved.`,
        { level: 1, title: "Last" },
      ),
    ];
    const rules: Rule[] = [
      { op: "extractFooter", target: "ALL", title: "Credits" },
    ];
    const out = applyTransforms(sections, rules, "core");
    expect(out).toHaveLength(2);
    expect(out[0].content).toBe("Body.");
    expect(out[1].content).toContain("Copyright Active Magic Games");
    expect(out[1].content).toContain(IMG("aa"));
  });

  it("splits a single trailing image when followed by copyright text", () => {
    const sections = [
      s(
        "1",
        `Body.\n\n${IMG("aa")}\n\n(C) Copyright 2025 Active Magic Games, all rights reserved.`,
        { level: 1, title: "Last" },
      ),
    ];
    const rules: Rule[] = [
      { op: "extractFooter", target: "ALL", title: "Credits" },
    ];
    const out = applyTransforms(sections, rules, "core");
    expect(out).toHaveLength(2);
    expect(out[0].content).toBe("Body.");
    expect(out[1]).toMatchObject({ id: "2", level: 1, title: "Credits" });
    expect(out[1].content).toBe(
      `${IMG("aa")}\n\n(C) Copyright 2025 Active Magic Games, all rights reserved.`,
    );
  });

  it("is a no-op for a single trailing image without footer text", () => {
    const sections = [
      s("1", `Body.\n\n${IMG("aa")}`, { level: 1, title: "Last" }),
    ];
    const rules: Rule[] = [
      { op: "extractFooter", target: "ALL", title: "Credits" },
    ];
    expect(applyTransforms(sections, rules, "core")).toEqual(sections);
  });

  it("is a no-op when consecutive images aren't at the end", () => {
    const sections = [
      s("1", `${IMG("aa")}\n\n${IMG("bb")}\n\nBody text follows the images.`, {
        level: 1,
        title: "Last",
      }),
    ];
    const rules: Rule[] = [
      { op: "extractFooter", target: "ALL", title: "Credits" },
    ];
    expect(applyTransforms(sections, rules, "core")).toEqual(sections);
  });

  it("assigns the next L1 id to the new section", () => {
    const sections = [
      s("1", "", { level: 1, title: "One" }),
      s("2", "", { level: 1, title: "Two" }),
      s("2.1", "", { level: 2, title: "Sub" }),
      s("3", `Body.\n\n${IMG("aa")}\n\n${IMG("bb")}`, {
        level: 1,
        title: "Three",
      }),
    ];
    const rules: Rule[] = [
      { op: "extractFooter", target: "ALL", title: "Credits" },
    ];
    const out = applyTransforms(sections, rules, "core");
    expect(out[out.length - 1].id).toBe("4");
  });

  it("respects doc-level target gating", () => {
    const sections = [
      s("1", `Body.\n\n${IMG("aa")}\n\n${IMG("bb")}`, {
        level: 1,
        title: "Last",
      }),
    ];
    const rules: Rule[] = [
      {
        op: "extractFooter",
        target: { doc: "core" },
        title: "Credits",
      },
    ];
    expect(applyTransforms(sections, rules, "desolation")).toEqual(sections);
    expect(applyTransforms(sections, rules, "core")).toHaveLength(2);
  });

  it("is idempotent — running again leaves the existing Credits section alone", () => {
    const sections = [
      s("1", "Body.", { level: 1, title: "Real" }),
      s("2", `${IMG("aa")}\n\n${IMG("bb")}\n\nCopyright Active Magic Games.`, {
        level: 1,
        title: "Credits",
      }),
    ];
    const rules: Rule[] = [
      { op: "extractFooter", target: "ALL", title: "Credits" },
    ];
    expect(applyTransforms(sections, rules, "core")).toEqual(sections);
  });
});

describe("moveImage", () => {
  it("moves an image from its current position to just before the anchor", () => {
    const sections = [
      s(
        "1",
        `Intro.\n\n${IMG("abc")}\n\n**Permanent:** body text\n\n**Active:** body text`,
        { level: 1, title: "Spells" },
      ),
    ];
    const rules: Rule[] = [
      {
        op: "moveImage",
        target: "ALL",
        imageId: "abc",
        before: "**Active:**",
      },
    ];
    const out = applyTransforms(sections, rules, "core");
    expect(out[0].content).toBe(
      `Intro.\n\n**Permanent:** body text\n\n${IMG("abc")}\n\n**Active:** body text`,
    );
  });

  it("supports after-anchor placement", () => {
    const sections = [
      s("1", `${IMG("abc")}\n\nBody.\n\nDONE.`, { level: 1, title: "X" }),
    ];
    const rules: Rule[] = [
      { op: "moveImage", target: "ALL", imageId: "abc", after: "DONE." },
    ];
    expect(applyTransforms(sections, rules, "core")[0].content).toBe(
      `Body.\n\nDONE.\n\n${IMG("abc")}`,
    );
  });

  it("can move an image across sections in the same doc", () => {
    const sections = [
      s("1", `Here is ${IMG("abc")} an image.`, { level: 1, title: "Wrong" }),
      s("2", `Body.\n\n**Anchor:** here.`, { level: 1, title: "Right" }),
    ];
    const rules: Rule[] = [
      {
        op: "moveImage",
        target: "ALL",
        imageId: "abc",
        before: "**Anchor:**",
      },
    ];
    const out = applyTransforms(sections, rules, "core");
    expect(out[0].content).toBe("Here is an image.");
    expect(out[1].content).toBe(`Body.\n\n${IMG("abc")}\n\n**Anchor:** here.`);
  });

  it("is a no-op when the image hash isn't found in any section", () => {
    const sections = [s("1", "no images here", { level: 1, title: "X" })];
    const rules: Rule[] = [
      {
        op: "moveImage",
        target: "ALL",
        imageId: "abc",
        before: "anything",
      },
    ];
    expect(applyTransforms(sections, rules, "core")).toEqual(sections);
  });

  it("is a no-op when the anchor isn't found anywhere", () => {
    const sections = [
      s("1", `Body ${IMG("abc")} more body.`, { level: 1, title: "X" }),
    ];
    const rules: Rule[] = [
      {
        op: "moveImage",
        target: "ALL",
        imageId: "abc",
        before: "nonexistent",
      },
    ];
    // Image was found, but no anchor → entire transform is a no-op (image stays put).
    const out = applyTransforms(sections, rules, "core");
    expect(out[0].content).toBe(`Body ${IMG("abc")} more body.`);
  });

  it("moveImages: relocates multiple images in one rule (toBefore + toAfter)", () => {
    const sections = [
      s(
        "1",
        `${IMG("aa")} and ${IMG("bb")} mixed in.\n\n**One:** here\n\n**Two:** here`,
        { level: 1, title: "X" },
      ),
    ];
    const rules: Rule[] = [
      {
        op: "moveImages",
        target: "ALL",
        toBefore: { aa: "**One:**" },
        toAfter: { bb: "**Two:**" },
      },
    ];
    const out = applyTransforms(sections, rules, "core");
    // `toAfter` inserts directly after the anchor text, so `**Two:**` is
    // split from " here" by the image.
    expect(out[0].content).toBe(
      `and mixed in.\n\n${IMG("aa")}\n\n**One:** here\n\n**Two:**\n\n${IMG("bb")}\n\nhere`,
    );
  });

  it("moveImages: empty maps is a no-op", () => {
    const sections = [s("1", `Body ${IMG("aa")}`, { level: 1, title: "X" })];
    const rules: Rule[] = [{ op: "moveImages", target: "ALL" }];
    expect(applyTransforms(sections, rules, "core")).toEqual(sections);
  });

  it("matches /images/<subdir>/<hash>.<ext> too (pdf/...)", () => {
    const sections = [
      s("1", `before\n\n![](/images/pdf/abc.png)\n\nMARKER end`, {
        level: 1,
        title: "X",
      }),
    ];
    const rules: Rule[] = [
      { op: "moveImage", target: "ALL", imageId: "abc", after: "MARKER" },
    ];
    const out = applyTransforms(sections, rules, "core");
    expect(out[0].content).toBe(
      `before\n\nMARKER\n\n![](/images/pdf/abc.png)\n\nend`,
    );
  });
});

describe("addTag", () => {
  const sections = () => [
    s("1", "", { title: "Class Advantages", level: 2 }),
    s("1.0.0.1", "", { title: "Assassin", level: 4 }),
    s("1.0.0.2", "", { title: "Bard", level: 4 }),
    s("2", "", { title: "Treasure", level: 2 }),
  ];

  it("tags every matching section", () => {
    const rules: Rule[] = [
      {
        op: "addTag",
        tag: "classAdvantage",
        target: {
          childrenOf: { parent: { titleRegex: "Class Advantages" } },
        },
      },
    ];
    const out = applyTransforms(sections(), rules, "core");
    expect(out[0].tags).toBeUndefined(); // the parent itself isn't tagged
    expect(out[1].tags).toEqual(["classAdvantage"]);
    expect(out[2].tags).toEqual(["classAdvantage"]);
    expect(out[3].tags).toBeUndefined(); // unrelated section
  });

  it("accepts an array of tags and adds them all at once", () => {
    const rules: Rule[] = [
      {
        op: "addTag",
        tag: ["spell", "blackMagic"],
        target: { id: "1.0.0.1" },
      },
    ];
    const out = applyTransforms(sections(), rules, "core");
    expect(out[1].tags).toEqual(["spell", "blackMagic"]);
  });

  it("array form is idempotent and partial-overlap safe", () => {
    const start = [{ ...sections()[1], tags: ["spell"] }];
    const rules: Rule[] = [
      { op: "addTag", tag: ["spell", "blackMagic"], target: "ALL" },
    ];
    expect(applyTransforms(start, rules, "core")[0].tags).toEqual([
      "spell",
      "blackMagic",
    ]);
  });

  it("is idempotent (same tag added twice)", () => {
    const rules: Rule[] = [
      { op: "addTag", tag: "x", target: { id: "1.0.0.1" } },
      { op: "addTag", tag: "x", target: { id: "1.0.0.1" } },
    ];
    const out = applyTransforms(sections(), rules, "core");
    expect(out[1].tags).toEqual(["x"]);
  });

  it("appends to existing tags", () => {
    const start = [{ ...sections()[1], tags: ["existing"] }];
    const rules: Rule[] = [{ op: "addTag", tag: "new", target: "ALL" }];
    expect(applyTransforms(start, rules, "core")[0].tags).toEqual([
      "existing",
      "new",
    ]);
  });
});
