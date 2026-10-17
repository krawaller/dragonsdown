import boardPositionData from "../../data/manual/board-positions.json";
import type { TTSBoard } from "./tts";

export type BoardPosition = {
  column: number;
  columns: number;
  row: number;
  rows: number;
  topStrip?: "high" | "low";
  box?: Partial<{
    left: number;
    top: number;
    width: number;
    height: number;
  }>;
};

type BoardPositionLayout = {
  topStrip?: "high" | "low";
  rows: string[][];
  positions?: Record<
    string,
    Partial<{
      left: number;
      top: number;
      width: number;
      height: number;
    }>
  >;
};

const BOARD_POSITION_LAYOUTS = boardPositionData as BoardPositionLayout[];

export function getBoardPositionForItem(
  board: Pick<TTSBoard, "merchants" | "sites">,
  itemName: string,
): BoardPosition | null {
  const layout = layoutForBoard(board);
  if (!layout) return null;

  const targetName = normalizeBoardPositionName(itemName);
  for (const [row, names] of layout.rows.entries()) {
    const column = names.findIndex(
      (name) => normalizeBoardPositionName(name) === targetName,
    );
    if (column !== -1) {
      return {
        column,
        columns: names.length,
        row,
        rows: layout.rows.length,
        topStrip: layout.topStrip,
        box: positionBoxOverride(layout, names[column]),
      };
    }
  }

  return null;
}

function layoutForBoard(
  board: Pick<TTSBoard, "merchants" | "sites">,
): BoardPositionLayout | null {
  const boardKey = boardPositionKey([...board.sites, ...board.merchants]);
  return (
    BOARD_POSITION_LAYOUTS.find(
      (layout) => boardPositionKey(layout.rows.flat()) === boardKey,
    ) ?? null
  );
}

function boardPositionKey(names: string[]): string {
  return names.map(normalizeBoardPositionName).sort().join("|");
}

function positionBoxOverride(
  layout: BoardPositionLayout,
  name: string,
): BoardPosition["box"] {
  if (!layout.positions) return undefined;
  const targetName = normalizeBoardPositionName(name);
  const match = Object.entries(layout.positions).find(
    ([positionName]) => normalizeBoardPositionName(positionName) === targetName,
  );
  return match?.[1];
}

function normalizeBoardPositionName(name: string): string {
  return name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
