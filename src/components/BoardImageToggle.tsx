"use client";

import Link from "next/link";
import { useState } from "react";
import type { BoardPosition } from "@/lib/board-positions";

export type BoardAreaLink = {
  name: string;
  href: string;
  position: BoardPosition;
};

export function BoardImageToggle({
  title,
  imageURL,
  imageSecondaryURL,
  areas = [],
}: {
  title: string;
  imageURL: string;
  imageSecondaryURL: string;
  areas?: BoardAreaLink[];
}) {
  const [showBack, setShowBack] = useState(false);
  const image = showBack ? imageSecondaryURL : imageURL;
  const side = showBack ? "back" : "front";

  return (
    <section className="max-w-2xl">
      <label className="mb-3 inline-flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={showBack}
          onChange={(event) => setShowBack(event.target.checked)}
          className="size-4 rounded border-zinc-300 dark:border-zinc-700"
        />
        Show back image
      </label>
      <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={`${title} ${side}`}
            className="block h-auto w-full object-contain"
          />
          {areas.map((area) => (
            <BoardAreaAnchor
              key={`${area.href}-${area.name}`}
              area={area}
              boardTitle={title}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function BoardAreaAnchor({
  area,
  boardTitle,
}: {
  area: BoardAreaLink;
  boardTitle: string;
}) {
  const box = boxForPosition(area.position);
  return (
    <Link
      href={area.href}
      aria-label={`View ${area.name} from ${boardTitle}`}
      title={area.name}
      className="absolute rounded-sm outline-none transition hover:bg-white/15 hover:ring-2 hover:ring-zinc-900/70 focus-visible:bg-white/20 focus-visible:ring-2 focus-visible:ring-zinc-900/80 dark:hover:ring-zinc-100/80 dark:focus-visible:ring-zinc-100"
      style={{
        left: `${box.left * 100}%`,
        top: `${box.top * 100}%`,
        width: `${box.width * 100}%`,
        height: `${box.height * 100}%`,
      }}
    >
      <span className="sr-only">{area.name}</span>
    </Link>
  );
}

function boxForPosition(position: BoardPosition): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const topStrip = topStripHeight(position.topStrip);
  const rowHeight = (1 - topStrip) / position.rows;
  const columnWidth = 1 / position.columns;
  const isSingleItemBoard = position.rows === 1 && position.columns === 1;
  const horizontalInset = columnWidth * 0.02;
  if (isSingleItemBoard) {
    const verticalInset = rowHeight * 0.02;

    return {
      left: horizontalInset,
      top: topStrip + verticalInset,
      width: columnWidth - horizontalInset * 2,
      height: rowHeight - verticalInset * 2,
    };
  }

  const singleItemVerticalInset = isSingleItemBoard ? rowHeight * 0.02 : 0;
  const topOutset = position.rows === 1 ? 0 : rowHeight * 0.03;
  const topInset =
    position.rows === 1 && !isSingleItemBoard ? rowHeight * 0.02 : 0;
  const originalTop = topStrip + position.row * rowHeight;
  const topWithOutset = Math.max(0, originalTop - topOutset);
  const appliedTopOutset = originalTop - topWithOutset;
  const top = topWithOutset + topInset + singleItemVerticalInset;
  const areaHeight =
    rowHeight * (isSingleItemBoard ? 0.98 : 0.95) +
    appliedTopOutset -
    topInset -
    singleItemVerticalInset;
  const areaHorizontalInset = horizontalInset;

  return {
    left: position.column * columnWidth + areaHorizontalInset,
    top,
    width: columnWidth - areaHorizontalInset * 2,
    height: areaHeight,
  };
}

function topStripHeight(topStrip: BoardPosition["topStrip"]): number {
  switch (topStrip) {
    case "high":
      return 0.24;
    case "low":
      return 0.16;
    default:
      return 0;
  }
}
