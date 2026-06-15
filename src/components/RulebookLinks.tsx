import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { RulebookLink } from "@/lib/rulebook-links";

export function RulebookLinks({
  links,
  heading = "Rulebook",
  className = "",
}: {
  links: RulebookLink[];
  heading?: string;
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="text-xl font-semibold mb-3">{heading}</h2>
      <div className="space-y-3">
        {links.map((link) => (
          <div
            key={`${link.docSlug}-${link.sectionId}`}
            className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden"
          >
            <div className="p-3">
              <Link
                href={link.href}
                className="block min-w-0 text-sm hover:underline"
              >
                <span className="font-medium">{link.sectionTitle}</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {link.docTitle}
                  {link.location ? ` · ${locationLabel(link.location)}` : ""}
                </span>
              </Link>
            </div>
            {link.content && (
              <details className="border-t border-zinc-200 dark:border-zinc-800">
                <summary className="cursor-pointer px-3 py-2 text-sm text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100">
                  Contents
                </summary>
                <div className="prose prose-zinc dark:prose-invert max-w-none p-3 text-sm">
                  <ReactMarkdown>{link.content}</ReactMarkdown>
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function locationLabel(
  location: NonNullable<RulebookLink["location"]>,
): string {
  return `page ${location.page} · ${location.column} column · ${location.section}`;
}
