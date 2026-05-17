import ReactMarkdown from "react-markdown";
import type { Section, SectionLevel } from "@/lib/rulebooks";

const HEADING_TAG: Record<SectionLevel, "h2" | "h3" | "h4" | "h5"> = {
  1: "h2",
  2: "h3",
  3: "h4",
  4: "h5",
};

const HEADING_CLASS: Record<SectionLevel, string> = {
  1: "text-3xl font-bold mt-12 mb-4",
  2: "text-2xl font-bold mt-10 mb-3",
  3: "text-xl font-semibold mt-8 mb-2",
  4: "text-lg font-semibold mt-6 mb-2",
};

export function SectionView({ section }: { section: Section }) {
  const Heading = HEADING_TAG[section.level];
  return (
    <section className="mb-2">
      <Heading className={HEADING_CLASS[section.level]} id={section.id}>
        <span className="text-zinc-400 dark:text-zinc-600 font-mono text-sm mr-2 align-middle">
          {section.id}
        </span>
        {section.title}
      </Heading>
      {section.content && (
        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <ReactMarkdown>{section.content}</ReactMarkdown>
        </div>
      )}
    </section>
  );
}
