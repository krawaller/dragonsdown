import type { CSSProperties } from "react";
import type { TTSCardImage } from "@/lib/tts";

/**
 * Renders a single card cell from its sprite sheet. Sets the sheet as a CSS
 * background and scales/positions it so one cell fills the visible box.
 * Set `useBack` to crop from `backURL` instead of `faceURL` (only valid when
 * `uniqueBack` is true).
 */
export function SpriteCell({
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