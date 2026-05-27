"use client";

import { useEffect, useState } from "react";
import type { TTSCivLocation } from "@/lib/tts";
import type { CivLocationEntry } from "@/lib/tts/lookup";

type Zoom = { name: string; location: TTSCivLocation };

export function CivLocationGrid({ entries }: { entries: CivLocationEntry[] }) {
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
        {entries.map(({ name, location }) => (
          <section key={`${name}-${location.imageURL}`} className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setZoom({ name, location })}
              className="cursor-pointer rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:ring-2 hover:ring-zinc-400 transition"
              aria-label={`Zoom ${name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={location.imageURL}
                alt={name}
                className="w-full aspect-square object-cover block bg-zinc-100 dark:bg-zinc-900"
              />
            </button>
            <h2 className="text-base font-semibold mt-1">{name}</h2>
            {location.ancestry.length > 0 && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {location.ancestry.join(" / ")}
              </p>
            )}
          </section>
        ))}
      </div>
      {zoom && <CivLocationLightbox zoom={zoom} onClose={() => setZoom(null)} />}
    </>
  );
}

function CivLocationLightbox({
  zoom,
  onClose,
}: {
  zoom: Zoom;
  onClose: () => void;
}) {
  const { name, location } = zoom;
  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${name} civ location`}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <div className="relative w-full max-w-2xl flex flex-col items-center gap-3">
        <h2 className="text-2xl font-semibold text-white">{name}</h2>
        {location.ancestry.length > 0 && (
          <p className="text-sm text-zinc-300">{location.ancestry.join(" / ")}</p>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          onClick={(e) => e.stopPropagation()}
          src={location.imageURL}
          alt={name}
          className="w-full max-h-[75vh] aspect-square object-contain rounded bg-zinc-100"
        />
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
