import Link from "next/link";
import { ALL_DOCS } from "@/lib/docs";

export default function Home() {
  const rulebooks = ALL_DOCS.filter((d) => d.kind === "rulebook");
  const derived = ALL_DOCS.filter((d) => d.kind === "derived");
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold mb-8">Dragons Down</h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-10">
        Generated from the official rule PDF:s and TTS mods. WIP 🚧
      </p>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        Rulebooks
      </h2>
      <ul className="space-y-3 mb-10">
        {rulebooks.map((doc) => (
          <li key={doc.slug}>
            <Link
              href={`/${doc.slug}`}
              className="block rounded-lg border border-zinc-200 dark:border-zinc-800 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              <span className="text-lg font-medium">{doc.title}</span>
            </Link>
          </li>
        ))}
      </ul>
      {derived.length > 0 && (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
            Aggregations
          </h2>
          <ul className="space-y-3 mb-10">
            {derived.map((doc) => (
              <li key={doc.slug}>
                <Link
                  href={`/${doc.slug}`}
                  className="block rounded-lg border border-zinc-200 dark:border-zinc-800 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <span className="text-lg font-medium">{doc.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        References
      </h2>
      <ul className="space-y-3">
        <li>
          <Link
            href="/chips"
            className="block rounded-lg border border-zinc-200 dark:border-zinc-800 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <span className="text-lg font-medium">Chips</span>
          </Link>
        </li>
        <li>
          <Link
            href="/monster-groups"
            className="block rounded-lg border border-zinc-200 dark:border-zinc-800 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <span className="text-lg font-medium">Monster Groups</span>
          </Link>
        </li>
        <li>
          <Link
            href="/items"
            className="block rounded-lg border border-zinc-200 dark:border-zinc-800 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <span className="text-lg font-medium">Items</span>
          </Link>
        </li>
        <li>
          <Link
            href="/missions"
            className="block rounded-lg border border-zinc-200 dark:border-zinc-800 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <span className="text-lg font-medium">Missions</span>
          </Link>
        </li>
        <li>
          <Link
            href="/sites"
            className="block rounded-lg border border-zinc-200 dark:border-zinc-800 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <span className="text-lg font-medium">Sites</span>
          </Link>
        </li>
        <li>
          <Link
            href="/boards"
            className="block rounded-lg border border-zinc-200 dark:border-zinc-800 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <span className="text-lg font-medium">Boards</span>
          </Link>
        </li>
        <li>
          <Link
            href="/civ-locations"
            className="block rounded-lg border border-zinc-200 dark:border-zinc-800 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <span className="text-lg font-medium">Civ Locations</span>
          </Link>
        </li>
        <li>
          <Link
            href="/civilisation-tokens"
            className="block rounded-lg border border-zinc-200 dark:border-zinc-800 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <span className="text-lg font-medium">Civilisation Tokens</span>
          </Link>
        </li>
        <li>
          <Link
            href="/map-tiles"
            className="block rounded-lg border border-zinc-200 dark:border-zinc-800 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <span className="text-lg font-medium">Map Tiles</span>
          </Link>
        </li>
        <li>
          <Link
            href="/wilderness-tokens"
            className="block rounded-lg border border-zinc-200 dark:border-zinc-800 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <span className="text-lg font-medium">Wilderness Tokens</span>
          </Link>
        </li>
      </ul>
    </main>
  );
}
