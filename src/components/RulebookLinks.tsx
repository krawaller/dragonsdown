"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { RulebookLink } from "@/lib/rulebook-links";
import { RulebookContent } from "./RulebookContent";

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
    <section className={`min-w-0 max-w-full overflow-hidden ${className}`}>
      <h2 className="text-xl font-semibold mb-3">{heading}</h2>
      <div className="min-w-0 space-y-3">
        {links.map((link) => {
          return (
            <RulebookLinkCard
              key={`${link.docSlug}-${link.sectionId}-${link.anchor ?? ""}`}
              link={link}
            />
          );
        })}
      </div>
    </section>
  );
}

function RulebookLinkCard({ link }: { link: RulebookLink }) {
  const [expanded, setExpanded] = useState(true);
  const icons = link.icons ?? (link.icon ? [link.icon] : []);

  return (
    <div className="box-border min-w-0 max-w-full overflow-hidden rounded border border-zinc-200 dark:border-zinc-800">
      <div className="p-3">
        <div className="flex min-w-0 items-center gap-3 text-sm">
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
          <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="min-w-0 max-w-full truncate font-medium">
              {link.anchor
                ? `${link.sectionTitle}: ${link.anchor}`
                : link.sectionTitle}
            </span>
            <Link
              href={link.href}
              className="min-w-0 max-w-full truncate text-xs text-zinc-500 hover:underline dark:text-zinc-400"
            >
              {targetLabel(link)}
            </Link>
          </span>
        </div>
      </div>
      {link.content && (
        <div className="box-border flex min-w-0 max-w-full overflow-hidden border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse rulebook content" : "Expand rulebook content"}
            className="flex basis-8 shrink-0 cursor-pointer items-start justify-center px-0 py-2 text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
            onClick={() => setExpanded((current) => !current)}
          >
            <span
              aria-hidden="true"
              className={`select-none text-center text-xl leading-none transition-transform ${
                expanded ? "rotate-90" : ""
              }`}
            >
              ›
            </span>
          </button>
          <div
            className={`min-w-0 flex-1 basis-0 overflow-hidden py-2 pr-3 text-sm ${
              expanded ? "" : "[contain:inline-size]"
            }`}
          >
            {expanded ? (
              <div className="prose prose-zinc dark:prose-invert max-w-none [&>:first-child]:mt-0">
                <RulebookContent
                  nodes={
                    link.contentNodes ?? [
                      { kind: "markdown", markdown: link.content },
                    ]
                  }
                />
              </div>
            ) : (
              <div className="block w-full min-w-0 overflow-hidden truncate whitespace-nowrap [contain:inline-size]">
                {contentPreview(link.content)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function targetLabel(link: RulebookLink): string {
  return link.location
    ? `${link.docTitle} · ${locationLabel(link.location)}`
    : link.docTitle;
}

function contentPreview(content: string): string {
  return content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/[*_`#>\[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function locationLabel(
  location: NonNullable<RulebookLink["location"]>,
): string {
  return `page ${location.page} · ${location.column} column · ${location.section}`;
}
