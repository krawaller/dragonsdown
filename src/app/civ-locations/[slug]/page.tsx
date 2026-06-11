import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllCivLocations, getCivLocationBySlug } from "@/lib/tts/lookup";

export function generateStaticParams() {
  return getAllCivLocations().map((entry) => ({ slug: entry.slug }));
}

export default async function CivLocationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getCivLocationBySlug(slug);
  if (!entry) notFound();

  const { name, location } = entry;
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/" className="hover:underline">
          ← All docs
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/civ-locations" className="hover:underline">
          Civ Locations
        </Link>
      </div>
      <h1 className="text-4xl font-bold mt-4 mb-2">{name}</h1>
      {location.ancestry.length > 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
          {location.ancestry.join(" / ")}
        </p>
      )}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={location.imageURL}
          alt={name}
          className="block w-full max-h-[78vh] aspect-square object-contain"
        />
      </div>
    </main>
  );
}
