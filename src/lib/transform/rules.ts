import type { Rule } from ".";

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
    ],
  },
  {
    op: "addTag",
    tag: "classAdvantage",
    target: {
      childrenOf: { parent: { titleRegex: "Class Advantages" } },
    },
  },
];
