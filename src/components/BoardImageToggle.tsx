"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  cropTop = 0,
}: {
  title: string;
  imageURL: string;
  imageSecondaryURL: string;
  areas?: BoardAreaLink[];
  cropTop?: number;
}) {
  const [side, setSide] = useState<"front" | "back">("front");
  const image = side === "back" ? imageSecondaryURL : imageURL;
  const imageAspectRatio = useImageAspectRatio(image);
  const normalizedCropTop = Math.max(0, Math.min(cropTop, 0.8));
  const visibleCropHeight = 1 - normalizedCropTop;
  const shouldCrop = normalizedCropTop > 0 && imageAspectRatio !== null;

  return (
    <section className="max-w-2xl">
      <div
        className="mb-3 inline-flex overflow-hidden rounded border border-zinc-200 text-sm dark:border-zinc-800"
        aria-label={`${title} board side`}
      >
        {(["front", "back"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setSide(option)}
            className={`px-3 py-1.5 capitalize transition-colors ${
              side === option
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
            }`}
            aria-pressed={side === option}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
        <div className="relative">
          {shouldCrop ? (
            <span
              role="img"
              aria-label={`${title} ${side}`}
              className="block w-full bg-no-repeat"
              style={{
                aspectRatio: imageAspectRatio / visibleCropHeight,
                backgroundImage: `url(${JSON.stringify(image)})`,
                backgroundPosition: "50% 100%",
                backgroundSize: `100% ${100 / visibleCropHeight}%`,
              }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={`${title} ${side}`}
              className="block h-auto w-full object-contain"
            />
          )}
          {areas.map((area) => (
            <BoardAreaAnchor
              key={`${area.href}-${area.name}`}
              area={area}
              boardTitle={title}
              cropTop={normalizedCropTop}
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
  cropTop,
}: {
  area: BoardAreaLink;
  boardTitle: string;
  cropTop: number;
}) {
  const box = cropBox(boxForPosition(area.position), cropTop);
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

function useImageAspectRatio(imageURL: string): number | null {
  const [measurement, setMeasurement] = useState<{
    imageURL: string;
    aspectRatio: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const image = new window.Image();
    image.onload = () => {
      if (cancelled || image.naturalHeight === 0) return;
      setMeasurement({
        imageURL,
        aspectRatio: image.naturalWidth / image.naturalHeight,
      });
    };
    image.src = imageURL;

    return () => {
      cancelled = true;
    };
  }, [imageURL]);

  return measurement?.imageURL === imageURL ? measurement.aspectRatio : null;
}

function cropBox(
  box: { left: number; top: number; width: number; height: number },
  cropTop: number,
): { left: number; top: number; width: number; height: number } {
  if (cropTop <= 0) return box;
  const visibleHeight = 1 - cropTop;
  return {
    left: box.left,
    top: (box.top - cropTop) / visibleHeight,
    width: box.width,
    height: box.height / visibleHeight,
  };
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
