import Link from "next/link";
import { MAGIC_TYPES } from "@/lib/magic";
import { resolveMagicRulebookLinks } from "@/lib/rulebook-links";
import { getSpellsByMagic } from "@/lib/tts/lookup";

export default async function MagicPage() {
  const rulebookLinksByMagic = new Map(
    await Promise.all(
      MAGIC_TYPES.map(
        async (type) =>
          [type.id, await resolveMagicRulebookLinks(type.id, "core")] as const,
      ),
    ),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
      >
        ← All docs
      </Link>
      <h1 className="text-4xl font-bold mt-4 mb-2">Magic</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        {MAGIC_TYPES.length} types of magic from the spell manifest
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MAGIC_TYPES.map((type) => {
          const spells = getSpellsByMagic(type.id);
          const icon = rulebookLinksByMagic
            .get(type.id)
            ?.find((link) => Boolean(link.icon))?.icon;
          return (
            <Link
              key={type.id}
              href={`/magic/${type.slug}`}
              className="rounded border border-zinc-200 dark:border-zinc-800 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              <MagicIcon icon={icon} label={type.label} className="mb-4" />
              <span className="block text-lg font-semibold">{type.label}</span>
              <span className="mt-1 block text-sm text-zinc-500 dark:text-zinc-400">
                {spells.length} spell{spells.length === 1 ? "" : "s"}
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}

function MagicIcon({
  icon,
  label,
  className = "",
}: {
  icon?: string;
  label: string;
  className?: string;
}) {
  if (!icon) {
    return (
      <span
        className={`${className} block h-10 w-10 rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900`}
        aria-hidden="true"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={icon}
      alt={`${label} icon`}
      className={`${className} block h-10 w-10 rounded border border-zinc-200 bg-zinc-100 object-contain p-1 dark:border-zinc-800 dark:bg-zinc-900`}
    />
  );
}
