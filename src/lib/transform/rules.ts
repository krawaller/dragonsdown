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
        { not: { contentRegex: "^Epic treasure\\." } },
      ],
    },
  },
  {
    op: "addTag",
    tag: "deepTreasure",
    target: {
      and: [
        { childrenOf: { parent: { titleRegex: "Treasure Manifest" } } },
        { contentRegex: "^Epic treasure\\." },
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
