"use client";

import { useState } from "react";

export function BoardImageToggle({
  title,
  imageURL,
  imageSecondaryURL,
}: {
  title: string;
  imageURL: string;
  imageSecondaryURL: string;
}) {
  const [showBack, setShowBack] = useState(false);
  const image = showBack ? imageSecondaryURL : imageURL;
  const side = showBack ? "back" : "front";

  return (
    <section className="max-w-2xl">
      <label className="mb-3 inline-flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={showBack}
          onChange={(event) => setShowBack(event.target.checked)}
          className="size-4 rounded border-zinc-300 dark:border-zinc-700"
        />
        Show back image
      </label>
      <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={`${title} ${side}`}
          className="block w-full aspect-square object-contain"
        />
      </div>
    </section>
  );
}
