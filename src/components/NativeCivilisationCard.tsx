"use client";

import { useState } from "react";
import { SpriteCell } from "@/components/CardSprite";
import type { TTSCardImage } from "@/lib/tts";

export function NativeCivilisationCard({
  card,
  name,
}: {
  card: TTSCardImage;
  name: string;
}) {
  const [side, setSide] = useState<"front" | "back">("front");
  const showingBack = side === "back";

  return (
    <section className="mb-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Civilisation Card</h2>
        <div
          className="inline-flex rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden text-sm"
          aria-label={`${name} card side`}
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
      <SpriteCell
        card={card}
        useBack={showingBack}
        className="w-full max-w-72 border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm"
      />
    </section>
  );
}
