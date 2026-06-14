import { readFile } from "node:fs/promises";
import path from "node:path";
import { WILDERNESS_TOKEN_FRONT_METADATA } from "../src/lib/tts";

const SOURCE_FILE = path.join(process.cwd(), "sources", "dd_all_exp.json");
const LOST_BATTALION_KEY = "lostbattalion";

type TtsObject = Record<string, unknown>;

type GuidReference = {
  variable: string;
  guid: string;
  object: TtsObject | undefined;
};

function isRecord(value: unknown): value is TtsObject {
  return typeof value === "object" && value !== null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function collectObjects(value: unknown, objects: TtsObject[]): void {
  if (!isRecord(value)) return;

  objects.push(value);

  if (Array.isArray(value.ObjectStates)) {
    for (const object of value.ObjectStates) collectObjects(object, objects);
  }

  if (Array.isArray(value.ContainedObjects)) {
    for (const object of value.ContainedObjects)
      collectObjects(object, objects);
  }

  if (isRecord(value.States)) {
    for (const object of Object.values(value.States))
      collectObjects(object, objects);
  }
}

function isLostBattalionSite(object: TtsObject): boolean {
  if (!isRecord(object.CustomImage)) return false;
  const imageURL = text(object.CustomImage.ImageURL);
  return WILDERNESS_TOKEN_FRONT_METADATA[imageURL]?.name === "Lost Battalion";
}

function luaFunctionBody(luaScript: string, functionName: string): string {
  const start = luaScript.indexOf(`function ${functionName}`);
  if (start < 0) return "";

  const nextFunction = luaScript.indexOf("\nfunction ", start + 1);
  return luaScript.slice(
    start,
    nextFunction < 0 ? luaScript.length : nextFunction,
  );
}

function guidReferences(
  luaScript: string,
  objectsByGuid: Map<string, TtsObject>,
): GuidReference[] {
  const references: GuidReference[] = [];
  const pattern =
    /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*getObjectFromGUID\("([0-9a-f]{6})"\)/gi;

  for (const match of luaScript.matchAll(pattern)) {
    const [, variable, guid] = match;
    references.push({
      variable,
      guid,
      object: objectsByGuid.get(guid.toLowerCase()),
    });
  }

  return references;
}

function isMonsterChipReference(reference: GuidReference): boolean {
  const object = reference.object;
  if (
    !object ||
    object.Name !== "Custom_Tile" ||
    !isRecord(object.CustomImage)
  ) {
    return false;
  }

  const notes = text(object.GMNotes);
  if (!notes) return false;

  return !/symbol summons local monsters/i.test(notes);
}

function displayName(object: TtsObject | undefined): string {
  if (!object) return "missing object";
  return (
    text(object.GMNotes) ||
    text(object.Nickname) ||
    text(object.Name) ||
    "unnamed object"
  );
}

async function main(): Promise<void> {
  const save = JSON.parse(await readFile(SOURCE_FILE, "utf8")) as unknown;
  const objects: TtsObject[] = [];
  collectObjects(save, objects);

  const objectsByGuid = new Map(
    objects
      .map((object) => [text(object.GUID).toLowerCase(), object] as const)
      .filter(([guid]) => guid !== ""),
  );
  const sites = objects.filter(isLostBattalionSite);

  if (sites.length === 0) {
    console.error(
      `Could not find a Lost Battalion site tile in ${SOURCE_FILE}.`,
    );
    process.exitCode = 2;
    return;
  }

  const problems: GuidReference[] = [];
  const checked: GuidReference[] = [];

  for (const site of sites) {
    const guardian = luaFunctionBody(text(site.LuaScript), "guardian");
    const monsterReferences = guidReferences(guardian, objectsByGuid).filter(
      isMonsterChipReference,
    );

    checked.push(...monsterReferences);
    problems.push(
      ...monsterReferences.filter(
        (reference) =>
          normalized(displayName(reference.object)) !== LOST_BATTALION_KEY,
      ),
    );
  }

  if (checked.length === 0) {
    console.error(
      `Could not find any Lost Battalion guardian chip GUIDs in ${SOURCE_FILE}.`,
    );
    process.exitCode = 2;
    return;
  }

  if (problems.length > 0) {
    console.log(`Lost Battalion mistake PRESENT in ${SOURCE_FILE}.`);
    for (const problem of problems) {
      console.log(
        `- ${problem.variable} -> ${problem.guid} (${displayName(problem.object)})`,
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Lost Battalion mistake not present in ${SOURCE_FILE}.`);
  for (const reference of checked) {
    console.log(
      `- ${reference.variable} -> ${reference.guid} (${displayName(reference.object)})`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 2;
});
