import Link from "next/link";
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
        {entries.map((entry) => {
          const ttsClass = entry.classes[0];
          return (
            <section key={entry.slug} className="flex flex-col gap-2">
              <Link
                href={`/classes/${entry.slug}`}
                className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900 hover:ring-2 hover:ring-zinc-400 transition"
                aria-label={`View ${entry.name}`}
              >
                {ttsClass?.classToken ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ttsClass.classToken.imageURL}
                    alt=""
                    className="block w-full aspect-square object-cover"
                  />
                ) : ttsClass?.advantageCard ? (
                  <span className="block w-full aspect-square" />
                ) : (
                  <span className="block w-full aspect-square" />
                )}
              </Link>
              <div>
                <h2 className="text-base font-semibold">
                  <Link
                    href={`/classes/${entry.slug}`}
                    className="hover:underline"
                  >
                    {entry.name}
                  </Link>
                </h2>
                {ttsClass && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {ttsClass.advantageTitle}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
