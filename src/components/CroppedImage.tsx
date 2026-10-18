"use client";

import { useEffect, useState } from "react";
import type { BoardPositionCrop } from "@/lib/board-position-crop";

export function CroppedImage({
  imageUrl,
  imageCrop,
  alt,
  className = "",
}: {
  imageUrl: string;
  imageCrop: BoardPositionCrop;
  alt: string;
  className?: string;
}) {
  const imageAspectRatio = useImageAspectRatio(imageUrl);
  const cropAspectRatio =
    (imageAspectRatio ?? 1) * (imageCrop.width / imageCrop.height);
  const backgroundSize = `${100 / imageCrop.width}% ${100 / imageCrop.height}%`;
  const backgroundPosition = `${imageCrop.width === 1 ? 50 : (imageCrop.left / (1 - imageCrop.width)) * 100}% ${imageCrop.height === 1 ? 50 : (imageCrop.top / (1 - imageCrop.height)) * 100}%`;

  return (
    <span
      role="img"
      aria-label={alt}
      className={`block w-full bg-no-repeat ${className}`}
      style={{
        aspectRatio: cropAspectRatio,
        backgroundImage: `url(${JSON.stringify(imageUrl)})`,
        backgroundPosition,
        backgroundSize,
      }}
    />
  );
}

function useImageAspectRatio(imageUrl: string): number | null {
  const [measurement, setMeasurement] = useState<{
    imageUrl: string;
    aspectRatio: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const image = new window.Image();
    image.onload = () => {
      if (cancelled || image.naturalHeight === 0) return;
      setMeasurement({
        imageUrl,
        aspectRatio: image.naturalWidth / image.naturalHeight,
      });
    };
    image.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return measurement?.imageUrl === imageUrl ? measurement.aspectRatio : null;
}
