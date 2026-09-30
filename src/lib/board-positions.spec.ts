import { describe, expect, it } from "vitest";
import { getBoardPositionForItem } from "./board-positions";

describe("getBoardPositionForItem", () => {
  const hostileHillsBoard = {
    sites: ["Burrow", "Stone Circle", "Watchtower"],
    merchants: ["Outfitter"],
  };

  it("maps Hostile Hills connected items to the two-by-two board layout", () => {
    expect(getBoardPositionForItem(hostileHillsBoard, "Burrow")).toMatchObject({
      row: 0,
      column: 0,
      rows: 2,
      columns: 2,
      topStrip: "high",
    });
    expect(
      getBoardPositionForItem(hostileHillsBoard, "Stone Circle"),
    ).toMatchObject({ row: 0, column: 1 });
    expect(
      getBoardPositionForItem(hostileHillsBoard, "Watchtower"),
    ).toMatchObject({ row: 1, column: 0 });
    expect(
      getBoardPositionForItem(hostileHillsBoard, "Outfitter"),
    ).toMatchObject({ row: 1, column: 1 });
  });
});
