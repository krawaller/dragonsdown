"use client";

import type { MouseEvent, ReactNode } from "react";

export function CollapsibleBox({
  title,
  count,
  countLabel,
  children,
}: {
  title: string;
  count?: number;
  countLabel?: string;
  children: ReactNode;
}) {
  if (count === 0) return null;

  return (
    <details
      open
      className="rounded border border-zinc-200 dark:border-zinc-800"
    >
      <summary
        onMouseDown={preventSummaryTextSelection}
        className="cursor-pointer px-4 py-3 marker:text-zinc-500 hover:bg-zinc-50 transition-colors dark:marker:text-zinc-400 dark:hover:bg-zinc-900 sm:px-5 sm:py-4"
      >
        <span className="inline-flex w-[calc(100%-1rem)] flex-wrap items-baseline justify-between gap-3 align-middle">
          <span className="text-xl font-semibold">{title}</span>
          {countLabelText(count, countLabel) && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {countLabelText(count, countLabel)}
            </span>
          )}
        </span>
      </summary>
      <div className="border-t border-zinc-200 p-4 dark:border-zinc-800 sm:p-5">
        {children}
      </div>
    </details>
  );
}

function preventSummaryTextSelection(event: MouseEvent<HTMLElement>) {
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
