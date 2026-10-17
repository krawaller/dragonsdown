import boardReleaseData from "../../data/manual/board-releases.json";

const MANUAL_BOARD_RELEASE_BOXES: Record<string, string> = boardReleaseData;

export function getManualBoardReleaseBox(
  boardSlug: string,
): string | undefined {
  return MANUAL_BOARD_RELEASE_BOXES[boardSlug];
}
