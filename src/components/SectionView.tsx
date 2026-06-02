import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { Section, SectionLevel } from "@/lib/rulebooks";
import { shortNameForSource } from "@/lib/docs";
import { findCards } from "@/lib/tts/lookup";
import { CardImages } from "./CardImages";

const HEADING_TAG: Record<SectionLevel, "h2" | "h3" | "h4" | "h5" | "h6"> = {
  1: "h2",
  2: "h3",
  3: "h4",
  4: "h5",
  5: "h6",
};

const HEADING_CLASS: Record<SectionLevel, string> = {
  1: "text-3xl font-bold mt-12 mb-4 flex items-baseline justify-between gap-4",
  2: "text-2xl font-bold mt-10 mb-3 flex items-baseline justify-between gap-4",
  3: "text-xl font-semibold mt-8 mb-2 flex items-baseline justify-between gap-4",
  4: "text-lg font-semibold mt-6 mb-2 flex items-baseline justify-between gap-4",
  5: "text-base font-semibold mt-4 mb-2 flex items-baseline justify-between gap-4",
};

/**
 * Anchor id used for in-page navigation. Composite of source + original id
 * so the same anchor works on both the source rulebook page and any derived
 * doc that includes this section (e.g. `core-8.1`).
 */
function anchorIdFor(section: Section): string {
  return `${section.source}-${section.id}`;
}

export function SectionView({
  section,
  showSource = false,
}: {
  section: Section;
  /**
   * When true, the id prefix is rendered as a link to the source rulebook.
   * Set on derived-doc pages so each entry links back to its origin.
   */
  showSource?: boolean;
}) {
  const Heading = HEADING_TAG[section.level];
  const anchorId = anchorIdFor(section);
  const cards = findCards(section.title);
  return (
    <section className="mb-2">
      <Heading className={HEADING_CLASS[section.level]} id={anchorId}>
        <span>{section.title}</span>
        {showSource ? (
          <Link
            href={`/${section.source}#${anchorId}`}
            className="text-zinc-400 dark:text-zinc-600 font-mono text-sm shrink-0 hover:underline"
          >
            {shortNameForSource(section.source)}:{section.id}
          </Link>
        ) : (
          <span className="text-zinc-400 dark:text-zinc-600 font-mono text-sm shrink-0">
            {section.id}
          </span>
        )}
      </Heading>
      {cards.length > 0 && <CardImages cards={cards} />}
      {section.content && (
        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <ReactMarkdown>{section.content}</ReactMarkdown>
        </div>
      )}
    </section>
  );
}
