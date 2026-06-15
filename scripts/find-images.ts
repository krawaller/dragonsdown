import type { ObjectState, DragonsDownWorkshop } from "../src/lib/tts/workshop";
import fs from "fs-extra";
import path from "path";
import eastern from "../data/downloaded-tts/dd_all_exp.json";

const nameObjectState = (obj: ObjectState): string => {
  return [
    obj.LuaScript?.match(/^--([A-Za-z ]{1,})\r/)?.[1]?.trim(),
    obj.GMNotes,
    obj.Nickname,
    obj.Name,
  ].filter((s): s is string => !!s)[0];
};

const analyseObjectState = (
  obj?: ObjectState,
  lineage: string[] = [],
): Record<string, string[]> => {
  const images: Record<string, string[]> = {};
  if (!obj) return images;
  const name = nameObjectState(obj);
  const newLineage = [...lineage, name];
  if (obj.CustomImage?.ImageURL) images[obj.CustomImage.ImageURL] = newLineage;
  if (obj.CustomImage?.ImageSecondaryURL)
    images[obj.CustomImage.ImageSecondaryURL] = newLineage.concat(["2nd"]);
  if (obj.CustomDeck) {
    for (const [n, deck] of Object.entries(obj.CustomDeck)) {
      if (deck.FaceURL) images[deck.FaceURL] = newLineage.concat(n);
      if (deck.BackURL) images[deck.BackURL] = newLineage.concat([n, "back"]);
    }
  }
  const curry = (obj: ObjectState, n: string | number) =>
    analyseObjectState(obj, newLineage.concat(String(n)));
  const flatten = (entries?: [string, ObjectState][]) =>
    entries?.reduce((memo, [n, o]) => ({ ...memo, ...curry(o, n) }), {}) ?? {};
  return {
    ...images,
    ...flatten(Object.entries(obj.ContainedObjects ?? {})),
    ...flatten(Object.entries(obj.ChildObjects ?? {})),
    ...flatten(Object.entries(obj.ContainedObjects ?? {})),
    ...flatten(Object.entries(obj.States ?? {})),
  };
};

// JSON-import inference widens the tuple fields (e.g. `PlayingTime` becomes
// `number[]`) so a direct cast fails. Bridge via `unknown` — we trust the
// shape because it's our own TTS save export.
const states = [...(eastern as unknown as DragonsDownWorkshop).ObjectStates];

const all = states.reduce(
  (memo, obj) => ({
    ...memo,
    ...analyseObjectState(obj, []),
  }),
  {},
);

const out = path.join(__dirname, "..", "generated/image-urls.json");
fs.ensureDirSync(path.dirname(out));
fs.writeFileSync(out, JSON.stringify(all, null, 2), "utf-8");
