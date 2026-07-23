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
        content:
          "**Mountains or Swamps:** A Move Action made into a Mountain or Swamp Clearing requires +1 action cost.",
        href: "/core#core-6.1.2.3.3--mountains-or-swamps",
      }),
    ]);
  });

  it("can link to pseudo-heading anchors inside bullet list items", async () => {
    const links = await resolveRulebookLinks({
      doc: "core",
      headings: [
        "Actions",
        "The actions",
        "Move",
        "Place Tokens",
        "Wilderness tiles",
      ],
      anchor: "Forgotten City/Dwarven Ruins",
    });

    expect(links).toEqual([
      expect.objectContaining({
        docSlug: "core",
        sectionTitle: "Wilderness tiles:",
        anchor: "Forgotten City/Dwarven Ruins",
        content: expect.stringContaining(
          "**Forgotten City/Dwarven Ruins:** Reveal one additional token",
        ),
        href: "/core#core-6.1.2.3.3.1.2--forgotten-city-dwarven-ruins",
      }),
    ]);
  });

  it("promotes leading floated content images to preview icons", async () => {
    const links = await resolveRulebookLinks({
      doc: "eastern-reaches",
      headings: ["Dreadful Deserts", "Desert Clearings"],
    });

    expect(links).toEqual([
      expect.objectContaining({
        sectionTitle: "Desert Clearings",
        icon: "/images/pdf/f6844a13fa69d074640779670fc8c922d3b7f162.jpeg",
        content: expect.not.stringContaining("![float-right]"),
      }),
    ]);
  });
});
