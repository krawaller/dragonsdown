import Link from "next/link";
import { notFound } from "next/navigation";
import { CivilisationTokenDetail } from "@/components/CivilisationTokenDetail";
import { getAllMerchants, getMerchantBySlug } from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllMerchants().map((entry) => ({ slug: entry.slug }));
}

export default async function MerchantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getMerchantBySlug(slug);
  if (!entry) notFound();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/merchants" className="hover:underline">
          Merchants
        </Link>
      </div>
      <h1 className="text-4xl font-bold mt-4 mb-2">{entry.name}</h1>
      <CivilisationTokenDetail entry={entry} />
    </main>
  );
}
