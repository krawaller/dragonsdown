import Link from "next/link";
import { notFound } from "next/navigation";
import { ALL_DOCS, findDoc, loadDocSections } from "@/lib/docs";
import { SectionView } from "@/components/SectionView";

export function generateStaticParams() {
  return ALL_DOCS.map((doc) => ({ slug: doc.slug }));
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = findDoc(slug);
  if (!doc) notFound();
  const sections = await loadDocSections(doc);
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">{doc.title}</h1>
      <p className="text-sm text-zinc-500 mb-8">
        {sections.length} sections
        {doc.kind === "derived" ? " · derived" : ""}
      </p>
      <div>
        {sections.map((section, i) => (
          <SectionView
            key={i}
            section={section}
            showSource={doc.kind === "derived"}
          />
        ))}
      </div>
    </main>
  );
}
