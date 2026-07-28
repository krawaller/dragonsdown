import { getMagicTypeById } from "./magic";
import {
  markdownSliceForAnchor,
  sectionAnchorIdFor,
  sectionContentAnchorIdFor,
} from "./rulebook-anchors";
import { slugify } from "./slug";
import { normalizeTitle } from "./tts";
import { getAllClasses, getAllLineages, getAllSpells } from "./tts/lookup";
import monsterReferenceAliases from "../../data/manual/monster-reference-aliases.json";
import relatedClassAbilities from "../../data/manual/related-class-abilities.json";
import ruleReferences from "../../data/manual/rule-references.json";
import {
  RULEBOOKS,
  contentNodesForMarkdown,
  loadSections,
  markdownFromContentNodes,
  type Rulebook,
  type Section,
  type SectionContentNode,
  type SectionImageContentNode,
  type SectionLocation,
} from "./rulebooks";

export const ANY_DOC = "ANY_DOC";

export type RulebookLinkQuery = {
  doc: typeof ANY_DOC | string;
  headings: string[];
  anchor?: string;
  title?: string;
  preferIconIndex?: number;
  omitIcon?: boolean;
  includeChildren?: boolean;
  anchorIndex?: number;
  anchorRange?: [number, number];
};

export type RulebookLink = {
  docSlug: string;
  docTitle: string;
  sectionId: string;
  sectionTitle: string;
  title?: string;
  optionalRule?: boolean;
  content: string;
  contentNodes?: SectionContentNode[];
  anchor?: string;
  icon?: string;
  icons?: string[];
  location?: SectionLocation;
  href: string;
  ruleReferenceSortGroup?: number;
};

type MonsterReferenceAliasMap = Record<string, string | string[]>;
type RelatedClassAbilityMap = {
  monsterGroups?: Record<string, string[]>;
  sites?: Record<string, string[]>;
};
type RuleReferenceEntry = {
  classes?: string[];
  lineages?: string[];
  spells?: string[];
  rulebookLinks?: RulebookLinkQuery[];
};
type RuleReferenceMap = Record<string, RuleReferenceEntry>;
type RulebookLinkPreview = {
  content: string;
  contentNodes: SectionContentNode[];
  icons?: string[];
};

export async function resolveRulebookLinks(
  query: RulebookLinkQuery,
): Promise<RulebookLink[]> {
  if (query.headings.length === 0) return [];

  const books = rulebooksForQuery(query.doc);
  const links = await Promise.all(
    books.map(async (book) => {
      const sections = await loadSections(book);
      return resolveSections(book, sections, query);
    }),
  );

  const resolvedLinks = links.flat();
  return query.includeChildren
    ? resolvedLinks
    : resolvedLinks.sort(compareRulebookLinks);
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

export async function resolveClassRulebookLinks({
  slug,
  advantageTitle,
}: {
  slug: string;
  advantageTitle: string;
}): Promise<RulebookLink[]> {
  const links = await Promise.all([
    resolveClassAdvantageRulebookLinks(advantageTitle),
    resolveRuleReferenceLinksForSlug(
      ruleReferences.classes as RuleReferenceMap,
      slug,
    ),
  ]);

  return uniqueRulebookLinks(links.flat()).sort(compareRulebookLinks);
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

export async function resolveLineageRulebookLinks({
  slug,
  advantageTitle,
}: {
  slug: string;
  advantageTitle: string;
}): Promise<RulebookLink[]> {
  const [advantageLinks, referenceLinks] = await Promise.all([
    resolveLineageAdvantageRulebookLinks(advantageTitle),
    resolveRuleReferenceLinksForSlug(
      ruleReferences.lineages as RuleReferenceMap,
      slug,
    ),
  ]);

  return uniqueRulebookLinks([...advantageLinks, ...referenceLinks]);
}

export async function resolveSpellRulebookLinks(
  spellTitle: string,
): Promise<RulebookLink[]> {
  const links = await resolveRulebookLinks({
    doc: ANY_DOC,
    headings: ["Spell Manifest", spellTitle],
  });
  const icon = await spellMagicIconFor(spellTitle);
  if (!icon) return links;

  return links.map((link) => ({
    ...link,
    icon,
    icons: undefined,
  }));
}

async function spellMagicIconFor(
  spellTitle: string,
): Promise<string | undefined> {
  const spell = spellEntryForTitle(spellTitle)?.spells[0];
  const magic = spell?.magic[0];
  if (!magic) return undefined;

  const links = await resolveMagicRulebookLinks(magic, "core");
  return links.find((link) => Boolean(link.icon))?.icon;
}

function spellEntryForTitle(spellTitle: string) {
  const normalizedTitle = normalizeTitle(spellTitle);
  const slug = slugify(spellTitle);
  return getAllSpells().find(
    (entry) =>
      entry.slug === slug || normalizeTitle(entry.name) === normalizedTitle,
  );
}

export async function resolveEquipmentRulebookLinks({
  name,
  hasTreasure,
  hasItem,
  hasLegendaryTreasure,
}: {
  name: string;
  hasTreasure: boolean;
  hasItem: boolean;
  hasLegendaryTreasure: boolean;
}): Promise<RulebookLink[]> {
  const slug = slugify(name);
  const treasureLinks = hasTreasure
    ? await resolveTreasureRulebookLinks(name)
    : [];
  const dynamicTags = equipmentRuleReferenceTags({
    name,
    hasEpicTreasure: hasEpicTreasureDescription(treasureLinks),
    hasItem,
    hasLegendaryTreasure,
  });
  const links = await Promise.all([
    Promise.resolve(treasureLinks),
    resolveRuleReferenceLinksForSlug(
      ruleReferences.equipment as RuleReferenceMap,
      slug,
      dynamicTags,
    ),
  ]);

  return uniqueRulebookLinks(links.flat()).sort(compareRulebookLinks);
}

function equipmentRuleReferenceTags({
  name,
  hasEpicTreasure,
  hasItem,
  hasLegendaryTreasure,
}: {
  name: string;
  hasEpicTreasure: boolean;
  hasItem: boolean;
  hasLegendaryTreasure: boolean;
}): string[] {
  return [
    ...(hasEpicTreasure ? ["_epic-treasure"] : []),
    ...(hasLegendaryTreasure ? ["_legendary-treasure"] : []),
    ...(hasItem && isHorseEquipment(name) ? ["_horse"] : []),
  ];
}

function hasEpicTreasureDescription(links: RulebookLink[]): boolean {
  return links.some((link) => /\bEpic Treasure\b/i.test(link.content));
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

  const spellManifestLinks = await resolveRulebookLinks({
    doc: doc === ANY_DOC ? "core" : doc,
    headings: ["Spell Manifest", type.heading],
  });

  if (doc !== ANY_DOC) return spellManifestLinks;

  const manualLinks = await resolveMagicManualRulebookLinks(type.id);
  return uniqueRulebookLinks([...spellManifestLinks, ...manualLinks]);
}

async function resolveMagicManualRulebookLinks(
  magic: string,
): Promise<RulebookLink[]> {
  return resolveRuleReferenceLinksForSlug(
    ruleReferences.magic as RuleReferenceMap,
    magic,
  );
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

export async function resolveWildernessTokenRulebookLinks(
  slug: string,
): Promise<RulebookLink[]> {
  return resolveRuleReferenceLinksForSlug(
    ruleReferences.wildernessTokens as RuleReferenceMap,
    slug,
  );
}

export async function resolveClearingTypeRulebookLinks(
  slug: string,
): Promise<RulebookLink[]> {
  return resolveRuleReferenceLinksForSlug(
    ruleReferences.clearingTypes as RuleReferenceMap,
    slug,
  );
}

async function resolveRuleReferenceLinksForSlug(
  rules: RuleReferenceMap,
  slug: string,
  additionalSlugs: string[] = [],
): Promise<RulebookLink[]> {
  const entries = uniqueNonEmpty([slug, ...additionalSlugs]).flatMap(
    (entrySlug) => {
      const entry = manualRuleReferenceEntryForSlug(rules, entrySlug);
      return entry ? [{ entrySlug, entry }] : [];
    },
  );
  if (entries.length === 0) return [];

  const links = await Promise.all(
    entries.map(async ({ entrySlug, entry }) => {
      const entryLinks = await resolveRuleReferenceEntryLinks(entry);
      const sortGroup = entrySlug.startsWith("_") ? 1 : 0;
      return entryLinks.map((link) => ({
        ...link,
        ruleReferenceSortGroup: sortGroup,
      }));
    }),
  );

  return uniqueRulebookLinks(links.flat()).sort(compareRulebookLinks);
}

async function resolveRuleReferenceEntryLinks(
  entry: RuleReferenceEntry,
): Promise<RulebookLink[]> {
  const links = await Promise.all([
    ...uniqueRulebookQueries(entry.rulebookLinks ?? []).map((query) =>
      resolveRulebookLinks(query),
    ),
    ...uniqueNonEmpty(entry.classes ?? [])
      .flatMap(classAdvantageTitlesForClassReference)
      .map(resolveClassAdvantageRulebookLinks),
    ...uniqueNonEmpty(entry.lineages ?? [])
      .flatMap(lineageAdvantageTitlesForLineageReference)
      .map(resolveLineageAdvantageRulebookLinks),
    ...uniqueNonEmpty(entry.spells ?? [])
      .flatMap(spellTitlesForSpellReference)
      .map(resolveSpellRulebookLinks),
  ]);

  return links.flat();
}

function manualRuleReferenceEntryForSlug(
  rules: RuleReferenceMap,
  slug: string,
): RuleReferenceEntry | undefined {
  return (
    rules[slug] ??
    Object.entries(rules).find(([key]) =>
      manualRuleKeyMatchesSlug(key, slug),
    )?.[1]
  );
}

function manualRuleKeyMatchesSlug(key: string, slug: string): boolean {
  return titleForms(normalizeTitle(key)).some((form) => slugify(form) === slug);
}

function rulebooksForQuery(doc: RulebookLinkQuery["doc"]): Rulebook[] {
  if (doc === ANY_DOC) return RULEBOOKS;
  return RULEBOOKS.filter((book) => book.slug === doc);
}

function resolveSections(
  book: Rulebook,
  sections: Section[],
  query: RulebookLinkQuery,
): RulebookLink[] {
  const {
    headings,
    anchor,
    title,
    preferIconIndex,
    omitIcon,
    includeChildren,
    anchorIndex,
    anchorRange,
  } = query;
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

  return candidates.map((section) =>
    rulebookLinkForIndexedSection(book, sections, section, {
      anchor,
      title,
      preferIconIndex,
      omitIcon,
      anchorIndex,
      anchorRange,
      optionalRule: headingsTargetOptionalRule(headings),
      childSections: includeChildren ? childSections(sections, section) : [],
    }),
  );
}

function headingsTargetOptionalRule(headings: string[]): boolean {
  return headings.some((heading) => titlesMatch(heading, "OPTIONAL RULES"));
}

function rulebookLinkForIndexedSection(
  book: Rulebook,
  sections: Section[],
  section: Section,
  options: {
    anchor?: string;
    title?: string;
    preferIconIndex?: number;
    omitIcon?: boolean;
    anchorIndex?: number;
    anchorRange?: [number, number];
    optionalRule?: boolean;
    childSections?: Section[];
  },
): RulebookLink {
  const children = childSections(sections, section);
  const indexedChild = indexedChildSection(children, options.anchorIndex);
  if (indexedChild) {
    return rulebookLinkForSection(book, indexedChild, {
      title: options.title,
      preferIconIndex: options.preferIconIndex,
      omitIcon: options.omitIcon,
      optionalRule: options.optionalRule,
    });
  }

  const rangedChildren = rangedChildSections(children, options.anchorRange);
  if (rangedChildren.length > 0) {
    return rulebookLinkForSection(book, section, {
      title: options.title,
      preferIconIndex: options.preferIconIndex,
      omitIcon: options.omitIcon,
      optionalRule: options.optionalRule,
      childSections: rangedChildren,
    });
  }

  return rulebookLinkForSection(book, section, options);
}

function indexedChildSection(
  sections: Section[],
  anchorIndex: number | undefined,
): Section | undefined {
  if (anchorIndex === undefined) return undefined;
  return sections[anchorIndex];
}

function rangedChildSections(
  sections: Section[],
  anchorRange: [number, number] | undefined,
): Section[] {
  if (anchorRange === undefined) return [];
  const [start, end] = normalizedInclusiveRange(anchorRange);
  return sections.slice(start, end + 1);
}

function rulebookLinkForSection(
  book: Rulebook,
  section: Section,
  options: {
    anchor?: string;
    title?: string;
    preferIconIndex?: number;
    omitIcon?: boolean;
    anchorIndex?: number;
    anchorRange?: [number, number];
    optionalRule?: boolean;
    childSections?: Section[];
  } = {},
): RulebookLink {
  const {
    anchor,
    title,
    preferIconIndex,
    omitIcon,
    anchorIndex,
    anchorRange,
    optionalRule,
    childSections = [],
  } = options;
  const preview = linkPreviewFor(section, anchor, anchorIndex, anchorRange);
  const childPreview = childPreviewFor(childSections);
  const contentNodes = [...preview.contentNodes, ...childPreview.contentNodes];
  const icons = [
    ...(section.icon ? [section.icon] : []),
    ...(section.icons ?? []),
    ...(preview.icons ?? []),
  ];

  return {
    docSlug: book.slug,
    docTitle: book.title,
    sectionId: section.id,
    sectionTitle: section.title,
    title,
    optionalRule,
    content: markdownFromContentNodes(contentNodes),
    contentNodes,
    anchor,
    icon: omitIcon ? undefined : iconForRulebookLink(icons, preferIconIndex),
    icons: omitIcon ? undefined : iconsForRulebookLink(icons, preferIconIndex),
    location: section.location,
    href: `/${book.slug}#${linkAnchorIdFor(section, anchor)}`,
  };
}

function childPreviewFor(sections: Section[]): RulebookLinkPreview {
  const contentNodes = sections.flatMap((section) => {
    const preview = linkPreviewFor(section);
    return [
      { kind: "markdown" as const, markdown: `### ${section.title}` },
      ...preview.contentNodes,
    ];
  });

  return {
    content: markdownFromContentNodes(contentNodes),
    contentNodes,
  };
}

function iconForRulebookLink(
  icons: string[],
  preferIconIndex?: number,
): string | undefined {
  if (
    preferIconIndex !== undefined &&
    preferIconIndex >= 0 &&
    preferIconIndex < icons.length
  ) {
    return icons[preferIconIndex];
  }
  return icons.length === 1 ? icons[0] : undefined;
}

function iconsForRulebookLink(
  icons: string[],
  preferIconIndex?: number,
): string[] | undefined {
  if (preferIconIndex !== undefined) return undefined;
  return icons.length > 1 ? icons : undefined;
}

function linkAnchorIdFor(section: Section, anchor?: string): string {
  return anchor
    ? sectionContentAnchorIdFor(section, anchor)
    : sectionAnchorIdFor(section);
}

function linkPreviewFor(
  section: Section,
  anchor?: string,
  anchorIndex?: number,
  anchorRange?: [number, number],
): RulebookLinkPreview {
  if (anchorIndex !== undefined && section.contentNodes?.[anchorIndex]) {
    return promoteLeadingPreviewImages([section.contentNodes[anchorIndex]]);
  }
  if (anchorRange !== undefined && section.contentNodes) {
    const [start, end] = normalizedInclusiveRange(anchorRange);
    return promoteLeadingPreviewImages(
      section.contentNodes.slice(start, end + 1),
    );
  }

  const content = anchor
    ? (markdownSliceForAnchor(section.content, anchor) ?? section.content)
    : section.content;
  const contentNodes = contentNodesForMarkdown(content);
  return promoteLeadingPreviewImages(contentNodes);
}

function normalizedInclusiveRange([start, end]: [number, number]): [
  number,
  number,
] {
  return start <= end ? [start, end] : [end, start];
}

function promoteLeadingPreviewImages(
  contentNodes: SectionContentNode[],
): RulebookLinkPreview {
  const icons: string[] = [];
  const remaining = [...contentNodes];

  const first = remaining[0];
  if (first?.kind === "mediaAside") {
    remaining.shift();
    const mediaAside = first;
    icons.push(...mediaAside.images.map((image) => image.src));
    remaining.unshift({ kind: "markdown", markdown: mediaAside.markdown });
  }

  while (isPreviewIconImage(remaining[0])) {
    const image = remaining[0];
    icons.push(image.src);
    remaining.shift();
  }

  return {
    content: markdownFromContentNodes(remaining),
    contentNodes: remaining,
    icons: icons.length > 0 ? icons : undefined,
  };
}

function isPreviewIconImage(
  node: SectionContentNode | undefined,
): node is SectionImageContentNode {
  return Boolean(node && node.kind === "image");
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

function uniqueRulebookQueries(
  queries: RulebookLinkQuery[] = [],
): RulebookLinkQuery[] {
  return Array.from(
    new Map(queries.map((query) => [JSON.stringify(query), query])).values(),
  );
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

function classAdvantageTitlesForClassReference(reference: string): string[] {
  const normalizedReference = normalizeTitle(reference);
  const slug = CLASS_RULE_ALIASES[slugify(reference)] ?? slugify(reference);
  const classEntry = getAllClasses().find(
    (entry) =>
      entry.slug === slug || normalizeTitle(entry.name) === normalizedReference,
  );
  if (!classEntry) return [reference];

  return uniqueNonEmpty(
    classEntry.classes.map((entry) => entry.advantageTitle ?? classEntry.name),
  );
}

function lineageAdvantageTitlesForLineageReference(
  reference: string,
): string[] {
  const normalizedReference = normalizeTitle(reference);
  const lineageEntry = getAllLineages().find(
    (entry) =>
      entry.slug === slugify(reference) ||
      normalizeTitle(entry.name) === normalizedReference,
  );
  if (!lineageEntry) return [reference];

  return uniqueNonEmpty(
    lineageEntry.lineages.map(
      (entry) => entry.advantageTitle ?? lineageEntry.name,
    ),
  );
}

function spellTitlesForSpellReference(reference: string): string[] {
  const normalizedReference = normalizeTitle(reference);
  const spellEntry = getAllSpells().find(
    (entry) =>
      entry.slug === slugify(reference) ||
      normalizeTitle(entry.name) === normalizedReference,
  );
  if (!spellEntry) return [reference];

  return [spellEntry.name];
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
    (a.ruleReferenceSortGroup ?? 0) - (b.ruleReferenceSortGroup ?? 0) ||
    a.docTitle.localeCompare(b.docTitle) ||
    a.sectionTitle.localeCompare(b.sectionTitle) ||
    (a.anchor ?? "").localeCompare(b.anchor ?? "") ||
    a.sectionId.localeCompare(b.sectionId)
  );
}

const CLASS_RULE_ALIASES: Record<string, string> = {
  fighter: "warrior",
  thief: "rogue",
};
