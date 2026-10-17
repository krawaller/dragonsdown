import type { BoardPosition } from "@/lib/board-positions";

export type BoardPositionCrop = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function cropForBoardPosition(
  position: BoardPosition,
): BoardPositionCrop {
  const topStrip = topStripHeight(position.topStrip);
  const rowHeight = (1 - topStrip) / position.rows;
  const columnWidth = 1 / position.columns;
  const isSingleItemBoard = position.rows === 1 && position.columns === 1;
  const horizontalInset = columnWidth * 0.02;
  if (isSingleItemBoard) {
    const verticalInset = rowHeight * 0.02;

    return {
      left: horizontalInset,
      top: topStrip + verticalInset,
      width: columnWidth - horizontalInset * 2,
      height: rowHeight - verticalInset * 2,
    };
  }

  const singleItemVerticalInset = isSingleItemBoard ? rowHeight * 0.02 : 0;
  const topOutset = position.rows === 1 ? 0 : rowHeight * 0.03;
  const topInset =
    position.rows === 1 && !isSingleItemBoard ? rowHeight * 0.02 : 0;
  const originalTop = topStrip + position.row * rowHeight;
  const topWithOutset = Math.max(0, originalTop - topOutset);
  const appliedTopOutset = originalTop - topWithOutset;
  const top = topWithOutset + topInset + singleItemVerticalInset;
  const areaHeight =
    rowHeight * (isSingleItemBoard ? 0.98 : 0.95) +
    appliedTopOutset -
    topInset -
    singleItemVerticalInset;
  const areaHorizontalInset = horizontalInset;

  return {
    left: position.column * columnWidth + areaHorizontalInset,
    top,
    width: columnWidth - areaHorizontalInset * 2,
    height: areaHeight,
  };
}

function topStripHeight(topStrip: BoardPosition["topStrip"]): number {
  switch (topStrip) {
    case "high":
      return 0.24;
    case "low":
      return 0.16;
    default:
      return 0;
  }
}
