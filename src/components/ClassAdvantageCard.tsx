"use client";

import Link from "next/link";
import { useState } from "react";
import { SpriteCell } from "@/components/CardSprite";
import { slugify } from "@/lib/slug";
import type { TTSCardImage, TTSClassSetup, TTSClassSetupSide } from "@/lib/tts";

export function ClassAdvantageCard({
  card,
  name,
  setup,
}: {
  card: TTSCardImage;
  name: string;
  setup?: TTSClassSetup;
}) {
  const [side, setSide] = useState<"front" | "back">("front");
  const loadout = setup?.[side];

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Advantage Card</h2>
        <div
          className="inline-flex rounded border border-zinc-200 dark:border-zinc-800 overflow-hidden text-sm"
          aria-label={`${name} advantage card side`}
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
        useBack={side === "back"}
        className="w-full max-w-72 border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm"
      />
      {loadout && <ClassSetupLoadout loadout={loadout} />}
    </section>
  );
}

function ClassSetupLoadout({ loadout }: { loadout: TTSClassSetupSide }) {
  return (
    <div className="mt-5 max-w-3xl rounded border border-zinc-200 dark:border-zinc-800 p-4">
      <h3 className="text-base font-semibold mb-3">Starting Loadout</h3>
      <div className="grid gap-5 sm:grid-cols-3">
        {loadout.items.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Items
            </h4>
            <ul className="space-y-1 text-sm">
              {loadout.items.map((item, index) => (
                <li key={`${item.name}-${item.slot}-${index}`}>
                  <Link
                    href={`/items/${slugify(item.name)}`}
                    className="hover:underline"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {loadout.cubes.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Cubes
            </h4>
            <ul className="space-y-1 text-sm">
              {loadout.cubes.map((cube, index) => (
                <li key={`${cube.type}-${cube.color}-${index}`}>
                  {cube.count} {cube.color} {cube.type}
                </li>
              ))}
            </ul>
          </div>
        )}
        {loadout.gold !== undefined && (
          <div>
            <h4 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Gold
            </h4>
            <p className="text-sm">{loadout.gold}</p>
          </div>
        )}
      </div>
    </div>
  );
}
