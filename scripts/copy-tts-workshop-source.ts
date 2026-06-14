import { copyFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const APP_ID = "286160";
const WORKSHOP_ID = "3062060625";
const TARGET = path.join("sources", "dd_all_exp.json");
const LOCAL_STEAMCMD_ROOT = path.join(
  ".cache",
  "steamcmd",
  "steamapps",
  "workshop",
  "content",
  APP_ID,
  WORKSHOP_ID,
);

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectJsonFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return collectJsonFiles(entryPath);
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
        return [entryPath];
      return [];
    }),
  );

  return files.flat();
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
    await Promise.all(existingRoots.map(collectJsonFiles))
  ).flat();
  if (candidates.length === 0) {
    throw new Error(
      `No JSON files found in downloaded workshop folder(s):\n${existingRoots.join("\n")}`,
    );
  }

  const [source] = await Promise.all(
    candidates.map(async (filePath) => ({
      filePath,
      modified: (await stat(filePath)).mtimeMs,
    })),
  ).then((files) =>
    files.sort((left, right) => right.modified - left.modified),
  );

  await copyFile(source.filePath, TARGET);
  console.log(`Copied ${source.filePath} -> ${TARGET}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
