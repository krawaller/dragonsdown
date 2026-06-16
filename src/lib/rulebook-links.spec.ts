import { describe, expect, it } from "vitest";
import { resolveLineageAdvantageRulebookLinks } from "./rulebook-links";

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
