import boardImageCropData from "../../data/manual/board-image-crops.json";

type BoardImageCrop = {
  top?: number;
};

const BOARD_IMAGE_CROPS: Record<string, BoardImageCrop> = boardImageCropData;

export function getBoardImageCropTop(boardSlug: string): number {
  return BOARD_IMAGE_CROPS[boardSlug]?.top ?? 0;
}
