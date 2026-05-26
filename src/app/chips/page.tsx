import Link from "next/link";
import { getAllChips } from "@/lib/tts/lookup";

export default function ChipsPage() {
  const entries = getAllChips();
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Chips</h1>
      <p className="text-sm text-zinc-500 mb-8">
        {entries.length} chip types from the TTS mod
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {entries.map(({ name, prettyName, chips }) => (
          <section key={name} className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">{prettyName}</h2>
            <div className="flex flex-wrap gap-2">
              {chips.map((chip, i) => (
                <ChipFace
                  key={`${chip.imageURL}-${i}`}
                  url={chip.imageURL}
                  alt={prettyName}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function ChipFace({ url, alt }: { url: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className="w-20 h-20 rounded-full object-cover bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
    />
  );
}
