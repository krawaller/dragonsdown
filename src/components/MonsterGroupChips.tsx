"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { chipTotalCount } from "@/lib/tts";
import type { MonsterGroupChip, MonsterGroupEntry } from "@/lib/tts/lookup";

type Zoom = { imageURL: string; name: string; face: string };

export function MonsterGroupStack({
  group,
  hrefBase = "/monster-groups",
}: {
  group: MonsterGroupEntry;
  hrefBase?: string;
}) {
  const preview = group.chips.slice(0, 4);
  const totalCopies = group.chips.reduce(
    (sum, chip) => sum + chipTotalCount(chip),
    0,
  );

  return (
    <Link
      href={`${hrefBase}/${group.slug}`}
      className="group block rounded border border-zinc-200 dark:border-zinc-800 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
    >
      <div className="relative h-28 mb-4">
        {preview.map((chip, index) => (
          <span
            key={`${chip.imageURL}-${index}`}
            className="absolute block w-20 h-20 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 shadow-sm"
            style={{
              left: `${index * 1.55}rem`,
              top: `${index % 2 === 0 ? 0 : 1.25}rem`,
              zIndex: preview.length - index,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={chip.imageURL}
              alt=""
              className="block w-full h-full object-cover"
            />
          </span>
        ))}
      </div>
      <h2 className="text-lg font-semibold group-hover:underline">
        {group.prettyName}
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {group.chips.length} chip{" "}
        {group.chips.length === 1 ? "image" : "images"}
        {" · "}
        {totalCopies} total
      </p>
      {(group.mapTiles.length > 0 ||
        group.sites.length > 0 ||
        group.legendaryLocations.length > 0 ||
        group.nativeSummons.length > 0) && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {group.nativeSummons.length > 0 ? (
            <>
              {group.nativeSummons.length} location{" "}
              {group.nativeSummons.length === 1 ? "link" : "links"}
            </>
          ) : (
            <>
              {group.mapTiles.length} map tile{" "}
              {group.mapTiles.length === 1 ? "link" : "links"}
              {" · "}
              {group.sites.length} site{" "}
              {group.sites.length === 1 ? "link" : "links"}
              {group.legendaryLocations.length > 0 && (
                <>
                  {" · "}
                  {group.legendaryLocations.length} legendary location{" "}
                  {group.legendaryLocations.length === 1 ? "link" : "links"}
                </>
              )}
            </>
          )}
        </p>
      )}
    </Link>
  );
}

export function MonsterGroupChipList({ group }: { group: MonsterGroupEntry }) {
  const [zoom, setZoom] = useState<Zoom | null>(null);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoom(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {group.chips.map((chip, index) => {
          const total = chipTotalCount(chip);
          const displayName = monsterChipName(group, chip, index);
          const faces = chipFaces(chip);
          return (
            <section
              key={`${chip.imageURL}-${chip.imageSecondaryURL}-${index}`}
              className="rounded border border-zinc-200 dark:border-zinc-800 p-4"
            >
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex shrink-0 gap-3">
                  {faces.map((face) => (
                    <button
                      key={`${face.label}-${face.imageURL}`}
                      type="button"
                      onClick={() =>
                        setZoom({
                          imageURL: face.imageURL,
                          name: displayName,
                          face: face.label,
                        })
                      }
                      className="block size-24 shrink-0 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:ring-2 hover:ring-zinc-400 transition cursor-pointer"
                      aria-label={`Zoom ${displayName} ${face.label}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={face.imageURL}
                        alt={`${displayName} ${face.label}`}
                        className="block h-full w-full object-cover bg-zinc-100 dark:bg-zinc-900"
                      />
                    </button>
                  ))}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold">{displayName}</h2>
                  {displayName !== group.prettyName && (
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {group.prettyName}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {total} physical {total === 1 ? "chip" : "chips"}
                  </p>
                  <ul className="mt-3 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {chip.locations.map((location) => (
                      <li
                        key={`${location.ancestry.join("/")}-${location.count}`}
                      >
                        {location.ancestry.length > 0
                          ? location.ancestry.join(" / ")
                          : "Loose"}
                        {" · "}
                        {location.count}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          );
        })}
      </div>
      {zoom && <ChipLightbox zoom={zoom} onClose={() => setZoom(null)} />}
    </>
  );
}

function chipFaces(
  chip: MonsterGroupChip,
): { label: string; imageURL: string }[] {
  const faces = [{ label: "front", imageURL: chip.imageURL }];
  if (chip.imageSecondaryURL) {
    faces.push({ label: "back", imageURL: chip.imageSecondaryURL });
  }
  return faces;
}

function monsterChipName(
  group: MonsterGroupEntry,
  chip: MonsterGroupChip,
  index: number,
): string {
  if (chip.monsterName) return chip.monsterName;
  return group.chips.length > 1
    ? `${group.prettyName} ${index + 1}`
    : group.prettyName;
}

function ChipLightbox({ zoom, onClose }: { zoom: Zoom; onClose: () => void }) {
  const { imageURL, name, face } = zoom;
  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${name} ${face}`}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <div className="relative flex h-full max-h-full w-full max-w-3xl flex-col items-center gap-4">
        <h2 className="max-w-[calc(100%-3rem)] text-center text-2xl font-semibold text-white">
          {name} <span className="font-normal text-zinc-300">{face}</span>
        </h2>
        <div
          onClick={(event) => event.stopPropagation()}
          className="flex min-h-0 flex-1 items-center justify-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageURL}
            alt={`${name} ${face}`}
            className="max-h-full max-w-full aspect-square object-cover rounded-full bg-zinc-100"
          />
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
