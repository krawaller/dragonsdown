"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { TTSCardImage } from "@/lib/tts";
import type { CardEntry } from "@/lib/tts/lookup";

type Zoom = { card: TTSCardImage; name: string };

export function CardGrid({ entries }: { entries: CardEntry[] }) {
  const [zoom, setZoom] = useState<Zoom | null>(null);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {entries.map(({ name, cards }) => (
          <section key={name} className="flex flex-col gap-2">
            <h2 className="text-sm font-medium">{name}</h2>
            <div className="flex flex-wrap gap-2">
              {cards.map((card, i) => (
                <button
                  key={`${card.faceURL}-${card.row}-${card.col}-${i}`}
                  type="button"
                  onClick={() => setZoom({ card, name })}
                  className="cursor-pointer rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:ring-2 hover:ring-zinc-400 transition"
                  aria-label={`Zoom ${name}`}
                >
                  <SpriteCell card={card} className="w-28" />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      {zoom && <CardLightbox zoom={zoom} onClose={() => setZoom(null)} />}
    </>
  );
}

function CardLightbox({ zoom, onClose }: { zoom: Zoom; onClose: () => void }) {
  const { card, name } = zoom;
  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${name} card`}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <div className="relative max-w-5xl w-full flex flex-col items-center gap-4">
        <h2 className="text-2xl font-semibold text-white">{name}</h2>
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex flex-wrap justify-center gap-6"
        >
          <SpriteCell card={card} className="w-[20rem] sm:w-[24rem]" />
          {card.uniqueBack ? (
            <SpriteCell card={card} useBack className="w-[20rem] sm:w-[24rem]" />
          ) : (
            // Shared back: just an <img>, no cropping needed.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.backURL}
              alt={`${name} back`}
              className="w-[20rem] sm:w-[24rem] aspect-[5/7] object-cover rounded bg-zinc-100"
            />
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-0 right-0 text-white text-3xl leading-none px-2"
        >
          ×
        </button>
      </div>
    </div>
  );
}

/**
 * Renders a single card cell from its sprite sheet. Sets the sheet as a CSS
 * background and scales/positions it so one cell fills the visible box.
 * Set `useBack` to crop from `backURL` instead of `faceURL` (only valid when
 * `uniqueBack` is true).
 */
function SpriteCell({
  card,
  useBack = false,
  className = "",
}: {
  card: TTSCardImage;
  useBack?: boolean;
  className?: string;
}) {
  const url = useBack ? card.backURL : card.faceURL;
  const style: CSSProperties = {
    aspectRatio: "5 / 7",
    backgroundImage: `url(${url})`,
    backgroundSize: `${card.numWidth * 100}% ${card.numHeight * 100}%`,
    backgroundPosition: `${(card.col / Math.max(card.numWidth - 1, 1)) * 100}% ${
      (card.row / Math.max(card.numHeight - 1, 1)) * 100
    }%`,
    backgroundRepeat: "no-repeat",
  };
  return <div className={`${className} bg-zinc-100 rounded`} style={style} />;
}
