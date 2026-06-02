import type { Rule } from ".";

const SPELL_COLORS = [
  "Universal",
  "Black",
  "Blue",
  "Gray",
  "Green",
  "Purple",
  "White",
  "Yellow",
] as const;

function spellColorRules(): Rule[] {
  return SPELL_COLORS.map((color) => ({
    op: "addTag",
    tag: ["spell", `${color[0].toLowerCase()}${color.slice(1)}Magic`],
    target: {
      childrenOf: { parent: { titleRegex: `${color} Spells` } },
    },
  }));
}

/**
 * Manual massaging applied on top of the extracted JSON in `data/`.
 * Rules run in order; later rules see the output of earlier ones.
 */
export const TRANSFORMS: Rule[] = [
  // PDF flow sometimes drops images under the wrong heading or in awkward
  // positions inside a long content block. Use `moveImages` to relocate them
  // by image-hash + anchor text (one rule can carry many entries).
  {
    op: "moveImages",
    target: { doc: "core" },
    toBefore: {
      f926bc83f1a9b531c74fd4044e138cf9d65ed37e: "**Active:**",
      dbb150bd5fb34fbf8f65a3d81c0b28e29248b75a: "**Position Head",
      "5885eb4a46058337e8e746a077a2a5191fb8b205": "**Position Chest",
      f9272587d5db5c5206a9a8362bbd13852a3000ee: "**Position Head and",
      "90415d9ca9cd9a06524ea9093fc9c3b924425d16": "**Combat",
    },
  },
  {
    op: "ignoreImages",
    target: "ALL",
    imageIds: [
      "3486f0f0a099b0ad2c78ad2473e124ce7773ac41",
      "ca37d61314b21eb8fa98ca7bb77ed4e12fefb87a",
      "a9c7f5ea9f90a92b540e81a1c5e041e13e2f38f2",
      "cfc11a9615ed255df02a0854ad00c1bcb30520d8",
    ],
  },
  {
    op: "addTag",
    tag: "lineageAdvantage",
    target: {
      childrenOf: { parent: { titleRegex: "Lineage Advantages" } },
    },
  },
  {
    op: "addTag",
    tag: "classAdvantage",
    target: {
      childrenOf: { parent: { titleRegex: "Class Advantages" } },
    },
  },
  {
    op: "addTag",
    tag: "treasure",
    target: {
      and: [
        { childrenOf: { parent: { titleRegex: "Treasure Manifest" } } },
        { not: { contentRegex: "^Epic [Tt]reasure\\." } },
      ],
    },
  },
  {
    op: "addTag",
    tag: "deepTreasure",
    target: {
      and: [
        { childrenOf: { parent: { titleRegex: "Treasure Manifest" } } },
        { contentRegex: "^Epic [Tt]reasure\\." },
      ],
    },
  },
  ...spellColorRules(),
  {
    op: "extractFooter",
    target: "ALL",
    title: "Credits",
  },
];
