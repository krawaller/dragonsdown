import { normalizeTitle } from "@/lib/tts";
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

function childSections(sections: Section[], parent: Section): Section[] {
  const prefix = `${parent.id}.`;
  return sections.filter((section) => section.id.startsWith(prefix));
}

function titlesMatch(left: string, right: string): boolean {
  return normalizeTitle(left) === normalizeTitle(right);
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
