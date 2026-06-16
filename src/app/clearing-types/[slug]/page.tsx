import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllClearingTypes,
  getClearingTypeBySlug,
} from "@/lib/clearing-types";

export function generateStaticParams() {
  return getAllClearingTypes().map((entry) => ({ slug: entry.slug }));
}

export default async function ClearingTypePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const clearingType = getClearingTypeBySlug(slug);
  if (!clearingType) notFound();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/clearing-types" className="hover:underline">
          Clearing Types
        </Link>
      </div>
      <h1 className="text-4xl font-bold mt-4 mb-2">{clearingType.label}</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {clearingType.tileCount} map{" "}
        {clearingType.tileCount === 1 ? "tile" : "tiles"}
        {" · "}
        {clearingType.clearingCount} clearing
        {clearingType.clearingCount === 1 ? "" : "s"}
      </p>

      <section>
        <h2 className="text-xl font-semibold mb-3">Map Tiles</h2>
        <div className="flex flex-wrap gap-2">
          {clearingType.occurrences.map((occurrence) => (
            <Link
              key={`${occurrence.terrain}-${occurrence.tileName}-${occurrence.side}`}
              href={occurrence.href}
              className="rounded border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              <span className="font-medium">{occurrence.tileName}</span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                {occurrence.terrain} · {occurrence.side} · {occurrence.count}{" "}
                {occurrence.count === 1 ? "clearing" : "clearings"}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
