"use client";

import { useState } from "react";
import type { TTSCardImage } from "@/lib/tts";

/**
 * A button that, when clicked, reveals the face (and back when unique) of
 * every TTS card matching the parent section. Cropping is done in CSS — the
 * full sprite sheet is loaded once and positioned via background-size +
 * background-position.
 */
export function CardImages({ cards }: { cards: TTSCardImage[] }) {
  const [open, setOpen] = useState(false);
  if (cards.length === 0) return null;
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-900"
      >
        {open ? "Hide card" : `View card${cards.length > 1 ? `s (${cards.length})` : ""}`}
      </button>
      {open && (
        <div className="mt-3 flex flex-wrap gap-4">
          {cards.map((card, i) => (
            <CardPair key={i} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}

function CardPair({ card }: { card: TTSCardImage }) {
  return (
    <div className="flex gap-3 items-start">
      <SpriteCell
        url={card.faceURL}
        numWidth={card.numWidth}
        numHeight={card.numHeight}
        row={card.row}
        col={card.col}
        label="face"
      />
      <SpriteCell
        url={card.backURL}
        numWidth={card.uniqueBack ? card.numWidth : 1}
        numHeight={card.uniqueBack ? card.numHeight : 1}
        row={card.uniqueBack ? card.row : 0}
        col={card.uniqueBack ? card.col : 0}
        label="back"
      />
    </div>
  );
}

function SpriteCell({
  url,
  numWidth,
  numHeight,
  row,
  col,
  label,
}: {
  url: string;
  numWidth: number;
  numHeight: number;
  row: number;
  col: number;
  label: string;
}) {
  // Use the sheet as a CSS background; scale it so one cell fills the box.
  return (
    <div
      role="img"
      aria-label={label}
      className="w-40 rounded border border-zinc-200 dark:border-zinc-800 shadow-sm bg-zinc-100 dark:bg-zinc-900"
      style={{
        aspectRatio: "5 / 7",
        backgroundImage: `url(${url})`,
        backgroundSize: `${numWidth * 100}% ${numHeight * 100}%`,
        backgroundPosition: `${(col / Math.max(numWidth - 1, 1)) * 100}% ${(row / Math.max(numHeight - 1, 1)) * 100}%`,
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
