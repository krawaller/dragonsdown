import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { inflateSync } from "node:zlib";
import {
  missionCellKey,
  type MissionKind,
  type MissionKindMap,
} from "../src/lib/tts";

const SOURCES_DIR = path.join(process.cwd(), "sources");
const OUT_DIR = path.join(process.cwd(), "data", "extracted-from-tts");
const SOURCE_FILES = ["dd_all_exp.json"];

export const MISSION_KIND_MAP_FILE = path.join(
  OUT_DIR,
  "mission-kind-map.json",
);

type GenerateMissionKindMapOptions = {
  sourceFiles?: string[];
  outFile?: string;
  quiet?: boolean;
};

type MissionCell = {
  faceURL: string;
  numWidth: number;
  numHeight: number;
  row: number;
  col: number;
};

type PngImage = {
  width: number;
  height: number;
  channels: number;
  pixels: Uint8Array;
};

export async function generateMissionKindMap({
  sourceFiles = SOURCE_FILES,
  outFile = MISSION_KIND_MAP_FILE,
  quiet = false,
}: GenerateMissionKindMapOptions = {}): Promise<MissionKindMap> {
  const cells = new Map<string, MissionCell>();
  for (const file of sourceFiles) {
    const raw = await fs.readFile(path.join(SOURCES_DIR, file), "utf-8");
    collectMissionCells(JSON.parse(raw) as unknown, cells);
  }

  const images = new Map<string, PngImage>();
  const missionKinds: MissionKindMap = {};
  for (const cell of cells.values()) {
    const image =
      images.get(cell.faceURL) ?? (await downloadAndDecodePng(cell.faceURL));
    images.set(cell.faceURL, image);
    missionKinds[missionCellKey(cell)] = classifyMissionKind(image, cell);
  }

  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(
    outFile,
    `${JSON.stringify(sortObject(missionKinds), null, 2)}\n`,
  );

  if (!quiet) {
    const counts = countMissionKinds(missionKinds);
    console.log(
      `→ ${path.relative(process.cwd(), outFile)}: ${Object.keys(missionKinds).length} cells / ${counts.atrocity} atrocities / ${counts.quest} quests / ${counts.expedition} expeditions`,
    );
  }

  return missionKinds;
}

function collectMissionCells(
  obj: unknown,
  cells: Map<string, MissionCell>,
): void {
  if (!isRecord(obj)) return;
  if (
    (obj.Name === "Card" || obj.Name === "CardCustom") &&
    Array.isArray(obj.Tags) &&
    obj.Tags.includes("Mission") &&
    isRecord(obj.CustomDeck) &&
    typeof obj.CardID === "number"
  ) {
    const deckId = Object.keys(obj.CustomDeck)[0];
    const deck =
      deckId && isRecord(obj.CustomDeck[deckId])
        ? obj.CustomDeck[deckId]
        : null;
    if (deck) {
      const faceURL = text(deck.FaceURL);
      const numWidth = numberValue(deck.NumWidth);
      const numHeight = numberValue(deck.NumHeight);
      const index = obj.CardID - Number.parseInt(deckId, 10) * 100;
      if (faceURL && numWidth > 0 && numHeight > 0 && index >= 0) {
        const cell = {
          faceURL,
          numWidth,
          numHeight,
          row: Math.floor(index / numWidth),
          col: index % numWidth,
        };
        cells.set(missionCellKey(cell), cell);
      }
    }
  }

  if (Array.isArray(obj.ObjectStates)) {
    for (const child of obj.ObjectStates) collectMissionCells(child, cells);
  }
  if (Array.isArray(obj.ContainedObjects)) {
    for (const child of obj.ContainedObjects) collectMissionCells(child, cells);
  }
}

async function downloadAndDecodePng(url: string): Promise<PngImage> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download ${url}: ${response.status} ${response.statusText}`,
    );
  }
  return decodePng(new Uint8Array(await response.arrayBuffer()));
}

function classifyMissionKind(image: PngImage, cell: MissionCell): MissionKind {
  const cardWidth = Math.floor(image.width / cell.numWidth);
  const cardHeight = Math.floor(image.height / cell.numHeight);
  const left = cell.col * cardWidth + 35;
  const right = (cell.col + 1) * cardWidth - 35;
  const top = cell.row * cardHeight + 25;
  const bottom = cell.row * cardHeight + 145;
  const hsvSamples: { h: number; s: number; v: number }[] = [];

  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const offset = (y * image.width + x) * image.channels;
      const hsv = rgbToHsv(
        image.pixels[offset],
        image.pixels[offset + 1],
        image.pixels[offset + 2],
      );
      if (hsv.v < 0.15 || (hsv.s < 0.12 && hsv.v > 0.78)) continue;
      hsvSamples.push(hsv);
    }
  }

  if (hsvSamples.length === 0) {
    throw new Error(`No banner color samples for ${missionCellKey(cell)}`);
  }

  const hue = median(hsvSamples.map((sample) => sample.h));
  const saturation = median(hsvSamples.map((sample) => sample.s));
  const value = median(hsvSamples.map((sample) => sample.v));
  if (saturation < 0.25 && value > 0.55) return "quest";
  if (hue < 0.06 || hue > 0.93) return "atrocity";
  return "expedition";
}

function decodePng(bytes: Uint8Array): PngImage {
  const buffer = Buffer.from(bytes);
  if (
    !buffer
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    throw new Error("Unsupported image: missing PNG signature");
  }

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks: Buffer[] = [];

  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }

  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(
      `Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}`,
    );
  }

  const channels = colorType === 6 ? 4 : 3;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const stride = width * channels;
  const pixels = new Uint8Array(width * height * channels);
  let inOffset = 0;
  let outOffset = 0;
  for (let y = 0; y < height; y++) {
    const filter = inflated[inOffset++];
    for (let x = 0; x < stride; x++) {
      const raw = inflated[inOffset++];
      const left = x >= channels ? pixels[outOffset - channels] : 0;
      const up = y > 0 ? pixels[outOffset - stride] : 0;
      const upperLeft =
        y > 0 && x >= channels ? pixels[outOffset - stride - channels] : 0;
      pixels[outOffset++] = unfilterByte(filter, raw, left, up, upperLeft);
    }
  }

  return { width, height, channels, pixels };
}

function unfilterByte(
  filter: number,
  raw: number,
  left: number,
  up: number,
  upperLeft: number,
): number {
  switch (filter) {
    case 0:
      return raw;
    case 1:
      return (raw + left) & 0xff;
    case 2:
      return (raw + up) & 0xff;
    case 3:
      return (raw + Math.floor((left + up) / 2)) & 0xff;
    case 4:
      return (raw + paeth(left, up, upperLeft)) & 0xff;
    default:
      throw new Error(`Unsupported PNG filter type: ${filter}`);
  }
}

function paeth(left: number, up: number, upperLeft: number): number {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance)
    return left;
  if (upDistance <= upperLeftDistance) return up;
  return upperLeft;
}

function rgbToHsv(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; v: number } {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue /= 6;
    if (hue < 0) hue += 1;
  }
  return { h: hue, s: max === 0 ? 0 : delta / max, v: max };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function countMissionKinds(
  missionKinds: MissionKindMap,
): Record<MissionKind, number> {
  return Object.values(missionKinds).reduce(
    (counts, kind) => ({ ...counts, [kind]: counts[kind] + 1 }),
    { atrocity: 0, quest: 0, expedition: 0 },
  );
}

function sortObject<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  generateMissionKindMap().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
