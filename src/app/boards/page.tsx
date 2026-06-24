import Link from "next/link";
import { getAllBoards } from "@/lib/tts/lookup";

export default function BoardsPage() {
  const entries = getAllBoards();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Boards</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {entries.length} setup boards from the TTS mod
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {entries.map(({ slug, title, board }) => {
          const boardItems = [...board.sites, ...board.merchants];
          const isSingleItemBoard = boardItems.length === 1;

          return (
            <section key={slug} className="flex flex-col gap-2">
              <Link
                href={`/boards/${slug}`}
                className={
                  isSingleItemBoard
                    ? "block w-1/2 rounded border border-transparent overflow-hidden hover:ring-2 hover:ring-zinc-400 transition"
                    : "block rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900 hover:ring-2 hover:ring-zinc-400 transition"
                }
                aria-label={`View ${title}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={board.imageURL}
                  alt={title}
                  className="block h-auto w-full object-contain"
                />
              </Link>
              <div>
                <h2 className="text-base font-semibold">
                  <Link href={`/boards/${slug}`} className="hover:underline">
                    {title}
                  </Link>
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {board.terrain}
                </p>
              </div>
              {boardItems.length > 0 && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {boardItems.join(" · ")}
                </p>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
