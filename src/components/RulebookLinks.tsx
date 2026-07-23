import Link from "next/link";
import Image from "next/image";
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
        {links.map((link) => {
          const icons = link.icons ?? (link.icon ? [link.icon] : []);
          return (
            <div
              key={`${link.docSlug}-${link.sectionId}-${link.anchor ?? ""}`}
              className="rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="p-3">
                <Link
                  href={link.href}
                  className="flex min-w-0 items-center gap-3 text-sm hover:underline"
                >
                  {icons.length > 0 && (
                    <span className="flex shrink-0 gap-1">
                      {icons.map((icon) => (
                        <Image
                          key={icon}
                          src={icon}
                          alt=""
                          width={40}
                          height={40}
                          className="h-10 w-10 object-contain"
                        />
                      ))}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {link.anchor
                        ? `${link.sectionTitle}: ${link.anchor}`
                        : link.sectionTitle}
                    </span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                      {link.docTitle}
                      {link.location
                        ? ` · ${locationLabel(link.location)}`
                        : ""}
                    </span>
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
          );
        })}
      </div>
    </section>
  );
}

function locationLabel(
  location: NonNullable<RulebookLink["location"]>,
): string {
  return `page ${location.page} · ${location.column} column · ${location.section}`;
}
