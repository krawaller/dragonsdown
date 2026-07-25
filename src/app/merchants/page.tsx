import Link from "next/link";
import { getAllMerchants } from "@/lib/tts/lookup";

export default function MerchantsPage() {
  const merchants = getAllMerchants();
  const totalImages = merchants.reduce(
    (sum, entry) => sum + entry.tokens.length,
    0,
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Merchants</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {merchants.length} merchants · {totalImages} token images
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {merchants.map((entry) => {
          const token = entry.tokens[0];
          return (
            <section key={entry.slug} className="flex flex-col gap-2">
              <Link
                href={`/merchants/${entry.slug}`}
                className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900 hover:ring-2 hover:ring-zinc-400 transition"
                aria-label={`View ${entry.name}`}
              >
                {token ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={token.imageSecondaryURL || token.imageURL}
                    alt={entry.name}
                    className="block w-full aspect-square object-cover"
                  />
                ) : (
                  <span className="block w-full aspect-square" />
                )}
              </Link>
              <div>
                <h2 className="text-base font-semibold">
                  <Link
                    href={`/merchants/${entry.slug}`}
                    className="hover:underline"
                  >
                    {entry.name}
                  </Link>
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {entry.tokens.length} image
                  {entry.tokens.length === 1 ? "" : "s"}
                </p>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
