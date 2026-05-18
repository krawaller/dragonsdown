import { describe, it, expect } from "vitest";
import { docMatchesTarget, selectMatchingIds } from ".";
import type { Section, SectionLevel } from "../rulebooks";

function s(id: string, opts: { level?: SectionLevel; title?: string } = {}): Section {
  return {
    id,
    source: "test",
    level: opts.level ?? 1,
    title: opts.title ?? `Section ${id}`,
    content: "",
  };
}

describe("docMatchesTarget", () => {
  it('"ALL" matches every doc', () => {
    expect(docMatchesTarget("ALL", "core")).toBe(true);
    expect(docMatchesTarget("ALL", "desolation")).toBe(true);
  });

  it("{ doc } only matches the named doc", () => {
    expect(docMatchesTarget({ doc: "core" }, "core")).toBe(true);
    expect(docMatchesTarget({ doc: "core" }, "desolation")).toBe(false);
  });

  it("DocTarget without `doc` matches every doc", () => {
    expect(docMatchesTarget({ titleRegex: "anything" }, "core")).toBe(true);
    expect(docMatchesTarget({ id: "1.2.3" }, "desolation")).toBe(true);
  });

  it("ChildrenOfTarget recurses through its parent target", () => {
    const target = { childrenOf: { parent: { doc: "core" } } } as const;
    expect(docMatchesTarget(target, "core")).toBe(true);
    expect(docMatchesTarget(target, "desolation")).toBe(false);
  });
});

describe("selectMatchingIds", () => {
  const sections = [
    s("1", { title: "Introduction" }),
    s("2", { title: "Reference" }),
    s("2.1", { title: "Lineage Advantages", level: 2 }),
    s("2.1.0.1", { title: "Half-Elves", level: 4 }),
    s("2.1.0.2", { title: "Half-Orcs", level: 4 }),
    s("2.2", { title: "Class Advantages", level: 2 }),
    s("2.2.0.1", { title: "Assassin", level: 4 }),
    s("2.2.0.2", { title: "Bard", level: 4 }),
  ];

  it('"ALL" selects every section', () => {
    expect(selectMatchingIds("ALL", sections).size).toBe(sections.length);
  });

  it("DocTarget id selects exactly one section", () => {
    expect(selectMatchingIds({ id: "2.2.0.1" }, sections)).toEqual(
      new Set(["2.2.0.1"]),
    );
  });

  it("DocTarget titleRegex (string) selects matching titles", () => {
    expect(selectMatchingIds({ titleRegex: "Advantages" }, sections)).toEqual(
      new Set(["2.1", "2.2"]),
    );
  });

  it("DocTarget titleRegex (RegExp) supports flags", () => {
    expect(selectMatchingIds({ titleRegex: /class/i }, sections)).toEqual(
      new Set(["2.2"]),
    );
  });

  it("DocTarget combines id + titleRegex with AND", () => {
    // id "2.1" matches; titleRegex would also match "2.2" but id pins it.
    expect(
      selectMatchingIds(
        { id: "2.1", titleRegex: "Advantages" },
        sections,
      ),
    ).toEqual(new Set(["2.1"]));
  });

  it("ChildrenOfTarget selects descendants by id prefix", () => {
    expect(
      selectMatchingIds(
        { childrenOf: { parent: { titleRegex: "Class Advantages" } } },
        sections,
      ),
    ).toEqual(new Set(["2.2.0.1", "2.2.0.2"]));
  });

  it("ChildrenOfTarget does not include the parent itself", () => {
    const result = selectMatchingIds(
      { childrenOf: { parent: { id: "2.2" } } },
      sections,
    );
    expect(result.has("2.2")).toBe(false);
    expect(result.has("2.2.0.1")).toBe(true);
  });

  it("ChildrenOfTarget with no parent match yields empty set", () => {
    expect(
      selectMatchingIds(
        { childrenOf: { parent: { titleRegex: "nonexistent" } } },
        sections,
      ),
    ).toEqual(new Set());
  });

  it("ChildrenOfTarget can nest (children of children)", () => {
    // children of "2" → 2.1, 2.1.0.1, 2.1.0.2, 2.2, 2.2.0.1, 2.2.0.2
    // children of THAT set → 2.1.0.1, 2.1.0.2, 2.2.0.1, 2.2.0.2
    expect(
      selectMatchingIds(
        {
          childrenOf: {
            parent: { childrenOf: { parent: { id: "2" } } },
          },
        },
        sections,
      ),
    ).toEqual(new Set(["2.1.0.1", "2.1.0.2", "2.2.0.1", "2.2.0.2"]));
  });
});
