import Link from "next/link";
import { RULEBOOKS } from "@/lib/rulebooks";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold mb-8">Dragons Down</h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-10">
        Browse the rulebooks, extracted from the official PDFs.
      </p>
      <ul className="space-y-3">
        {RULEBOOKS.map((book) => (
          <li key={book.slug}>
            <Link
              href={`/${book.slug}`}
              className="block rounded-lg border border-zinc-200 dark:border-zinc-800 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              <span className="text-lg font-medium">{book.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
