"use client";

import { useEffect, useState } from "react";
import type { TTSChip } from "@/lib/tts";
import type { ChipEntry } from "@/lib/tts/lookup";

type Zoom = { chip: TTSChip; name: string };

export function ChipGrid({ entries }: { entries: ChipEntry[] }) {
  const [zoom, setZoom] = useState<Zoom | null>(null);

  // ESC closes the lightbox.
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
        {entries.map(({ name, prettyName, chips }) => (
          <section key={name} className="flex flex-col gap-2">
            <h2 className="text-base font-semibold">{prettyName}</h2>
            <div className="flex flex-wrap gap-2">
              {chips.map((chip, i) => (
                <div key={`${chip.imageURL}-${i}`} className="relative">
                  <button
                    type="button"
                    onClick={() => setZoom({ chip, name: prettyName })}
                    className="block rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:ring-2 hover:ring-zinc-400 transition"
                    aria-label={`Zoom ${prettyName}${chip.count > 1 ? ` (×${chip.count})` : ""}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={chip.imageURL}
                      alt={prettyName}
                      className="w-20 h-20 object-cover block bg-zinc-100 dark:bg-zinc-900"
                    />
                  </button>
                  {chip.count > 1 && (
                    <span className="pointer-events-none absolute -top-1 -right-1 min-w-[1.5rem] text-center px-1.5 py-0.5 text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-full shadow">
                      ×{chip.count}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      {zoom && <ChipLightbox zoom={zoom} onClose={() => setZoom(null)} />}
    </>
  );
}

function ChipLightbox({ zoom, onClose }: { zoom: Zoom; onClose: () => void }) {
  const { chip, name } = zoom;
  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${name} chip`}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <div className="relative max-w-5xl w-full flex flex-col items-center gap-4">
        <h2 className="text-2xl font-semibold text-white">{name}</h2>
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex flex-wrap justify-center gap-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={chip.imageURL}
            alt={`${name} face`}
            className="max-h-[70vh] max-w-[45vw] rounded-full object-contain bg-zinc-100"
          />
          {chip.imageSecondaryURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={chip.imageSecondaryURL}
              alt={`${name} back`}
              className="max-h-[70vh] max-w-[45vw] rounded-full object-contain bg-zinc-100"
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
