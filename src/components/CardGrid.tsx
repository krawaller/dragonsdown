"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { TTSCardImage } from "@/lib/tts";
import type { CardEntry, MissionTargetKind } from "@/lib/tts/lookup";
import type { MissionKind } from "@/lib/tts";

type Zoom = { card: TTSCardImage; name: string };

export function CardGrid({
  entries,
  excludeTag,
}: {
  entries: CardEntry[];
  /** Tag to omit from each card's per-card tag list (the page's own tag). */
  excludeTag?: string;
}) {
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
        {entries.map((entry) => (
          <section
            key={entry.name}
            id={entry.slug}
            className="flex flex-col gap-2 scroll-mt-6"
          >
            <h2 className="text-sm font-medium">{entry.name}</h2>
            <CardEntryDetails entry={entry} />
            <div className="flex flex-wrap gap-3">
              {entry.cards.map((card, i) => (
                <button
                  key={`${card.faceURL}-${card.row}-${card.col}-${i}`}
                  type="button"
                  onClick={() => setZoom({ card, name: entry.name })}
                  className="cursor-pointer rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:ring-2 hover:ring-zinc-400 transition"
                  aria-label={`Zoom ${entry.name}`}
                >
                  <SpriteCell card={card} className="w-28" />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      {zoom && (
        <CardLightbox
          zoom={zoom}
          excludeTag={excludeTag}
          onClose={() => setZoom(null)}
        />
      )}
    </>
  );
}

function CardEntryDetails({ entry }: { entry: CardEntry | undefined }) {
  if (!entry) return null;
  const descriptions = entry.descriptions ?? [];
  const kinds = entry.kinds ?? [];
  const rewardSummaries = entry.rewardSummaries ?? [];
  const targets = entry.targets ?? [];
  if (
    descriptions.length === 0 &&
    kinds.length === 0 &&
    rewardSummaries.length === 0 &&
    targets.length === 0
  ) {
    return null;
  }
  return (
    <div className="space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
      {kinds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {kinds.map((kind) => (
            <span
              key={kind}
              className={`${missionKindClassName(kind)} rounded border px-2 py-1 font-medium`}
            >
              {missionKindLabel(kind)}
            </span>
          ))}
        </div>
      )}
      {descriptions.map((description) => (
        <p key={description}>{description}</p>
      ))}
      {rewardSummaries.length > 0 && (
        <div className="space-y-1">
          {rewardSummaries.map((summary) => (
            <p key={summary}>{summary}</p>
          ))}
        </div>
      )}
      {targets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {targets.map((target) => (
            <a
              key={`${target.kind}-${target.name}`}
              href={target.href}
              className="rounded border border-zinc-200 dark:border-zinc-800 px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              {target.name}
              <span className="ml-1 text-zinc-400 dark:text-zinc-500">
                {missionTargetKindLabel(target.kind)}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function missionKindLabel(kind: MissionKind): string {
  switch (kind) {
    case "atrocity":
      return "Atrocity";
    case "quest":
      return "Quest";
    case "expedition":
      return "Expedition";
  }
}

function missionKindClassName(kind: MissionKind): string {
  switch (kind) {
    case "atrocity":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300";
    case "quest":
      return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200";
    case "expedition":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
  }
}

function missionTargetKindLabel(kind: MissionTargetKind): string {
  switch (kind) {
    case "native":
      return "native";
    case "site":
      return "site";
    case "merchant":
      return "merchant";
    case "civLocation":
      return "civ";
    case "wildernessToken":
      return "token";
  }
}

function otherTagsFor(card: TTSCardImage, excludeTag?: string): string[] {
  if (!card.tags) return [];
  if (!excludeTag) return card.tags;
  return card.tags.filter((t) => t !== excludeTag);
}

function TagBadges({ tags }: { tags: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {tags.map((t) => (
        <span
          key={t}
          className="text-sm px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function CardLightbox({
  zoom,
  excludeTag,
  onClose,
}: {
  zoom: Zoom;
  excludeTag?: string;
  onClose: () => void;
}) {
  const { card, name } = zoom;
  const otherTags = otherTagsFor(card, excludeTag);
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
        {otherTags.length > 0 && (
          <div onClick={(e) => e.stopPropagation()}>
            <TagBadges tags={otherTags} />
          </div>
        )}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex flex-wrap justify-center gap-6"
        >
          <SpriteCell card={card} className="w-[20rem] sm:w-[24rem]" />
          {card.uniqueBack ? (
            <SpriteCell
              card={card}
              useBack
              className="w-[20rem] sm:w-[24rem]"
            />
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
