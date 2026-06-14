import { execFile } from "node:child_process";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { deserialize } from "bson";

const execFileAsync = promisify(execFile);

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

type NumberTokenMap = Map<string, string>;

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
      if (entry.isFile() && isWorkshopSourceFile(entry.name))
        return [entryPath];
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

function normalizedNumberText(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`Cannot write non-finite JSON number: ${value}`);
  }

  const floatValue = Math.fround(value);
  if (Number.isInteger(value) && Math.abs(value) >= 1e10) {
    for (
      let significantDigits = 1;
      significantDigits <= 15;
      significantDigits += 1
    ) {
      const candidate = Number(value.toPrecision(significantDigits));
      if (Math.fround(candidate) === floatValue) return String(candidate);
    }
  }

  if (!Number.isInteger(value) && floatValue === value) {
    for (let decimals = 0; decimals <= 9; decimals += 1) {
      const candidate = Number(value.toFixed(decimals));
      if (Math.fround(candidate) === floatValue) return String(candidate);
    }
  }

  return String(value);
}

function pathKey(pathSegments: (string | number)[]): string {
  return JSON.stringify(pathSegments);
}

function numbersMatch(left: number, right: number): boolean {
  return Object.is(left, right) || Math.fround(left) === Math.fround(right);
}

function numberText(
  value: number,
  pathSegments: (string | number)[],
  tokenMaps: NumberTokenMap[],
): string {
  const key = pathKey(pathSegments);
  for (const tokens of tokenMaps) {
    const token = tokens.get(key);
    if (token !== undefined && numbersMatch(Number(token), value)) return token;
  }

  const text = normalizedNumberText(value);
  const [lastSegment] = pathSegments.slice(-1);
  if (
    Number.isInteger(value) &&
    typeof lastSegment === "string" &&
    isFloatKey(lastSegment)
  ) {
    return `${text}.0`;
  }

  return text;
}

function isFloatKey(key: string): boolean {
  return /^(r|g|b|a|x|y|z|posX|posY|posZ|rotX|rotY|rotZ|scaleX|scaleY|scaleZ|xSize|ySize)$/.test(
    key,
  );
}

function writeJson(
  value: unknown,
  tokenMaps: NumberTokenMap[],
  indent = "",
  pathSegments: (string | number)[] = [],
): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number")
    return numberText(value, pathSegments, tokenMaps);
  if (typeof value === "boolean") return value ? "true" : "false";

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const childIndent = `${indent}  `;
    const entries = value.map(
      (child, index) =>
        `${childIndent}${writeJson(child, tokenMaps, childIndent, [...pathSegments, index])}`,
    );
    return `[\n${entries.join(",\n")}\n${indent}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    const childIndent = `${indent}  `;
    const lines = entries.map(
      ([key, child]) =>
        `${childIndent}${JSON.stringify(key)}: ${writeJson(
          child,
          tokenMaps,
          childIndent,
          [...pathSegments, key],
        )}`,
    );
    return `{\n${lines.join(",\n")}\n${indent}}`;
  }

  throw new Error(`Cannot write unsupported JSON value: ${String(value)}`);
}

function collectNumberTokens(json: string): NumberTokenMap {
  const tokens: NumberTokenMap = new Map();
  let index = 0;

  function fail(message: string): never {
    throw new Error(`${message} at offset ${index}`);
  }

  function skipWhitespace(): void {
    while (/\s/.test(json[index] ?? "")) index += 1;
  }

  function parseString(): string {
    const start = index;
    index += 1;
    while (index < json.length) {
      const char = json[index];
      index += 1;
      if (char === "\\") {
        index += 1;
      } else if (char === '"') {
        return JSON.parse(json.slice(start, index)) as string;
      }
    }
    fail("Unterminated string");
  }

  function parseLiteral(literal: string): void {
    if (json.slice(index, index + literal.length) !== literal) {
      fail(`Expected ${literal}`);
    }
    index += literal.length;
  }

  function parseNumber(pathSegments: (string | number)[]): void {
    const match = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(
      json.slice(index),
    );
    if (!match) fail("Expected number");
    tokens.set(pathKey(pathSegments), match[0]);
    index += match[0].length;
  }

  function parseArray(pathSegments: (string | number)[]): void {
    index += 1;
    skipWhitespace();
    if (json[index] === "]") {
      index += 1;
      return;
    }

    let arrayIndex = 0;
    while (index < json.length) {
      parseValue([...pathSegments, arrayIndex]);
      arrayIndex += 1;
      skipWhitespace();
      if (json[index] === "]") {
        index += 1;
        return;
      }
      if (json[index] !== ",") fail("Expected array comma or close bracket");
      index += 1;
      skipWhitespace();
    }
    fail("Unterminated array");
  }

  function parseObject(pathSegments: (string | number)[]): void {
    index += 1;
    skipWhitespace();
    if (json[index] === "}") {
      index += 1;
      return;
    }

    while (index < json.length) {
      if (json[index] !== '"') fail("Expected object key");
      const key = parseString();
      skipWhitespace();
      if (json[index] !== ":") fail("Expected object colon");
      index += 1;
      parseValue([...pathSegments, key]);
      skipWhitespace();
      if (json[index] === "}") {
        index += 1;
        return;
      }
      if (json[index] !== ",") fail("Expected object comma or close brace");
      index += 1;
      skipWhitespace();
    }
    fail("Unterminated object");
  }

  function parseValue(pathSegments: (string | number)[]): void {
    skipWhitespace();
    const char = json[index];
    if (char === "{") parseObject(pathSegments);
    else if (char === "[") parseArray(pathSegments);
    else if (char === '"') parseString();
    else if (char === "t") parseLiteral("true");
    else if (char === "f") parseLiteral("false");
    else if (char === "n") parseLiteral("null");
    else parseNumber(pathSegments);
    skipWhitespace();
  }

  parseValue([]);
  return tokens;
}

async function readHeadTarget(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["show", `HEAD:${TARGET}`], {
      cwd: process.cwd(),
      maxBuffer: 100 * 1024 * 1024,
    });
    return stdout;
  } catch {
    return null;
  }
}

async function numberTokenMaps(): Promise<NumberTokenMap[]> {
  const maps: NumberTokenMap[] = [];
  const headTarget = await readHeadTarget();
  if (headTarget !== null) maps.push(collectNumberTokens(headTarget));
  if (await pathExists(TARGET))
    maps.push(collectNumberTokens(await readFile(TARGET, "utf8")));
  return maps;
}

function assertTtsSave(
  value: unknown,
  source: string,
): asserts value is object {
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray((value as { ObjectStates?: unknown }).ObjectStates)
  ) {
    throw new Error(
      `Decoded ${source}, but it does not look like a TTS save file.`,
    );
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

  await writeFile(TARGET, `${writeJson(save, await numberTokenMaps())}\n`);
  console.log(`Decoded ${source.filePath} -> ${TARGET}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
