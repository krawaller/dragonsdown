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
];
