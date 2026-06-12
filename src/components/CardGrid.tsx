"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TTSCardImage } from "@/lib/tts";
import type { CardEntry, MissionTargetKind } from "@/lib/tts/lookup";
import { SpriteCell } from "@/components/CardSprite";
import { MissionKindBadge } from "@/components/MissionKindBadge";

type Zoom = { card: TTSCardImage; name: string };

export function CardGrid({
  entries,
  excludeTag,
  hrefBase,
}: {
  entries: CardEntry[];
  /** Tag to omit from each card's per-card tag list (the page's own tag). */
  excludeTag?: string;
  /** Optional base path for linking each entry heading by its `slug`. */
  hrefBase?: string;
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
            <h2 className="text-sm font-medium">
              {hrefBase && entry.slug ? (
                <Link
                  href={`${hrefBase}/${entry.slug}`}
                  className="hover:underline"
                >
                  {entry.name}
                </Link>
              ) : (
                entry.name
              )}
            </h2>
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
            <MissionKindBadge key={kind} kind={kind} />
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

