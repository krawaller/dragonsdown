import { describe, it, expect } from "vitest";
import { deriveDocument, type DerivedDoc, type RulebookInput } from ".";
import type { Section, SectionLevel } from "../rulebooks";

function s(
  source: string,
  id: string,
  title: string,
  opts: { level?: SectionLevel; content?: string } = {},
): Section {
  return {
    id,
    source,
    level: opts.level ?? 2,
    title,
    content: opts.content ?? "",
  };
}

const RULEBOOKS: RulebookInput[] = [
  {
    slug: "core",
    sections: [
      s("core", "1", "Title Page", { level: 1 }),
      s("core", "8", "OPTIONAL RULES", { level: 1 }),
      s("core", "8.1", "Luring", { level: 2 }),
      s("core", "8.1.0.1", "Luring extra", { level: 4 }),
      s("core", "8.2", "Tough Monsters", { level: 2 }),
    ],
  },
  {
    slug: "natives-and-legends",
    sections: [
      s("natives-and-legends", "4", "OPTIONAL RULES", { level: 1 }),
      s("natives-and-legends", "4.1", "Difficult Natives", { level: 2 }),
      s("natives-and-legends", "4.2", "Roaming Monsters", { level: 2 }),
    ],
  },
  {
    slug: "desolation",
    sections: [s("desolation", "1", "INTRODUCTION", { level: 1 })],
  },
];

describe("deriveDocument", () => {
  const optionalRulesSpec: DerivedDoc = {
    slug: "optional-rules",
    title: "Optional Rules",
    pick: {
      and: [
        { childrenOf: { parent: { titleRegex: "OPTIONAL RULES" } } },
        { level: 2 },
      ],
    },
    sortBy: "title",
  };

  it("picks matching sections from every rulebook", () => {
    const out = deriveDocument(optionalRulesSpec, RULEBOOKS);
    expect(out.map((s) => s.title)).toEqual([
      "Difficult Natives",
      "Luring",
      "Roaming Monsters",
      "Tough Monsters",
    ]);
  });

  it("preserves source on each section (provenance)", () => {
    const out = deriveDocument(optionalRulesSpec, RULEBOOKS);
    const sourcesByTitle = Object.fromEntries(out.map((s) => [s.title, s.source]));
    expect(sourcesByTitle["Luring"]).toBe("core");
    expect(sourcesByTitle["Difficult Natives"]).toBe("natives-and-legends");
  });

  it("preserves original ids from source rulebooks", () => {
    const out = deriveDocument(optionalRulesSpec, RULEBOOKS);
    // Alphabetical: Difficult Natives, Luring, Roaming Monsters, Tough Monsters
    expect(out.map((s) => `${s.source}/${s.id}`)).toEqual([
      "natives-and-legends/4.1",
      "core/8.1",
      "natives-and-legends/4.2",
      "core/8.2",
    ]);
  });

  it("excludes deeper nested entries (level filter works)", () => {
    const out = deriveDocument(optionalRulesSpec, RULEBOOKS);
    // "Luring extra" is L4 under Luring's id; should not appear.
    expect(out.find((s) => s.title === "Luring extra")).toBeUndefined();
  });

  it("returns empty when nothing matches", () => {
    const spec: DerivedDoc = {
      slug: "empty",
      title: "Empty",
      pick: { titleRegex: "nothing-matches-this" },
    };
    expect(deriveDocument(spec, RULEBOOKS)).toEqual([]);
  });

  it("sortBy 'source' groups by source slug then title", () => {
    const spec: DerivedDoc = { ...optionalRulesSpec, sortBy: "source" };
    const out = deriveDocument(spec, RULEBOOKS);
    expect(out.map((s) => `${s.source}/${s.title}`)).toEqual([
      "core/Luring",
      "core/Tough Monsters",
      "natives-and-legends/Difficult Natives",
      "natives-and-legends/Roaming Monsters",
    ]);
  });

  it("respects doc-level gating on the pick target", () => {
    const spec: DerivedDoc = {
      slug: "core-optionals",
      title: "Core Optionals",
      pick: {
        and: [
          { doc: "core" },
          { childrenOf: { parent: { titleRegex: "OPTIONAL RULES" } } },
          { level: 2 },
        ],
      },
    };
    const out = deriveDocument(spec, RULEBOOKS);
    expect(out.map((s) => s.source)).toEqual(["core", "core"]);
  });
});
