import Link from "next/link";
import { CroppedImage } from "@/components/CroppedImage";
import type { BoardPositionCrop } from "@/lib/board-position-crop";
import { getSiteBySlug, getWildernessTokenBySlug } from "@/lib/tts/lookup";

export function SiteLink({
  name,
  href,
  imageURL,
  imageCrop,
  size = "default",
  subtitle,
}: {
  name: string;
  href: string;
  imageURL?: string;
  imageCrop?: BoardPositionCrop;
  size?: "default" | "compact";
  subtitle?: string;
}) {
  const resolvedImageURL = imageURL ?? imageURLForHref(href);
  const mediaClassName = size === "compact" ? "w-40 sm:w-44" : "w-full";

  return (
    <section className="flex flex-col items-start gap-1">
      <Link
        href={href}
        className={`${mediaClassName} rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:ring-2 hover:ring-zinc-400 transition`}
        aria-label={`View ${name}`}
      >
        {resolvedImageURL && imageCrop ? (
          <CroppedImage
            imageUrl={resolvedImageURL}
            imageCrop={imageCrop}
            alt={name}
            className="bg-zinc-100 dark:bg-zinc-900"
          />
        ) : resolvedImageURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolvedImageURL}
            alt={name}
            className="w-full aspect-square object-cover block bg-zinc-100 dark:bg-zinc-900"
          />
        ) : (
          <span className="flex aspect-square w-full items-center justify-center bg-zinc-100 p-4 text-center text-sm font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            {name}
          </span>
        )}
      </Link>
      <h2 className="text-base font-semibold mt-1">
        <Link href={href} className="hover:underline">
          {name}
        </Link>
      </h2>
      {subtitle && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      )}
    </section>
  );
}

function imageURLForHref(href: string): string | undefined {
  const siteSlug = href.match(/^\/sites\/([^/?#]+)/)?.[1];
  if (siteSlug) return getSiteBySlug(siteSlug)?.site.imageSecondaryURL;

  const wildernessTokenSlug = href.match(
    /^\/wilderness-tokens\/([^/?#]+)/,
  )?.[1];
  if (wildernessTokenSlug) {
    return getWildernessTokenBySlug(wildernessTokenSlug)?.tokens[0]?.imageURL;
  }

  return undefined;
}
