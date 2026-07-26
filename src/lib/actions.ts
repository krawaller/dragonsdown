import { slugify } from "./slug";
import {
  resolveClassAdvantageRulebookLinks,
  resolveLineageAdvantageRulebookLinks,
  resolveRulebookLinks,
  resolveSpellRulebookLinks,
  type RulebookLink,
  type RulebookLinkQuery,
} from "./rulebook-links";
import ruleReferences from "../../data/manual/rule-references.json";
import { getClassBySlug, getLineageBySlug, getSpellBySlug } from "./tts/lookup";

type ActionRuleEntry = {
  classes?: string[];
  lineages?: string[];
  spells?: string[];
  rulebookLinks: RulebookLinkQuery[];
};

export type ActionEntry = {
  name: string;
  slug: string;
  classes: string[];
  lineages: string[];
  spells: string[];
  rulebookLinks: RulebookLink[];
  icon?: string;
};

export async function getAllActions(): Promise<ActionEntry[]> {
  return Promise.all(
    Object.entries(
      ruleReferences.actions as Record<string, ActionRuleEntry>,
    ).map(async ([name, entry]) => actionEntryFor(name, entry)),
  );
}

export async function getActionBySlug(
  slug: string,
): Promise<ActionEntry | undefined> {
  const actions = await getAllActions();
  return actions.find((entry) => entry.slug === slug);
}

async function actionEntryFor(
  name: string,
  entry: ActionRuleEntry,
): Promise<ActionEntry> {
  const classSlugs = entry.classes ?? [];
  const lineageSlugs = entry.lineages ?? [];
  const spellSlugs = entry.spells ?? [];
  const rulebookLinks = await resolveActionRulebookLinks(
    entry,
    classSlugs,
    lineageSlugs,
    spellSlugs,
  );

  return {
    name: actionNameFor(name),
    slug: slugify(name),
    classes: classSlugs,
    lineages: lineageSlugs,
    spells: spellSlugs,
    rulebookLinks,
    icon: iconForAction(rulebookLinks),
  };
}

async function resolveActionRulebookLinks(
  entry: ActionRuleEntry,
  classSlugs: string[],
  lineageSlugs: string[],
  spellSlugs: string[],
): Promise<RulebookLink[]> {
  const links = await Promise.all([
    ...entry.rulebookLinks.map((query) => resolveRulebookLinks(query)),
    ...uniqueSlugs(classSlugs).map((classSlug) =>
      resolveClassRulebookLinks(classSlug),
    ),
    ...uniqueSlugs(lineageSlugs).map((lineageSlug) =>
      resolveLineageRulebookLinks(lineageSlug),
    ),
    ...uniqueSlugs(spellSlugs).map((spellSlug) =>
      resolveActionSpellRulebookLinks(spellSlug),
    ),
  ]);

  return uniqueRulebookLinks(links.flat());
}

async function resolveClassRulebookLinks(
  classSlug: string,
): Promise<RulebookLink[]> {
  const entry = getClassBySlug(slugify(classSlug));
  const ttsClass = entry?.classes[0];
  if (!entry || !ttsClass) {
    throw new Error(`Unknown action class rule reference: ${classSlug}`);
  }

  return resolveClassAdvantageRulebookLinks(ttsClass.advantageTitle);
}

async function resolveLineageRulebookLinks(
  lineageSlug: string,
): Promise<RulebookLink[]> {
  const entry = getLineageBySlug(slugify(lineageSlug));
  const lineage = entry?.lineages[0];
  if (!entry || !lineage) {
    throw new Error(`Unknown action lineage rule reference: ${lineageSlug}`);
  }

  return resolveLineageAdvantageRulebookLinks(lineage.advantageTitle);
}

async function resolveActionSpellRulebookLinks(
  spellSlug: string,
): Promise<RulebookLink[]> {
  const entry = getSpellBySlug(slugify(spellSlug));
  if (!entry) {
    throw new Error(`Unknown action spell rule reference: ${spellSlug}`);
  }

  return resolveSpellRulebookLinks(entry.name);
}

function uniqueSlugs(slugs: string[]): string[] {
  return Array.from(new Set(slugs));
}

function uniqueRulebookLinks(links: RulebookLink[]): RulebookLink[] {
  return Array.from(
    new Map(
      links.map(
        (link) =>
          [
            `${link.docSlug}:${link.sectionId}:${link.anchor ?? ""}`,
            link,
          ] as const,
      ),
    ).values(),
  );
}

function actionNameFor(name: string): string {
  return name.replace(/\b\p{L}/gu, (match) => match.toUpperCase());
}

function iconForAction(rulebookLinks: RulebookLink[]): string | undefined {
  const firstLink = rulebookLinks[0];
  return firstLink?.icon ?? firstLink?.icons?.[0];
}
