import { normalizeTitle } from "@/lib/tts";
import monsterReferenceAliases from "../../data/manual/monster-reference-aliases.json";
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
};

export type RulebookLink = {
  docSlug: string;
  docTitle: string;
  sectionId: string;
  sectionTitle: string;
  content: string;
  location?: SectionLocation;
  href: string;
};

type MonsterReferenceAliasMap = Record<string, string | string[]>;

export async function resolveRulebookLinks(
  query: RulebookLinkQuery,
): Promise<RulebookLink[]> {
  if (query.headings.length === 0) return [];

  const books = rulebooksForQuery(query.doc);
  const links = await Promise.all(
    books.map(async (book) => {
      const sections = await loadSections(book);
      return resolveSections(book, sections, query.headings);
    }),
  );

  return links.flat().sort(compareRulebookLinks);
}

export async function resolveMonsterRulebookLinks(
  groupName: string,
  individualNames: string[] = [],
): Promise<RulebookLink[]> {
  const candidates = uniqueNonEmpty(
    expandMonsterReferenceAliases([groupName, ...individualNames]),
  );
  if (candidates.length === 0) return [];

  const normalizedCandidates = candidates.map(normalizeRulebookMatchTitle);
  const books = rulebooksForQuery(ANY_DOC);
  const links = await Promise.all(
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
  );

  return uniqueRulebookLinks(links.flat()).sort(compareRulebookLinks);
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
    location: section.location,
    href: `/${book.slug}#${anchorIdFor(section)}`,
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
    location: section.location,
    href: `/${book.slug}#${anchorIdFor(section)}`,
  };
}

function childSections(sections: Section[], parent: Section): Section[] {
  const prefix = `${parent.id}.`;
  return sections.filter((section) => section.id.startsWith(prefix));
}

function titlesMatch(left: string, right: string): boolean {
  const normalizedLeft = normalizeTitle(left);
  return titleAlternatives(right).some(
    (title) => normalizedLeft === normalizeTitle(title),
  );
}

function titleAlternatives(title: string): string[] {
  return title.split("|").map((part) => part.trim());
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

function titleForms(title: string): string[] {
  if (title.endsWith("s")) return [title, title.slice(0, -1)];
  return [title, `${title}s`];
}

function uniqueRulebookLinks(links: RulebookLink[]): RulebookLink[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.docSlug}:${link.sectionId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function anchorIdFor(section: Section): string {
  return `${section.source}-${section.id}`;
}

function compareRulebookLinks(a: RulebookLink, b: RulebookLink): number {
  return (
    a.docTitle.localeCompare(b.docTitle) ||
    a.sectionTitle.localeCompare(b.sectionTitle) ||
    a.sectionId.localeCompare(b.sectionId)
  );
}
