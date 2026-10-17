"use client";

import type { MouseEvent, ReactNode } from "react";

export function CollapsibleBox({
  title,
  count,
  countLabel,
  headerEnd,
  summaryClassName = "cursor-pointer px-2 py-3 hover:bg-zinc-50 transition-colors dark:hover:bg-zinc-900 sm:px-3 sm:py-4",
  headerClassName = "inline-flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 align-middle",
  titleClassName = "text-xl font-semibold",
  contentClassName = "border-t border-zinc-200 p-4 dark:border-zinc-800 sm:p-5",
  children,
}: {
  title: ReactNode;
  count?: number;
  countLabel?: string;
  headerEnd?: ReactNode;
  summaryClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  if (count === 0) return null;
  const headerEndContent = headerEnd ?? countLabelText(count, countLabel);

  return (
    <details
      open
      className="group rounded border border-zinc-200 dark:border-zinc-800"
    >
      <summary
        onMouseDown={preventSummaryTextSelection}
        className={`${summaryClassName} list-none [&::-webkit-details-marker]:hidden`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-5 w-4 shrink-0 items-center justify-center text-xl leading-none text-zinc-500 transition-transform group-open:rotate-90 dark:text-zinc-400"
          >
            ›
          </span>
          <span className={headerClassName}>
            <span className={titleClassName}>{title}</span>
            {headerEndContent && (
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {headerEndContent}
              </span>
            )}
          </span>
        </span>
      </summary>
      <div className={contentClassName}>{children}</div>
    </details>
  );
}

function preventSummaryTextSelection(event: MouseEvent<HTMLElement>) {
  if (
    event.target instanceof HTMLElement &&
    event.target.closest("a,button,input,select,textarea")
  ) {
    return;
  }
  event.preventDefault();
}

function countLabelText(
  count: number | undefined,
  countLabel: string | undefined,
): string | undefined {
  if (countLabel) return countLabel;
  if (count === undefined) return undefined;
  return `${count} item${count === 1 ? "" : "s"}`;
}
