import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import type { HeadingStyle, Section, SectionLevel } from "@/lib/rulebooks";
import { shortNameForSource } from "@/lib/docs";
import { findCards } from "@/lib/tts/lookup";
import { CardImages } from "./CardImages";

const HEADING_TAG: Record<SectionLevel, "h2" | "h3" | "h4" | "h5" | "h6"> = {
  1: "h2",
  2: "h3",
  3: "h4",
  4: "h5",
  5: "h6",
  6: "h6",
  7: "h6",
  8: "h6",
};

const HEADING_CLASS: Record<HeadingStyle, string> = {
  "pdf-l1":
    "text-3xl font-bold mt-12 mb-4 flex items-baseline justify-between gap-4",
  "pdf-l2":
    "text-2xl font-bold mt-10 mb-3 flex items-baseline justify-between gap-4",
  "pdf-l3":
    "text-xl font-semibold mt-8 mb-2 flex items-baseline justify-between gap-4",
  "pdf-l4":
    "text-lg font-semibold mt-6 mb-2 flex items-baseline justify-between gap-4",
  "pdf-l5":
    "text-base font-semibold mt-4 mb-2 flex items-baseline justify-between gap-4",
  "pdf-body-bold-12":
    "text-base font-semibold mt-4 mb-2 flex items-baseline justify-between gap-4",
  "pdf-body-bold-11":
    "text-base font-semibold mt-4 mb-2 flex items-baseline justify-between gap-4",
};

const FALLBACK_HEADING_STYLE: Record<SectionLevel, HeadingStyle> = {
  1: "pdf-l1",
  2: "pdf-l2",
  3: "pdf-l3",
  4: "pdf-l4",
  5: "pdf-l5",
  6: "pdf-l5",
  7: "pdf-l5",
  8: "pdf-l5",
};

function headingStyleFor(section: Section): HeadingStyle {
  return section.headingStyle ?? FALLBACK_HEADING_STYLE[section.level];
}

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
  const headingStyle = headingStyleFor(section);
  const anchorId = anchorIdFor(section);
  const cards = findCards(section.title);
  const icons = section.icons ?? (section.icon ? [section.icon] : []);
  return (
    <section className="mb-2 flow-root">
      <Heading className={HEADING_CLASS[headingStyle]} id={anchorId}>
        <span className="flex min-w-0 items-center gap-3">
          {icons.length > 0 && (
            <span className="flex shrink-0 gap-1">
              {icons.map((icon) => (
                <Image
                  key={icon}
                  src={icon}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 object-contain"
                />
              ))}
            </span>
          )}
          <span>{section.title}</span>
        </span>
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
        <div className="rulebook-content prose prose-zinc dark:prose-invert max-w-none">
          <ReactMarkdown components={{ img: MarkdownImage }}>
            {section.content}
          </ReactMarkdown>
        </div>
      )}
    </section>
  );
}

/* eslint-disable @next/next/no-img-element */
function MarkdownImage({ alt, src }: { alt?: string; src?: string | Blob }) {
  if (typeof src !== "string") return null;
  const isInline = alt === "inline";
  const isFloatLeft = alt === "float-left" || alt === "float-left-companion";
  const isFloatRight = alt === "float-right" || alt === "float-right-companion";
  const shouldClear = alt === "float-left" || alt === "float-right";
  const clearClass = shouldClear ? "clear-both " : "";
  return (
    <img
      src={src}
      alt={isInline || isFloatLeft || isFloatRight ? "" : (alt ?? "")}
      className={
        isInline
          ? "not-prose inline-block h-[1.35em] w-auto align-[-0.2em]"
          : isFloatLeft
            ? `not-prose ${clearClass}float-left mr-4 mb-2 mt-1 h-16 w-16 object-contain`
            : isFloatRight
              ? `not-prose ${clearClass}float-right ml-4 mb-2 mt-1 h-16 w-16 object-contain`
              : undefined
      }
    />
  );
}
/* eslint-enable @next/next/no-img-element */
