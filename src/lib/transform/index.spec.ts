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
    const rules: Rule[] = [
      { op: "ignoreImages", target: "ALL", imageIds: [] },
    ];
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
    const rules: Rule[] = [
      { op: "addTag", tag: "new", target: "ALL" },
    ];
    expect(applyTransforms(start, rules, "core")[0].tags).toEqual([
      "existing",
      "new",
    ]);
  });
});
