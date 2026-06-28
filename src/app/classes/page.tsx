import Link from "next/link";
import { ClassCardLink } from "@/components/ClassLink";
import { getAllClasses } from "@/lib/tts/lookup";

export default function ClassesPage() {
  const entries = getAllClasses();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Classes</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {entries.length} classes from the TTS mod
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {entries.map((entry) => (
          <ClassCardLink key={entry.slug} entry={entry} />
        ))}
      </div>
    </main>
  );
}
