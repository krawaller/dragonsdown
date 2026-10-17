"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CollapsibleBox } from "@/components/CollapsibleBox";
import {
  getBoardPositionForItem,
  type BoardPosition,
} from "@/lib/board-positions";
import { cropForBoardPosition } from "@/lib/board-position-crop";
import type { BoardEntry } from "@/lib/tts/lookup";

export function BoardPositionLinks({
  boards,
  itemName,
  headingClassName = "text-sm font-medium",
  className = "mb-8",
  showHeading = true,
  showCaption = true,
  linked = true,
  displaySides = "toggle",
  collapsibleTitle = "Board",
}: {
  boards: BoardEntry[];
  itemName: string;
  headingClassName?: string;
  className?: string;
  showHeading?: boolean;
  showCaption?: boolean;
  linked?: boolean;
  displaySides?: "toggle" | "both";
  collapsibleTitle?: string;
}) {
  const [side, setSide] = useState<"front" | "back">("front");
  if (boards.length === 0) return null;

  const { slug, title, board } = boards[0];
  const position = getBoardPositionForItem(board, itemName);
  const imageURL = side === "back" ? board.imageSecondaryURL : board.imageURL;

  if (displaySides === "both") {
    return (
      <section className={className}>
        <CollapsibleBox
          title={collapsibleTitle}
          count={1}
          countLabel={title}
          contentClassName="border-t border-zinc-200 p-4 dark:border-zinc-800 sm:p-5"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {(["front", "back"] as const).map((boardSide) => (
              <div key={boardSide} className="min-w-0">
                <BoardPositionFigure
                  imageURL={
                    boardSide === "back"
                      ? board.imageSecondaryURL
                      : board.imageURL
                  }
                  title={title}
                  itemName={itemName}
                  position={position}
                  side={boardSide}
                  terrain={board.terrain}
                  showCaption={false}
                />
                <p className="mt-2 text-sm font-medium capitalize text-zinc-900 dark:text-zinc-100">
                  {boardSide}
                </p>
              </div>
            ))}
          </div>
        </CollapsibleBox>
      </section>
    );
  }

  return (
    <section className={className}>
      {(showHeading || boards.length > 1) && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          {showHeading ? <h2 className={headingClassName}>Board</h2> : <span />}
          <div
            className="inline-flex overflow-hidden rounded border border-zinc-200 text-sm dark:border-zinc-800"
            aria-label={`${itemName} board side`}
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
        </div>
      )}
      {linked ? (
        <Link href={`/boards/${slug}`} className="group block max-w-sm">
          <BoardPositionFigure
            imageURL={imageURL}
            title={title}
            itemName={itemName}
            position={position}
            side={side}
            terrain={board.terrain}
            showCaption={showCaption}
            linked
          />
        </Link>
      ) : (
        <div className="block max-w-sm">
          <BoardPositionFigure
            imageURL={imageURL}
            title={title}
            itemName={itemName}
            position={position}
            side={side}
            terrain={board.terrain}
            showCaption={showCaption}
          />
        </div>
      )}
    </section>
  );
}

function BoardPositionFigure({
  imageURL,
  title,
  itemName,
  position,
  side,
  terrain,
  showCaption,
  linked = false,
}: {
  imageURL: string;
  title: string;
  itemName: string;
  position: BoardPosition | null;
  side: "front" | "back";
  terrain: string;
  showCaption: boolean;
  linked?: boolean;
}) {
  return (
    <>
      <span
        className={`block overflow-hidden rounded border border-zinc-200 bg-zinc-100 transition dark:border-zinc-800 dark:bg-zinc-900 ${
          linked ? "group-hover:ring-2 group-hover:ring-zinc-400" : ""
        }`}
      >
        <BoardPositionImage
          imageURL={imageURL}
          title={title}
          itemName={itemName}
          position={position}
          side={side}
        />
      </span>
      {showCaption && (
        <>
          <span className="mt-2 block text-sm font-medium group-hover:underline">
            {title}
          </span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            {terrain}
          </span>
        </>
      )}
    </>
  );
}

function BoardPositionImage({
  imageURL,
  title,
  itemName,
  position,
  side,
}: {
  imageURL: string;
  title: string;
  itemName: string;
  position: BoardPosition | null;
  side: "front" | "back";
}) {
  const imageAspectRatio = useImageAspectRatio(imageURL);

  if (!position) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageURL}
        alt={`${title} ${side}`}
        className="block w-full aspect-square object-cover"
      />
    );
  }

  const crop = cropForBoardPosition(position);
  const cropAspectRatio = (imageAspectRatio ?? 1) * (crop.width / crop.height);
  const backgroundSizeX = 100 / crop.width;
  const backgroundSizeY = 100 / crop.height;
  const backgroundPositionX =
    crop.width === 1 ? 50 : (crop.left / (1 - crop.width)) * 100;
  const backgroundPositionY =
    crop.height === 1 ? 50 : (crop.top / (1 - crop.height)) * 100;

  return (
    <span
      role="img"
      aria-label={`${itemName} position on ${title} ${side}`}
      className="block w-full bg-no-repeat"
      style={{
        aspectRatio: cropAspectRatio,
        backgroundImage: `url(${JSON.stringify(imageURL)})`,
        backgroundPosition: `${backgroundPositionX}% ${backgroundPositionY}%`,
        backgroundSize: `${backgroundSizeX}% ${backgroundSizeY}%`,
      }}
    />
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
