import { describe, expect, it } from "vitest";
import { packTreasureRows } from "./treasure-print-layout";

describe("packTreasureRows", () => {
  it("packs consecutive entries and fills every row, including the last", () => {
    const rows = packTreasureRows([25, 25, 40, 25, 25], 210, 30, 5, 5);
    expect(rows.map((row) => row.map((item) => item.index))).toEqual([
      [0, 1, 2],
      [3, 4],
    ]);
    for (const row of rows) {
      const width =
        row.reduce((total, item) => total + 35 + item.textWidth, 0) +
        (row.length - 1) * 5;
      expect(width).toBeCloseTo(210);
    }
    expect(rows[0][2].textWidth).toBeGreaterThan(rows[0][0].textWidth);
  });

  it("gives a long description a full-width row without limiting its height", () => {
    const rows = packTreasureRows([400, 25], 200, 30, 5, 5);
    expect(rows).toEqual([
      [{ index: 0, textWidth: 165 }],
      [{ index: 1, textWidth: 165 }],
    ]);
  });

  it("recalculates row counts for narrower pages", () => {
    expect(packTreasureRows([25, 25, 25], 200, 30, 5, 5)).toHaveLength(1);
    expect(packTreasureRows([25, 25, 25], 110, 30, 5, 5)).toHaveLength(3);
  });

  it("handles empty input and an unmeasured page", () => {
    expect(packTreasureRows([], 200, 30, 5, 5)).toEqual([]);
    expect(packTreasureRows([25], 0, 30, 5, 5)).toEqual([]);
  });
});
