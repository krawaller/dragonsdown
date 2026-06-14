import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { deserialize } from "bson";

const APP_ID = "286160";
const WORKSHOP_ID = "3062060625";
const TARGET = path.join("sources", "dd_all_exp.json");
const LOCAL_STEAMCMD_ROOT = path.resolve(
  ".cache",
  "steamcmd",
  "steamapps",
  "workshop",
  "content",
  APP_ID,
  WORKSHOP_ID,
);

type SourceCandidate = {
  filePath: string;
  modified: number;
};

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function isWorkshopSourceFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".json") || lower.endsWith(".bin");
}

async function collectSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return collectSourceFiles(entryPath);
      if (entry.isFile() && isWorkshopSourceFile(entry.name)) return [entryPath];
      return [];
    }),
  );

  return files.flat();
}

async function newestSource(candidates: string[]): Promise<SourceCandidate> {
  const [source] = await Promise.all(
    candidates.map(async (filePath) => ({
      filePath,
      modified: (await stat(filePath)).mtimeMs,
    })),
  ).then((files) =>
    files.sort((left, right) => right.modified - left.modified),
  );

  return source;
}

async function readWorkshopSource(filePath: string): Promise<unknown> {
  const buffer = await readFile(filePath);
  if (filePath.toLowerCase().endsWith(".json")) {
    return JSON.parse(buffer.toString("utf8"));
  }

  return deserialize(buffer);
}

function assertTtsSave(value: unknown, source: string): asserts value is object {
  if (!value || typeof value !== "object" || !Array.isArray((value as { ObjectStates?: unknown }).ObjectStates)) {
    throw new Error(`Decoded ${source}, but it does not look like a TTS save file.`);
  }
}

async function workshopRoots(): Promise<string[]> {
  const home = process.env.HOME;
  if (!home)
    throw new Error("HOME is not set; cannot locate Steam workshop downloads.");

  return [
    LOCAL_STEAMCMD_ROOT,
    path.join(
      home,
      "Library",
      "Application Support",
      "Steam",
      "steamapps",
      "workshop",
      "content",
      APP_ID,
      WORKSHOP_ID,
    ),
    path.join(
      home,
      "Library",
      "Application Support",
      "Steam",
      "steamcmd",
      "steamapps",
      "workshop",
      "content",
      APP_ID,
      WORKSHOP_ID,
    ),
  ];
}

async function main() {
  const roots = await workshopRoots();
  const existingRoots = [];
  for (const root of roots) {
    if (await pathExists(root)) existingRoots.push(root);
  }

  if (existingRoots.length === 0) {
    throw new Error(
      `No downloaded workshop folder found. Searched:\n${roots.join("\n")}`,
    );
  }

  const candidates = (
    await Promise.all(existingRoots.map(collectSourceFiles))
  ).flat();
  if (candidates.length === 0) {
    throw new Error(
      `No JSON or BIN files found in downloaded workshop folder(s):\n${existingRoots.join("\n")}`,
    );
  }

  const source = await newestSource(candidates);
  const save = await readWorkshopSource(source.filePath);
  assertTtsSave(save, source.filePath);

  await writeFile(TARGET, `${JSON.stringify(save, null, 2)}\n`);
  console.log(`Decoded ${source.filePath} -> ${TARGET}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
