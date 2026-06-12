/**
 * Build the TTS card index and chip index from sources/*.json into
 * data/tts/cards.json and data/tts/chips.json.
 *
 * Each source file is a TTS save export. The source identifier (used in the
 * output) is the file's stem (e.g. "eastern", "core_desolation_natives").
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  extractBoards,
  extractCards,
  extractChips,
  extractCivilisationTokens,
  extractCivLocations,
  extractMapTileMonsters,
  extractMapTiles,
  extractMissions,
  extractNativeSummons,
  extractSiteMonsters,
  extractSites,
  extractWildernessTokens,
  isSameCell,
  mergeTags,
  sameAncestry,
  type BoardIndex,
  type CardIndex,
  type ChipIndex,
  type CivLocationIndex,
  type MapTileMonsterIndex,
  type MissionIndex,
  type MissionNicknameCorrection,
  type NativeSummonIndex,
  type TTSCivilisationToken,
  type TTSMapTile,
  type SiteIndex,
  type SiteMonsterIndex,
  type WildernessTokenIndex,
} from "../src/lib/tts";
import {
  generateMissionKindMap,
  MISSION_KIND_MAP_FILE,
} from "./extract-mission-kinds";

const SOURCES_DIR = path.join(process.cwd(), "sources");
const OUT_DIR = path.join(process.cwd(), "data", "tts");
const MANUAL_DIR = path.join(process.cwd(), "data", "manual");
const MISSION_NICKNAME_CORRECTIONS_FILE = path.join(
  MANUAL_DIR,
  "mission-nickname-corrections.json",
);

/**
 * The Eastern Reaches TTS save is a strict superset of the
 * core_desolation_natives save (verified: every card and chip in the latter
 * appears in the former with identical URLs and copy counts), so we only
 * need to read this one file. Add to this list if a future save adds
 * content not present in `dd_all_exp.json`.
 */
const SOURCE_FILES = ["dd_all_exp.json"];

async function main(): Promise<void> {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const files = SOURCE_FILES;
  const missionKinds = await generateMissionKindMap({
    sourceFiles: files,
    outFile: MISSION_KIND_MAP_FILE,
  });
  const missionNicknameCorrections = await readJsonFile<
    MissionNicknameCorrection[]
  >(MISSION_NICKNAME_CORRECTIONS_FILE);

  const cards: CardIndex = {};
  const boards: BoardIndex = [];
  const chips: ChipIndex = {};
  const sites: SiteIndex = {};
  const siteMonsters: SiteMonsterIndex = {};
  const civLocations: CivLocationIndex = {};
  const civilisationTokens: TTSCivilisationToken[] = [];
  const wildernessTokens: WildernessTokenIndex = {};
  const mapTileMonsters: MapTileMonsterIndex = {};
  const missions: MissionIndex = {};
  const nativeSummons: NativeSummonIndex = {};
  let mapTiles: TTSMapTile[] = [];

  for (const file of files) {
    const stem = path.basename(file, ".json");
    const raw = await fs.readFile(path.join(SOURCES_DIR, file), "utf-8");
    const save = JSON.parse(raw) as unknown;

    const cardIndex = extractCards(save, stem);
    const boardIndex = extractBoards(save, stem);
    const chipIndex = extractChips(save, stem);
    const siteIndex = extractSites(save, stem);
    const siteMonsterIndex = extractSiteMonsters(save, stem);
    const civIndex = extractCivLocations(save, stem);
    const civilisationIndex = extractCivilisationTokens(save, stem);
    const wildernessIndex = extractWildernessTokens(save, stem);
    const mapTileMonsterIndex = extractMapTileMonsters(save, stem);
    const missionIndex = extractMissions(save, stem, {
      missionKinds,
      missionNicknameCorrections,
    });
    const nativeSummonIndex = extractNativeSummons(save, stem);
    mapTiles = extractMapTiles(save);
    console.log(
      `${file}: ${boardIndex.length} boards / ${countEntries(cardIndex)} cards / ${countEntries(chipIndex)} chips / ${countEntries(siteIndex)} sites / ${countEntries(siteMonsterIndex)} site-monster groups / ${countEntries(civIndex)} civ-locations / ${civilisationIndex.length} civilisation tokens / ${countEntries(wildernessIndex)} wilderness tokens / ${mapTiles.length} map tiles / ${countEntries(mapTileMonsterIndex)} map-tile monster groups / ${countEntries(missionIndex)} missions / ${countEntries(nativeSummonIndex)} native summon groups`,
    );

    boards.push(...boardIndex);

    // Merge into combined indexes, de-duping by cell (cards) / image URL (chips).
    for (const [nick, items] of Object.entries(cardIndex)) {
      const bucket = (cards[nick] ??= []);
      for (const item of items) {
        const existing = bucket.find((c) => isSameCell(c, item));
        if (existing) {
          existing.tags = mergeTags(existing.tags, item.tags);
        } else {
          bucket.push(item);
        }
      }
    }
    // Sites: no dedup needed (each site appears once per save). Cross-source
    // collisions just append (so we can spot duplicate entries if any).
    for (const [name, items] of Object.entries(siteIndex)) {
      (sites[name] ??= []).push(...items);
    }
    for (const [name, items] of Object.entries(siteMonsterIndex)) {
      (siteMonsters[name] ??= []).push(...items);
    }
    // Civ locations: same shape — append, no dedup.
    for (const [name, items] of Object.entries(civIndex)) {
      (civLocations[name] ??= []).push(...items);
    }
    for (const item of civilisationIndex) {
      const existing = civilisationTokens.find((token) =>
        isSameCivilisationToken(token, item),
      );
      if (existing) {
        for (const loc of item.locations) {
          const match = existing.locations.find((l) =>
            sameAncestry(l.ancestry, loc.ancestry),
          );
          if (match) match.count += loc.count;
          else existing.locations.push({ ...loc });
        }
      } else {
        civilisationTokens.push({
          ...item,
          locations: item.locations.map((l) => ({ ...l })),
        });
      }
    }
    for (const [terrain, items] of Object.entries(wildernessIndex)) {
      const bucket = (wildernessTokens[terrain] ??= []);
      for (const item of items) {
        const existing = bucket.find(
          (token) =>
            token.imageURL === item.imageURL &&
            token.imageSecondaryURL === item.imageSecondaryURL,
        );
        if (existing) {
          existing.nicknames = mergeStringArrays(
            existing.nicknames,
            item.nicknames,
          );
          for (const loc of item.locations) {
            const match = existing.locations.find((l) =>
              sameAncestry(l.ancestry, loc.ancestry),
            );
            if (match) match.count += loc.count;
            else existing.locations.push({ ...loc });
          }
        } else {
          bucket.push({
            ...item,
            nicknames: item.nicknames ? [...item.nicknames] : undefined,
            locations: item.locations.map((l) => ({ ...l })),
          });
        }
      }
    }
    for (const [name, items] of Object.entries(mapTileMonsterIndex)) {
      (mapTileMonsters[name] ??= []).push(...items);
    }
    for (const [name, items] of Object.entries(missionIndex)) {
      const bucket = (missions[name] ??= []);
      for (const item of items) {
        const existing = bucket.find((card) => isSameCell(card, item));
        if (existing) {
          existing.tags = mergeTags(existing.tags, item.tags);
          if (!existing.description && item.description) {
            existing.description = item.description;
          }
          existing.completeAt = mergeStringArrays(
            existing.completeAt,
            item.completeAt,
          );
          if (!existing.kind && item.kind) existing.kind = item.kind;
          if (!existing.rewards && item.rewards)
            existing.rewards = item.rewards;
        } else {
          bucket.push(item);
        }
      }
    }
    for (const [name, items] of Object.entries(nativeSummonIndex)) {
      (nativeSummons[name] ??= []).push(...items);
    }
    // Chips dedup by URL pair across sources; per-ancestry counts are summed.
    for (const [name, items] of Object.entries(chipIndex)) {
      const bucket = (chips[name] ??= []);
      for (const item of items) {
        const existing = bucket.find(
          (c) =>
            c.imageURL === item.imageURL &&
            c.imageSecondaryURL === item.imageSecondaryURL,
        );
        if (existing) {
          for (const loc of item.locations) {
            const match = existing.locations.find((l) =>
              sameAncestry(l.ancestry, loc.ancestry),
            );
            if (match) match.count += loc.count;
            else existing.locations.push({ ...loc });
          }
        } else {
          bucket.push({
            ...item,
            locations: item.locations.map((l) => ({ ...l })),
          });
        }
      }
    }
  }

  await writeJson(path.join(OUT_DIR, "boards.json"), boards);
  await writeSorted(path.join(OUT_DIR, "cards.json"), cards);
  await writeSorted(path.join(OUT_DIR, "chips.json"), chips);
  await writeSorted(path.join(OUT_DIR, "sites.json"), sites);
  await writeSorted(path.join(OUT_DIR, "site-monsters.json"), siteMonsters);
  await writeSorted(path.join(OUT_DIR, "civlocations.json"), civLocations);
  await writeJson(
    path.join(OUT_DIR, "civilisation-tokens.json"),
    civilisationTokens,
  );
  await writeSorted(
    path.join(OUT_DIR, "wilderness-tokens.json"),
    wildernessTokens,
  );
  await writeJson(path.join(OUT_DIR, "map-tiles.json"), mapTiles);
  await writeSorted(
    path.join(OUT_DIR, "map-tile-monsters.json"),
    mapTileMonsters,
  );
  await writeSorted(path.join(OUT_DIR, "missions.json"), missions);
  await writeSorted(path.join(OUT_DIR, "native-summons.json"), nativeSummons);
  console.log(`→ boards.json: ${boards.length} boards total`);
  console.log(
    `→ cards.json: ${Object.keys(cards).length} names, ${countEntries(cards)} cards total`,
  );
  console.log(
    `→ chips.json: ${Object.keys(chips).length} names, ${countEntries(chips)} chips total`,
  );
  console.log(
    `→ sites.json: ${Object.keys(sites).length} names, ${countEntries(sites)} sites total`,
  );
  console.log(
    `→ site-monsters.json: ${Object.keys(siteMonsters).length} names, ${countEntries(siteMonsters)} groups total`,
  );
  console.log(
    `→ civlocations.json: ${Object.keys(civLocations).length} names, ${countEntries(civLocations)} entries total`,
  );
  console.log(
    `→ civilisation-tokens.json: ${civilisationTokens.length} token images total`,
  );
  console.log(
    `→ wilderness-tokens.json: ${Object.keys(wildernessTokens).length} terrains, ${countEntries(wildernessTokens)} token images total`,
  );
  console.log(`→ map-tiles.json: ${mapTiles.length} map tiles total`);
  console.log(
    `→ map-tile-monsters.json: ${Object.keys(mapTileMonsters).length} map tiles, ${countEntries(mapTileMonsters)} groups total`,
  );
  console.log(
    `→ missions.json: ${Object.keys(missions).length} names, ${countEntries(missions)} cards total`,
  );
  console.log(
    `→ native-summons.json: ${Object.keys(nativeSummons).length} sources, ${countEntries(nativeSummons)} groups total`,
  );
}

async function readJsonFile<T>(file: string): Promise<T> {
  const raw = await fs.readFile(file, "utf-8");
  return JSON.parse(raw) as T;
}

function countEntries<T>(index: Record<string, T[]>): number {
  return Object.values(index).reduce((n, arr) => n + arr.length, 0);
}

async function writeSorted(
  file: string,
  index: Record<string, unknown>,
): Promise<void> {
  const sorted = Object.fromEntries(
    Object.entries(index).sort(([a], [b]) => a.localeCompare(b)),
  );
  await fs.writeFile(file, JSON.stringify(sorted, null, 2));
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

function mergeStringArrays(
  a: string[] | undefined,
  b: string[] | undefined,
): string[] | undefined {
  if (!a?.length && !b?.length) return undefined;
  return [...new Set([...(a ?? []), ...(b ?? [])])].sort((x, y) =>
    x.localeCompare(y),
  );
}

function isSameCivilisationToken(
  a: TTSCivilisationToken,
  b: TTSCivilisationToken,
): boolean {
  return (
    a.imageURL === b.imageURL &&
    a.imageSecondaryURL === b.imageSecondaryURL &&
    a.gmNotes === b.gmNotes &&
    a.name === b.name &&
    a.attribute === b.attribute &&
    a.terrain === b.terrain
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
