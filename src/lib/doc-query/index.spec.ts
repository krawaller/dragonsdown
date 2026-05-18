import { describe, it, expect } from "vitest";
import { docMatchesTarget, sectionMatchesTarget } from ".";
import type { Section, SectionLevel } from "../rulebooks";

function s(id: string, opts: { level?: SectionLevel; title?: string } = {}): Section {
  return {
    id,
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
    const target = { doc: "core" };
    expect(docMatchesTarget(target, "core")).toBe(true);
    expect(docMatchesTarget(target, "desolation")).toBe(false);
  });

  it("{ doc, id } matches at the doc level (id is checked per-section)", () => {
    const target = { doc: "core", id: "2.2.0.12" };
    expect(docMatchesTarget(target, "core")).toBe(true);
    expect(docMatchesTarget(target, "desolation")).toBe(false);
  });
});

describe("sectionMatchesTarget", () => {
  it('"ALL" matches every section', () => {
    expect(sectionMatchesTarget("ALL", s("1"))).toBe(true);
    expect(sectionMatchesTarget("ALL", s("2.1.0.12"))).toBe(true);
  });

  it("{ doc } (no id) matches every section", () => {
    const target = { doc: "core" };
    expect(sectionMatchesTarget(target, s("1"))).toBe(true);
    expect(sectionMatchesTarget(target, s("99"))).toBe(true);
  });

  it("{ doc, id } only matches the section with that id", () => {
    const target = { doc: "core", id: "2.2.0.12" };
    expect(sectionMatchesTarget(target, s("2.2.0.12"))).toBe(true);
    expect(sectionMatchesTarget(target, s("2.2.0.11"))).toBe(false);
    expect(sectionMatchesTarget(target, s("1"))).toBe(false);
  });
});
