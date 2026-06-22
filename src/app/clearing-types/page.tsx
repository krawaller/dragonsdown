import Link from "next/link";
import Image from "next/image";
import { getAllClearingTypes } from "@/lib/clearing-types";

export default function ClearingTypesPage() {
  const clearingTypes = getAllClearingTypes();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Clearing Types</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {clearingTypes.length} types from map tile clearing badges
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {clearingTypes.map((type) => (
          <Link
            key={type.id}
            href={`/clearing-types/${type.slug}`}
            className="flex items-center gap-4 rounded border border-zinc-200 dark:border-zinc-800 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <Image
              src={type.icon}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 object-contain"
            />
            <div>
              <h2 className="text-lg font-semibold">{type.label}</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {type.tileCount} map {type.tileCount === 1 ? "tile" : "tiles"}
                {" · "}
                {type.clearingCount} clearing
                {type.clearingCount === 1 ? "" : "s"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
