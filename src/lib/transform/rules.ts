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
    op: "dedupeImages",
    target: { doc: "core", titleRegex: "^Game Setup$" },
    imageIds: ["e961cf4da33509818ad29a561b5a655cd791499f"],
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
    op: "replaceTitle",
    target: { doc: "core", titleRegex: "^Natives \\(far right\\)$" },
    title: "Natives",
  },
  {
    op: "replaceTitle",
    target: {
      doc: "core",
      titleRegex: "^Civilization Cards and Titles \\(far right\\)$",
    },
    title: "Civilization Cards and Titles",
  },
  {
    op: "replaceContent",
    target: { doc: "core", titleRegex: "^Golden Rule of Damage:$" },
    from: "(*arrow symbol on the Monster, Weapon*\n\n*Card, or Spell Card*)",
    to: "(*arrow symbol on the Monster, Weapon Card, or Spell Card*)",
  },
  {
    op: "floatImagesAtAnchors",
    target: { doc: "core", titleRegex: "^Combat Steps$" },
    direction: "right",
    anchors: {
      "5ea310ce38685a2f70c774fca67fd5f892ea8baf":
        "If the attacker’s attack speed is faster than the target’s maneuver speed,",
      cb442c7b50f04d0747de8db542eccc2af9371a20:
        "If the attacker’s attack speed is faster than the target’s maneuver speed,",
      ce0485b25783048d07f54d9e3938e6f10602f54d:
        "If the attacker’s attack speed is faster than the target’s maneuver speed,",
    },
  },
  {
    op: "replaceSectionRange",
    target: { doc: "core" },
    from: { titleRegex: "^TURN SEQUENCE$", level: 1 },
    to: { titleRegex: "^Living Legend$", level: 3 },
    title: "Final page summary omitted",
    tag: "omittedFinalPageSummary",
  },
  {
    op: "replaceSectionRange",
    target: { doc: "eastern-reaches" },
    from: { titleRegex: "^Ferries$", level: 2 },
    to: { titleRegex: "^Pack$", level: 3 },
    title: "Final page summary omitted",
    tag: "omittedFinalPageSummary",
  },
  {
    op: "replaceSectionRange",
    target: { doc: "natives-and-legends" },
    from: {
      titleRegex: "^Hiring Natives \\(abbreviated: see full rules\\)$",
      level: 2,
    },
    to: { titleRegex: "^Pack$", level: 3 },
    title: "Final page summary omitted",
    tag: "omittedFinalPageSummary",
  },
  {
    op: "extractFooter",
    target: "ALL",
    title: "Credits",
  },
  {
    op: "floatImages",
    target: { titleRegex: "^Credits$" },
    direction: "right",
  },
];
