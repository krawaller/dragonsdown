import { getMagicTypeById } from "./magic";
import {
  sectionAnchorIdFor,
  sectionContentAnchorIdFor,
} from "./rulebook-anchors";
import { normalizeTitle } from "./tts";
import { getAllClasses } from "./tts/lookup";
import monsterReferenceAliases from "../../data/manual/monster-reference-aliases.json";
import relatedClassAbilities from "../../data/manual/related-class-abilities.json";
import {
  RULEBOOKS,
  loadSections,
  type Rulebook,
  type Section,
  type SectionLocation,
} from "./rulebooks";

export const ANY_DOC = "ANY_DOC";

export type RulebookLinkQuery = {
  doc: typeof ANY_DOC | string;
  headings: string[];
  anchor?: string;
};

export type RulebookLink = {
  docSlug: string;
  docTitle: string;
  sectionId: string;
  sectionTitle: string;
  content: string;
  anchor?: string;
  icon?: string;
  icons?: string[];
  location?: SectionLocation;
  href: string;
};

type MonsterReferenceAliasMap = Record<string, string | string[]>;
type RelatedClassAbilityMap = {
  monsterGroups?: Record<string, string[]>;
  sites?: Record<string, string[]>;
};

export async function resolveRulebookLinks(
  query: RulebookLinkQuery,
): Promise<RulebookLink[]> {
  if (query.headings.length === 0) return [];

  const books = rulebooksForQuery(query.doc);
  const links = await Promise.all(
    books.map(async (book) => {
      const sections = await loadSections(book);
      return resolveSections(book, sections, query.headings, query.anchor);
    }),
  );

  return links.flat().sort(compareRulebookLinks);
}

export async function resolveSiteRulebookLinks(
  siteName: string,
): Promise<RulebookLink[]> {
  const [siteLinks, classAbilityLinks] = await Promise.all([
    resolveRulebookLinks({
      doc: ANY_DOC,
      headings: [
        "Treasure Site Reference|Treasure Site and Merchant Reference",
        siteName,
      ],
    }),
    Promise.all(
      relatedClassAbilityTitlesForSite(siteName).map(
        resolveClassAdvantageRulebookLinks,
      ),
    ),
  ]);

  return uniqueRulebookLinks([...siteLinks, ...classAbilityLinks.flat()]).sort(
    compareRulebookLinks,
  );
}

export async function resolveMonsterRulebookLinks(
  groupName: string,
  individualNames: string[] = [],
): Promise<RulebookLink[]> {
  const candidates = uniqueNonEmpty(
    expandMonsterReferenceAliases([groupName, ...individualNames]),
  );
  const relatedClassAbilityTitles =
    relatedClassAbilityTitlesForMonsterGroup(groupName);
  if (candidates.length === 0 && relatedClassAbilityTitles.length === 0)
    return [];

  const normalizedCandidates = candidates.map(normalizeRulebookMatchTitle);
  const books = rulebooksForQuery(ANY_DOC);
  const [monsterLinks, classAbilityLinks] = await Promise.all([
    candidates.length > 0
      ? Promise.all(
          books.map(async (book) => {
            const sections = await loadSections(book);
            const monsterParents = sections.filter((section) =>
              titlesMatch(section.title, "Monster Reference|Monster Manifest"),
            );

            return monsterParents.flatMap((parent) =>
              childSections(sections, parent)
                .filter((section) =>
                  monsterTitleMatches(section.title, normalizedCandidates),
                )
                .map((section) => rulebookLinkForSection(book, section)),
            );
          }),
        )
      : Promise.resolve([]),
    Promise.all(
      relatedClassAbilityTitles.map(resolveClassAdvantageRulebookLinks),
    ),
  ]);

  return uniqueRulebookLinks([
    ...monsterLinks.flat(),
    ...classAbilityLinks.flat(),
  ]).sort(compareRulebookLinks);
}

export async function resolveNativeRulebookLinks(
  groupName: string,
  individualNames: string[] = [],
): Promise<RulebookLink[]> {
  const candidates = uniqueNonEmpty([groupName, ...individualNames]);
  if (candidates.length === 0) return [];

  const normalizedCandidates = candidates.map(normalizeRulebookMatchTitle);
  const books = rulebooksForQuery(ANY_DOC);
  const links = await Promise.all(
    books.map(async (book) => {
      const sections = await loadSections(book);
      const nativeParents = sections.filter((section) =>
        titlesMatch(section.title, "Native Reference"),
      );

      return nativeParents.flatMap((parent) =>
        childSections(sections, parent)
          .filter((section) =>
            nativeTitleMatches(section.title, normalizedCandidates),
          )
          .map((section) => rulebookLinkForSection(book, section)),
      );
    }),
  );

  return uniqueRulebookLinks(links.flat()).sort(compareRulebookLinks);
}

export async function resolveClassAdvantageRulebookLinks(
  advantageTitle: string,
): Promise<RulebookLink[]> {
  return resolveRulebookLinks({
    doc: ANY_DOC,
    headings: ["Class Advantages", advantageTitle],
  });
}

export async function resolveLineageAdvantageRulebookLinks(
  advantageTitle: string,
): Promise<RulebookLink[]> {
  return resolveRulebookLinks({
    doc: ANY_DOC,
    headings: [
      "Lineage Advantages",
      lineageAdvantageTitleAlternatives(advantageTitle).join("|"),
    ],
  });
}

export async function resolveSpellRulebookLinks(
  spellTitle: string,
): Promise<RulebookLink[]> {
  return resolveRulebookLinks({
    doc: ANY_DOC,
    headings: ["Spell Manifest", spellTitle],
  });
}

export async function resolveEquipmentRulebookLinks({
  name,
  hasTreasure,
  hasItem,
}: {
  name: string;
  hasTreasure: boolean;
  hasItem: boolean;
}): Promise<RulebookLink[]> {
  const links = await Promise.all([
    hasTreasure ? resolveTreasureRulebookLinks(name) : Promise.resolve([]),
    hasItem && isHorseEquipment(name)
      ? resolveRulebookLinks({
          doc: ANY_DOC,
          headings: ["Horse Cards"],
        })
      : Promise.resolve([]),
  ]);

  return uniqueRulebookLinks(links.flat()).sort(compareRulebookLinks);
}

async function resolveTreasureRulebookLinks(
  treasureTitle: string,
): Promise<RulebookLink[]> {
  const normalizedTitle = normalizeRulebookMatchTitle(treasureTitle);
  const books = rulebooksForQuery(ANY_DOC);
  const links = await Promise.all(
    books.map(async (book) => {
      const sections = await loadSections(book);
      const treasureParents = sections.filter((section) =>
        titlesMatch(section.title, "Treasure Manifest"),
      );

      return treasureParents.flatMap((parent) =>
        childSections(sections, parent)
          .filter(
            (section) =>
              normalizeRulebookMatchTitle(section.title) === normalizedTitle,
          )
          .map((section) => rulebookLinkForSection(book, section)),
      );
    }),
  );

  return uniqueRulebookLinks(links.flat()).sort(compareRulebookLinks);
}

function isHorseEquipment(name: string): boolean {
  return /\bhorse\b/i.test(name);
}

export async function resolveMagicRulebookLinks(
  magic: string,
  doc: RulebookLinkQuery["doc"] = ANY_DOC,
): Promise<RulebookLink[]> {
  const type = getMagicTypeById(magic);
  if (!type) return [];

  return resolveRulebookLinks({
    doc,
    headings: ["Spell Manifest", type.heading],
  });
}

export async function resolveOptionalRulebookLinks(
  ruleTitles: string[],
): Promise<RulebookLink[]> {
  const titles = uniqueNonEmpty(ruleTitles);
  if (titles.length === 0) return [];

  const links = await Promise.all(
    titles.map((title) =>
      resolveRulebookLinks({
        doc: ANY_DOC,
        headings: ["OPTIONAL RULES", title],
      }),
    ),
  );

  return uniqueRulebookLinks(links.flat()).sort(compareRulebookLinks);
}

function rulebooksForQuery(doc: RulebookLinkQuery["doc"]): Rulebook[] {
  if (doc === ANY_DOC) return RULEBOOKS;
  return RULEBOOKS.filter((book) => book.slug === doc);
}

function resolveSections(
  book: Rulebook,
  sections: Section[],
  headings: string[],
  anchor?: string,
): RulebookLink[] {
  let candidates = sections.filter((section) =>
    titlesMatch(section.title, headings[0]),
  );

  for (const heading of headings.slice(1)) {
    candidates = candidates.flatMap((parent) =>
      childSections(sections, parent).filter((section) =>
        titlesMatch(section.title, heading),
      ),
    );
  }

  return candidates.map((section) => ({
    docSlug: book.slug,
    docTitle: book.title,
    sectionId: section.id,
    sectionTitle: section.title,
    content: section.content,
    anchor,
    icon: section.icon,
    icons: section.icons,
    location: section.location,
    href: `/${book.slug}#${linkAnchorIdFor(section, anchor)}`,
  }));
}

function rulebookLinkForSection(
  book: Rulebook,
  section: Section,
): RulebookLink {
  return {
    docSlug: book.slug,
    docTitle: book.title,
    sectionId: section.id,
    sectionTitle: section.title,
    content: section.content,
    icon: section.icon,
    icons: section.icons,
    location: section.location,
    href: `/${book.slug}#${sectionAnchorIdFor(section)}`,
  };
}

function linkAnchorIdFor(section: Section, anchor?: string): string {
  return anchor
    ? sectionContentAnchorIdFor(section, anchor)
    : sectionAnchorIdFor(section);
}

function childSections(sections: Section[], parent: Section): Section[] {
  const prefix = `${parent.id}.`;
  return sections.filter((section) => section.id.startsWith(prefix));
}

function titlesMatch(left: string, right: string): boolean {
  const normalizedLeft = normalizeRulebookHeadingTitle(left);
  return titleAlternatives(right).some(
    (title) => normalizedLeft === normalizeRulebookHeadingTitle(title),
  );
}

function normalizeRulebookHeadingTitle(title: string): string {
  return normalizeTitle(title)
    .replace(/[.:]+$/g, "")
    .trim();
}

function titleAlternatives(title: string): string[] {
  return title.split("|").map((part) => part.trim());
}

function lineageAdvantageTitleAlternatives(title: string): string[] {
  const match = title.match(/^(.*?)(\s+\(.*\))?$/);
  if (!match) return [title];

  const base = match[1]?.trim();
  if (!base) return [title];

  const suffix = match[2] ?? "";
  return Array.from(new Set(titleForms(base)), (form) => `${form}${suffix}`);
}

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function expandMonsterReferenceAliases(titles: string[]): string[] {
  const aliasMap = normalizedMonsterReferenceAliasMap();
  return titles.flatMap((title) => [
    title,
    ...monsterReferenceAliasesFor(title, aliasMap),
  ]);
}

function normalizedMonsterReferenceAliasMap(): MonsterReferenceAliasMap {
  const aliases: MonsterReferenceAliasMap = {};
  const raw = monsterReferenceAliases as MonsterReferenceAliasMap;

  for (const [from, to] of Object.entries(raw)) {
    aliases[normalizeRulebookMatchTitle(from)] = Array.isArray(to)
      ? to.map(normalizeRulebookMatchTitle)
      : normalizeRulebookMatchTitle(to);
  }

  return aliases;
}

function monsterReferenceAliasesFor(
  title: string,
  aliasMap: MonsterReferenceAliasMap,
): string[] {
  return titleForms(normalizeRulebookMatchTitle(title)).flatMap((form) => {
    const aliases = aliasMap[form];
    if (!aliases) return [];
    return Array.isArray(aliases) ? aliases : [aliases];
  });
}

function normalizeRulebookMatchTitle(title: string): string {
  return normalizeTitle(title).toLowerCase();
}

function monsterTitleMatches(
  sectionTitle: string,
  normalizedCandidates: string[],
): boolean {
  const normalizedSectionTitle = normalizeRulebookMatchTitle(sectionTitle);

  return normalizedCandidates.some((candidate) =>
    monsterTitleCandidateMatches(normalizedSectionTitle, candidate),
  );
}

function monsterTitleCandidateMatches(
  normalizedSectionTitle: string,
  normalizedCandidate: string,
): boolean {
  return titleForms(normalizedCandidate).some(
    (candidate) =>
      normalizedSectionTitle === candidate ||
      normalizedSectionTitle.startsWith(`${candidate} `),
  );
}

function nativeTitleMatches(
  sectionTitle: string,
  normalizedCandidates: string[],
): boolean {
  const normalizedSectionTitle = normalizeRulebookMatchTitle(sectionTitle);

  return normalizedCandidates.some((candidate) =>
    nativeTitleCandidateMatches(normalizedSectionTitle, candidate),
  );
}

function nativeTitleCandidateMatches(
  normalizedSectionTitle: string,
  normalizedCandidate: string,
): boolean {
  return nativeTitleForms(normalizedCandidate).some(
    (candidate) => normalizedSectionTitle === candidate,
  );
}

function nativeTitleForms(title: string): string[] {
  const forms = titleForms(title).flatMap((form) => {
    const singularNumbered = form.replace(/s\s+(\d+)$/, " $1");
    return [form, form.replace(/\s+(\d+)$/, "$1"), singularNumbered];
  });
  return Array.from(new Set(forms));
}

function titleForms(title: string): string[] {
  if (title.endsWith("ves")) return [title, `${title.slice(0, -3)}f`];
  if (title.endsWith("f")) return [title, `${title.slice(0, -1)}ves`];
  if (title.endsWith("s")) return [title, title.slice(0, -1)];
  return [title, `${title}s`];
}

function relatedClassAbilityTitlesForMonsterGroup(groupName: string): string[] {
  const map =
    (relatedClassAbilities as RelatedClassAbilityMap).monsterGroups ?? {};
  const normalizedGroupName = normalizeTitle(groupName);
  for (const [mappedGroupName, abilities] of Object.entries(map)) {
    if (normalizeTitle(mappedGroupName) === normalizedGroupName) {
      return uniqueNonEmpty(
        abilities.flatMap(classAdvantageTitlesForClassName),
      );
    }
  }
  return [];
}

function relatedClassAbilityTitlesForSite(siteName: string): string[] {
  const map = (relatedClassAbilities as RelatedClassAbilityMap).sites ?? {};
  const normalizedSiteName = normalizeTitle(siteName);
  for (const [mappedSiteName, relatedNames] of Object.entries(map)) {
    if (normalizeTitle(mappedSiteName) === normalizedSiteName) {
      return uniqueNonEmpty(
        relatedNames.flatMap((relatedName) => [
          ...relatedClassAbilityTitlesForMonsterGroup(relatedName),
          ...classAdvantageTitlesForClassName(relatedName),
        ]),
      );
    }
  }
  return [];
}

function classAdvantageTitlesForClassName(name: string): string[] {
  const normalizedName = normalizeTitle(name);
  const classEntry = getAllClasses().find(
    (entry) => normalizeTitle(entry.name) === normalizedName,
  );
  if (!classEntry) return [name];

  return uniqueNonEmpty(
    classEntry.classes.map((entry) => entry.advantageTitle ?? classEntry.name),
  );
}

function uniqueRulebookLinks(links: RulebookLink[]): RulebookLink[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.docSlug}:${link.sectionId}:${link.anchor ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function compareRulebookLinks(a: RulebookLink, b: RulebookLink): number {
  return (
    a.docTitle.localeCompare(b.docTitle) ||
    a.sectionTitle.localeCompare(b.sectionTitle) ||
    (a.anchor ?? "").localeCompare(b.anchor ?? "") ||
    a.sectionId.localeCompare(b.sectionId)
  );
}
