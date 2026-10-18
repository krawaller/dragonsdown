import Link from "next/link";
import type { BoardPositionCrop } from "@/lib/board-position-crop";

export type PageHeaderCategoryLink = {
  href: string;
  label: string;
  value: string;
  imageUrl?: string;
  imageCrop?: BoardPositionCrop;
  imageFit?: "contain" | "cover";
};

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  categories?: PageHeaderCategoryLink[];
};

export function PageHeader({
  title,
  subtitle,
  categories = [],
}: PageHeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-start gap-2">
        <Link
          href="/"
          className="inline-flex min-h-13 items-center rounded border border-zinc-200 bg-white px-2.5 py-2 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          Home
        </Link>
        {categories.map((category) => (
          <PageHeaderCategoryChip
            key={`${category.label}-${category.href}`}
            {...category}
          />
        ))}
      </div>

      <div className="mt-4 min-w-0">
        <h1 className="text-4xl font-bold">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}

export function PageHeaderCategoryChip({
  href,
  label,
  value,
  imageUrl,
  imageCrop,
  imageFit = "cover",
}: PageHeaderCategoryLink) {
  const backgroundSize = imageCrop
    ? `${100 / imageCrop.width}% ${100 / imageCrop.height}%`
    : undefined;
  const backgroundPosition = imageCrop
    ? `${imageCrop.width === 1 ? 50 : (imageCrop.left / (1 - imageCrop.width)) * 100}% ${imageCrop.height === 1 ? 50 : (imageCrop.top / (1 - imageCrop.height)) * 100}%`
    : undefined;

  return (
    <Link
      href={href}
      className="inline-flex min-w-0 items-center gap-2 rounded border border-zinc-200 bg-white px-2.5 py-2 text-xs transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
    >
      {imageUrl && (
        <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
          {imageCrop ? (
            <span
              aria-hidden="true"
              className="block size-full bg-no-repeat"
              style={{
                backgroundImage: `url(${JSON.stringify(imageUrl)})`,
                backgroundPosition,
                backgroundSize,
              }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className={`block size-full ${imageFit === "contain" ? "object-contain" : "object-cover"}`}
            />
          )}
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-[0.6875rem] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        <span className="block truncate font-medium text-zinc-900 dark:text-zinc-100">
          {value}
        </span>
      </span>
    </Link>
  );
}
