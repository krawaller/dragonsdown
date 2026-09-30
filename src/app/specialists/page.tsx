import Link from "next/link";
import { getAllSpecialists, type SpecialistEntry } from "@/lib/tts/lookup";

export default function SpecialistsPage() {
  const specialists = getAllSpecialists();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Specialists</h1>
      <p className="text-sm text-zinc-500 mb-8">
        {specialists.length} hireable specialists from Wildlands
      </p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {specialists.map((entry) => (
          <SpecialistCard key={entry.slug} entry={entry} />
        ))}
      </div>
    </main>
  );
}

function SpecialistCard({ entry }: { entry: SpecialistEntry }) {
  const specialist = entry.specialists[0];
  if (!specialist) return null;

  return (
    <section className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={specialist.imageSecondaryURL || specialist.imageURL}
          alt={`${specialist.name} token`}
          className="block aspect-square w-full object-cover"
        />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-lg font-semibold">{specialist.name}</h2>
          {specialist.attribute && (
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              {specialist.attribute}
            </span>
          )}
          {specialist.tokenCode && (
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              {specialist.tokenCode}
            </span>
          )}
        </div>
        <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
          {specialist.basePrice && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Base Price
              </dt>
              <dd>{specialist.basePrice}</dd>
            </div>
          )}
          {specialist.startingPrice && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Starting Price
              </dt>
              <dd>{specialist.startingPrice}</dd>
            </div>
          )}
        </dl>
        {specialist.rule && (
          <p className="mt-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            {specialist.rule}
          </p>
        )}
      </div>
    </section>
  );
}
