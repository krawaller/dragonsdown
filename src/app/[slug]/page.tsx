import Link from "next/link";
import { notFound } from "next/navigation";
import { findRulebook, loadSections, RULEBOOKS } from "@/lib/rulebooks";
import { SectionView } from "@/components/SectionView";

export function generateStaticParams() {
  return RULEBOOKS.map((book) => ({ slug: book.slug }));
}

export default async function RulebookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = findRulebook(slug);
  if (!book) notFound();
  const sections = await loadSections(book);
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All rulebooks
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">{book.title}</h1>
      <p className="text-sm text-zinc-500 mb-8">{sections.length} sections</p>
      <div>
        {sections.map((section, i) => (
          <SectionView key={i} section={section} />
        ))}
      </div>
    </main>
  );
}
