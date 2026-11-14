import type { PlayerAidSpec } from ".";

/**
 * Catalogue of player aids to build. Each is a themed compilation of rules
 * hand-picked from across all rulebooks, including directly relevant optional
 * rules, but not individual card effects or class powers.
 * The `derive` build script writes each one to
 * `data/derived/player-aids/<slug>.json`; the routing/UI layer then treats
 * them as regular docs.
 *
 * Picks use `titleRegex` (doc-gated, plus `level` where a title repeats) so
 * they survive re-extraction even if hierarchical ids shift.
 */
export const PLAYER_AIDS: PlayerAidSpec[] = [
  {
    slug: "monster-activation",
    title: "Monster Activation",
    description:
      "Rules for the Monster Activation step of the Battle Phase, " +
      "gathered from across the rulebooks, including directly relevant optional rules.",
    groups: [
      {
        title: "The Activation Step",
        items: [
          // core 5.0.1.2 — what the four Summoning Dice are
          { pick: { doc: "core", titleRegex: "^Summoning Dice$" } },
          // core 6.2.1 — the activation procedure (level gate: the summoning
          // example contains an identically titled subsection)
          {
            pick: { doc: "core", titleRegex: "^Monster Activation$", level: 3 },
          },
          // eastern-reaches 3.2 — the expansion's extra gray die
          { pick: { doc: "eastern-reaches", titleRegex: "^New Summoning Die$" } },
        ],
      },
      {
        title: "Making Noise",
        items: [
          // core 6.1.2.3.2 — making noise triggers an extra summoning roll
          { pick: { doc: "core", titleRegex: "Make Noise" } },
        ],
      },
      {
        title: "Natives",
        items: [
          // natives-and-legends 2.6 — the white Native Summoning Die
          {
            pick: {
              doc: "natives-and-legends",
              titleRegex: "^Native Summoning$",
            },
          },
          // natives-and-legends 2.7 — insults are Step 3 of Monster Activation
          { pick: { doc: "natives-and-legends", titleRegex: "^Insults$" } },
        ],
      },
      {
        title: "Optional Rules",
        items: [
          // natives-and-legends 4.2 — d6 decides the summoning clearing
          {
            pick: {
              doc: "natives-and-legends",
              titleRegex: "^Roaming Monsters$",
            },
          },
          // eastern-reaches 4.5 — d6-driven Native summoning
          { pick: { doc: "eastern-reaches", titleRegex: "^Roaming Natives$" } },
          // wildlands 3.4 — Guardians only return on the dot-less arrow
          { pick: { doc: "wildlands", titleRegex: "^Stubborn Guardians$" } },
        ],
      },
    ],
  },
];
