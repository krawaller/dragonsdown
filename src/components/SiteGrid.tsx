import type { SiteEntry } from "@/lib/tts/lookup";
import { SiteLink } from "./SiteLink";

export function SiteGrid({
  entries,
  className,
}: {
  entries: SiteEntry[];
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 ${className ?? ""}`}
    >
      {entries.map(({ name, slug, site }) => (
        <SiteLink
          key={`${name}-${site.imageSecondaryURL}`}
          name={name}
          href={`/sites/${slug}`}
          imageURL={site.imageSecondaryURL}
          subtitle={
            site.ancestry.length > 0 ? site.ancestry.join(" / ") : undefined
          }
        />
      ))}
    </div>
  );
}
