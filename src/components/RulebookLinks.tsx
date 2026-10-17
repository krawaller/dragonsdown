"use client";

import Link from "next/link";
import Image from "next/image";
import type { RulebookLink } from "@/lib/rulebook-links";
import { CollapsibleBox } from "./CollapsibleBox";
import { RulebookContent } from "./RulebookContent";

export function RulebookLinks({
  links,
  heading = "Rulebook",
  className = "",
  linksClassName = "space-y-3",
}: {
  links: RulebookLink[];
  heading?: string | null;
  className?: string;
  linksClassName?: string;
}) {
  if (links.length === 0) return null;

  return (
    <section className={`min-w-0 max-w-full overflow-hidden ${className}`}>
      {heading && <h2 className="text-xl font-semibold mb-3">{heading}</h2>}
      <div className={`min-w-0 ${linksClassName}`}>
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
  const icons = link.icons ?? (link.icon ? [link.icon] : []);
  if (!link.content) return null;

  return (
    <CollapsibleBox
      title={<RulebookLinkTitle link={link} icons={icons} />}
      summaryClassName="cursor-pointer px-2 py-1.5 hover:bg-zinc-50 transition-colors dark:hover:bg-zinc-900 sm:px-3"
      headerClassName="inline-flex min-h-11 min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1 align-middle"
      titleClassName="flex min-w-0 max-w-full items-center gap-2 text-sm font-medium"
      headerEnd={
        <Link
          href={link.href}
          className="min-w-0 max-w-full self-center truncate text-xs hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {targetLabel(link)}
        </Link>
      }
      contentClassName="border-t border-zinc-200 p-3 dark:border-zinc-800"
    >
      <div className="prose prose-zinc dark:prose-invert max-w-none text-sm [&>:first-child]:mt-0">
        <RulebookContent
          nodes={
            link.contentNodes ?? [{ kind: "markdown", markdown: link.content }]
          }
        />
      </div>
    </CollapsibleBox>
  );
}

function RulebookLinkTitle({
  link,
  icons,
}: {
  link: RulebookLink;
  icons: string[];
}) {
  return (
    <>
      {icons.length > 0 && (
        <span className="flex shrink-0 gap-1">
          {icons.map((icon) => (
            <Image
              key={icon}
              src={icon}
              alt=""
              width={40}
              height={40}
              className="h-9 w-9 object-contain"
            />
          ))}
        </span>
      )}
      <span className="flex min-w-0 max-w-full items-baseline gap-1.5">
        {link.optionalRule && (
          <span className="shrink-0 text-zinc-500 dark:text-zinc-400">
            Optional rule
          </span>
        )}
        <span className="min-w-0 truncate">
          {rulebookLinkDisplayTitle(link)}
        </span>
      </span>
    </>
  );
}

function rulebookLinkDisplayTitle(link: RulebookLink): string {
  return (
    link.title ??
    (link.anchor ? `${link.sectionTitle}: ${link.anchor}` : link.sectionTitle)
  );
}

function targetLabel(link: RulebookLink): string {
  return link.location
    ? `${link.docTitle} · ${locationLabel(link.location)}`
    : link.docTitle;
}

function locationLabel(
  location: NonNullable<RulebookLink["location"]>,
): string {
  return `page ${location.page - 1} · ${location.column} column · ${location.section}`;
}
