export type TreasurePrintRow = { index: number; textWidth: number }[];

export function packTreasureRows(
  textWidths: readonly number[],
  availableWidth: number,
  cardWidth: number,
  entryGap: number,
  rowGap: number,
): TreasurePrintRow[] {
  if (availableWidth <= 0) return [];
  const fixedWidth = cardWidth + entryGap;
  const maximumTextWidth = Math.max(1, availableWidth - fixedWidth);
  const rows: TreasurePrintRow[] = [];
  let row: TreasurePrintRow = [];
  let usedWidth = 0;

  function finishRow() {
    if (!row.length) return;
    const remaining = Math.max(0, availableWidth - usedWidth);
    const totalTextWidth = row.reduce(
      (total, item) => total + item.textWidth,
      0,
    );
    rows.push(
      row.map((item) => ({
        ...item,
        textWidth:
          item.textWidth + (remaining * item.textWidth) / totalTextWidth,
      })),
    );
    row = [];
    usedWidth = 0;
  }

  textWidths.forEach((preferredWidth, index) => {
    const textWidth = Math.max(1, Math.min(preferredWidth, maximumTextWidth));
    const width = fixedWidth + textWidth;
    if (row.length && usedWidth + rowGap + width > availableWidth) finishRow();
    usedWidth += width + (row.length ? rowGap : 0);
    row.push({ index, textWidth });
  });
  finishRow();
  return rows;
}
