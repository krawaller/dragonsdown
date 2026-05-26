import type { DerivedDoc } from ".";

/**
 * Catalogue of derived docs to build. The `derive` build script writes each
 * one to `data/derived/<slug>.json`; the routing/UI layer then treats them
 * as regular docs.
 */
export const DERIVED_DOCS: DerivedDoc[] = [
  {
    slug: "optional-rules",
    title: "Optional Rules",
    pick: {
      and: [
        { childrenOf: { parent: { titleRegex: "OPTIONAL RULES" } } },
        { level: 2 },
      ],
    },
    sortBy: "title",
  },
  {
    slug: "spell-manifest",
    title: "Spell Manifest",
    groups: SPELL_COLORS().map((color) => ({
      // Use the core book's color heading as the canonical group header.
      header: { doc: "core", titleRegex: `^${color} Spells$` },
      // Items: any section tagged "spell" + the color's magic tag, across all docs.
      items: { tags: ["spell", `${color[0].toLowerCase()}${color.slice(1)}Magic`] },
    })),
    sortBy: "title",
  },
];

// Order in this list controls the order of groups in the Spell Manifest.
// Kept in sync with the spell-color rules in src/lib/transform/rules.ts.
function SPELL_COLORS() {
  return [
    "Universal",
    "Black",
    "Blue",
    "Gray",
    "Green",
    "Purple",
    "White",
    "Yellow",
  ] as const;
}
