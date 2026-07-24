import { slugify } from "./slug";
import {
  resolveClassAdvantageRulebookLinks,
  resolveRulebookLinks,
  type RulebookLink,
  type RulebookLinkQuery,
} from "./rulebook-links";
import actionRules from "../../data/manual/action-rules.json";
import { getClassBySlug } from "./tts/lookup";

type ActionRuleEntry = {
  classes?: string[];
  rulebookLinks: RulebookLinkQuery[];
};

export type ActionEntry = {
  name: string;
  slug: string;
  classes: string[];
  rulebookLinks: RulebookLink[];
  icon?: string;
};

export async function getAllActions(): Promise<ActionEntry[]> {
  return Promise.all(
    Object.entries(actionRules as Record<string, ActionRuleEntry>).map(
      async ([name, entry]) => actionEntryFor(name, entry),
    ),
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
  const rulebookLinks = await resolveActionRulebookLinks(entry, classSlugs);

  return {
    name: actionNameFor(name),
    slug: slugify(name),
    classes: classSlugs,
    rulebookLinks,
    icon: iconForAction(rulebookLinks),
  };
}

async function resolveActionRulebookLinks(
  entry: ActionRuleEntry,
  classSlugs: string[],
): Promise<RulebookLink[]> {
  const links = await Promise.all([
    ...entry.rulebookLinks.map((query) => resolveRulebookLinks(query)),
    ...uniqueSlugs(classSlugs).map((classSlug) =>
      resolveClassRulebookLinks(classSlug),
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
