import { describe, expect, it } from "vitest";
import {
  resolveLineageAdvantageRulebookLinks,
  resolveRulebookLinks,
} from "./rulebook-links";

describe("resolveLineageAdvantageRulebookLinks", () => {
  it("matches singular lineage names to plural rulebook headings", async () => {
    const links = await resolveLineageAdvantageRulebookLinks(
      "Half-Elf (Two Worlds)",
    );

    expect(links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          docSlug: "desolation",
          sectionTitle: "Half-Elves (Two Worlds)",
        }),
      ]),
    );
  });
});

describe("resolveRulebookLinks", () => {
  it("can link to pseudo-heading anchors inside a resolved section", async () => {
    const links = await resolveRulebookLinks({
      doc: "core",
      headings: ["Actions", "The actions", "Move"],
      anchor: "Mountains or Swamps",
    });

    expect(links).toEqual([
      expect.objectContaining({
        docSlug: "core",
        sectionTitle: "Move",
        anchor: "Mountains or Swamps",
        href: "/core#core-6.1.2.3.3--mountains-or-swamps",
      }),
    ]);
  });
});
