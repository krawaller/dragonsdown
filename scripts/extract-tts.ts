/**
 * Build the TTS card index and chip index from data/downloaded-tts/*.json into
 * data/extracted-from-tts/cards.json and data/extracted-from-tts/chips.json.
 *
 * Each source file is a TTS save export. The source identifier (used in the
 * output) is the file's stem (e.g. "dd_all_exp").
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  addToBoxes,
  applyManualMonsterChipNames,
  extractBoards,
  extractCards,
  extractChips,
  extractClasses,
  extractCivilisationTokens,
  extractCivLocations,
  extractItems,
  extractLegendaryLocations,
  extractLineages,
  extractMapTileMonsters,
  extractMapTiles,
  extractMissions,
  extractNatives,
  extractNativeSummons,
  extractSiteMonsters,
  extractSites,
  extractSpells,
  extractTreasures,
  extractWildernessTokens,
  isSameCell,
  mergeTreasureCardLinks,
  mergeTreasureCubePlacements,
  mergeTreasureEnchantments,
  mergeTags,
  sameAncestry,
  type BoardIndex,
  type CardIndex,
  type ChipIndex,
  type ClassAdvantageReference,
  type ClassIndex,
  type CivLocationIndex,
  type ItemIndex,
  type LegendaryLocationIndex,
  type LineageAdvantageReference,
  type LineageIndex,
  type MapTileMonsterIndex,
  type ManualMonsterChipNameIndex,
  type MissionIndex,
  type MissionNicknameCorrection,
  type MissionStatsMapping,
  type NativeIndex,
  type NativeSummonIndex,
  type AliasMap,
  type SpellIndex,
  type SpellManifestReference,
  type TreasureIndex,
  type TTSTreasureCard,
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

const SOURCES_DIR = path.join(process.cwd(), "data", "downloaded-tts");
const OUT_DIR = path.join(process.cwd(), "data", "extracted-from-tts");
const TREASURES_FILE = path.join(process.cwd(), "data", "treasures.json");
const DERIVED_DIR = path.join(process.cwd(), "data", "derived");
const MANUAL_DIR = path.join(process.cwd(), "data", "manual");
const CLASS_ADVANTAGES_FILE = path.join(DERIVED_DIR, "class-advantages.json");
const LINEAGE_ADVANTAGES_FILE = path.join(
  DERIVED_DIR,
  "lineage-advantages.json",
);
const SPELL_MANIFEST_FILE = path.join(DERIVED_DIR, "spell-manifest.json");
const ALIASES_FILE = path.join(
  process.cwd(),
  "src",
  "lib",
  "tts",
  "aliases.json",
);
const MISSION_NICKNAME_CORRECTIONS_FILE = path.join(
  MANUAL_DIR,
  "mission-nickname-corrections.json",
);
const MISSION_STATS_FILE = path.join(MANUAL_DIR, "mission-stats.json");
const MONSTER_CHIP_NAMES_FILE = path.join(
  MANUAL_DIR,
  "monster-chip-names.json",
);

/** Add to this list if a future save adds content not present in `dd_all_exp.json`. */
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
  const missionStats =
    await readJsonFile<MissionStatsMapping[]>(MISSION_STATS_FILE);
  const manualMonsterChipNames = await readJsonFile<ManualMonsterChipNameIndex>(
    MONSTER_CHIP_NAMES_FILE,
  );
  const classAdvantages = await readJsonFile<ClassAdvantageReference[]>(
    CLASS_ADVANTAGES_FILE,
  );
  const lineageAdvantages = await readJsonFile<LineageAdvantageReference[]>(
    LINEAGE_ADVANTAGES_FILE,
  );
  const spellManifest =
    await readJsonFile<SpellManifestReference[]>(SPELL_MANIFEST_FILE);
  const aliases = await readJsonFile<AliasMap>(ALIASES_FILE);

  const cards: CardIndex = {};
  const classes: ClassIndex = {};
  const lineages: LineageIndex = {};
  const spells: SpellIndex = {};
  const boards: BoardIndex = [];
  const chips: ChipIndex = {};
  const items: ItemIndex = {};
  const treasures: TreasureIndex = {};
  const legendaryLocations: LegendaryLocationIndex = {};
  const sites: SiteIndex = {};
  const siteMonsters: SiteMonsterIndex = {};
  const civLocations: CivLocationIndex = {};
  const civilisationTokens: TTSCivilisationToken[] = [];
  const wildernessTokens: WildernessTokenIndex = {};
  const mapTileMonsters: MapTileMonsterIndex = {};
  const missions: MissionIndex = {};
  const natives: NativeIndex = {};
  const nativeSummons: NativeSummonIndex = {};
  let mapTiles: TTSMapTile[] = [];

  for (const file of files) {
    const stem = path.basename(file, ".json");
    const raw = await fs.readFile(path.join(SOURCES_DIR, file), "utf-8");
    const save = JSON.parse(raw) as unknown;

    const cardIndex = extractCards(save, stem);
    const classIndex = extractClasses(save, stem, classAdvantages);
    const lineageIndex = extractLineages(save, stem, lineageAdvantages);
    const spellIndex = extractSpells(save, stem, spellManifest, aliases);
    const boardIndex = extractBoards(save, stem);
    const chipIndex = extractChips(save, stem);
    const itemIndex = extractItems(save, stem);
    const treasureIndex = extractTreasures(save, stem);
    const legendaryLocationIndex = extractLegendaryLocations(save, stem);
    const siteIndex = extractSites(save, stem);
    const siteMonsterIndex = extractSiteMonsters(save, stem);
    const civIndex = extractCivLocations(save, stem);
    const civilisationIndex = extractCivilisationTokens(save, stem);
    const wildernessIndex = extractWildernessTokens(save, stem);
    const mapTileMonsterIndex = extractMapTileMonsters(save, stem);
    const missionIndex = extractMissions(save, stem, {
      missionKinds,
      missionNicknameCorrections,
      missionStats,
    });
    const nativeIndex = extractNatives(save, stem);
    const nativeSummonIndex = extractNativeSummons(save, stem);
    mapTiles = extractMapTiles(save);
    console.log(
      `${file}: ${boardIndex.length} boards / ${countEntries(cardIndex)} cards / ${countEntries(classIndex)} classes / ${countEntries(lineageIndex)} lineages / ${countEntries(spellIndex)} spells / ${countEntries(chipIndex)} chips / ${countEntries(itemIndex)} item cards / ${countEntries(treasureIndex)} treasures / ${countEntries(legendaryLocationIndex)} legendary locations / ${countEntries(siteIndex)} sites / ${countEntries(siteMonsterIndex)} site-monster groups / ${countEntries(civIndex)} civ-locations / ${civilisationIndex.length} civilisation tokens / ${countEntries(wildernessIndex)} wilderness tokens / ${mapTiles.length} map tiles / ${countEntries(mapTileMonsterIndex)} map-tile monster groups / ${countEntries(missionIndex)} missions / ${countEntries(nativeIndex)} native groups / ${countEntries(nativeSummonIndex)} native summon groups`,
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
    for (const [name, items] of Object.entries(classIndex)) {
      const bucket = (classes[name] ??= []);
      for (const item of items) {
        const existing = bucket.find((entry) => entry.source === item.source);
        if (existing) continue;
        bucket.push(item);
      }
    }
    for (const [name, items] of Object.entries(lineageIndex)) {
      const bucket = (lineages[name] ??= []);
      for (const item of items) {
        const existing = bucket.find((entry) => entry.source === item.source);
        if (existing) continue;
        bucket.push(item);
      }
    }
    for (const [name, items] of Object.entries(spellIndex)) {
      const bucket = (spells[name] ??= []);
      for (const item of items) {
        const existing = bucket.find((entry) => entry.source === item.source);
        if (existing) continue;
        bucket.push(item);
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
    for (const [name, items] of Object.entries(nativeIndex)) {
      const bucket = (natives[name] ??= []);
      for (const item of items) {
        if (bucket.some((native) => native.group === item.group)) continue;
        bucket.push(item);
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
    for (const [name, itemCards] of Object.entries(itemIndex)) {
      const bucket = (items[name] ??= []);
      for (const item of itemCards) {
        const existing = bucket.find((card) => isSameCell(card, item));
        if (existing) {
          existing.copies += item.copies;
          existing.tags = mergeTags(existing.tags, item.tags);
          for (const loc of item.locations) {
            const match = existing.locations.find((l) =>
              sameAncestry(l.ancestry, loc.ancestry),
            );
            if (match) match.count += loc.count;
            else existing.locations.push({ ...loc });
          }
          for (const box of item.boxes) {
            addToBoxes(existing.boxes, box.name, box.count);
          }
        } else {
          bucket.push({
            ...item,
            locations: item.locations.map((l) => ({ ...l })),
            boxes: item.boxes.map((box) => ({ ...box })),
          });
        }
      }
    }
    for (const [name, treasureCards] of Object.entries(treasureIndex)) {
      const bucket = (treasures[name] ??= []);
      for (const treasure of treasureCards) {
        const existing = bucket.find((card) => isSameTreasure(card, treasure));
        if (existing) {
          existing.copies += treasure.copies;
          existing.tags = mergeTags(existing.tags, treasure.tags);
          if (!existing.terrainPack && treasure.terrainPack) {
            existing.terrainPack = treasure.terrainPack;
          }
          existing.enchantments = mergeTreasureEnchantments(
            existing.enchantments,
            treasure.enchantments,
          );
          existing.cubePlacements = mergeTreasureCubePlacements(
            existing.cubePlacements,
            treasure.cubePlacements,
          );
          existing.cardLinks = mergeTreasureCardLinks(
            existing.cardLinks,
            treasure.cardLinks,
          );
          for (const loc of treasure.locations) {
            const match = existing.locations.find((l) =>
              sameAncestry(l.ancestry, loc.ancestry),
            );
            if (match) match.count += loc.count;
            else existing.locations.push({ ...loc });
          }
        } else {
          bucket.push({
            ...treasure,
            locations: treasure.locations.map((l) => ({ ...l })),
          });
        }
      }
    }
    for (const [name, locations] of Object.entries(legendaryLocationIndex)) {
      const bucket = (legendaryLocations[name] ??= []);
      for (const location of locations) {
        const existing = bucket.find((entry) =>
          isSameCell(entry.card, location.card),
        );
        if (existing) {
          existing.card.tags = mergeTags(
            existing.card.tags,
            location.card.tags,
          );
          existing.siteToken ??= location.siteToken;
          existing.monsterChips ??= location.monsterChips;
          existing.description ||= location.description;
          existing.treasureSetup ??= location.treasureSetup;
          existing.rewards ??= location.rewards;
        } else {
          bucket.push(location);
        }
      }
    }
  }

  await writeJson(path.join(OUT_DIR, "boards.json"), boards);
  await writeSorted(path.join(OUT_DIR, "cards.json"), cards);
  await writeSorted(path.join(OUT_DIR, "classes.json"), classes);
  await writeSorted(path.join(OUT_DIR, "lineages.json"), lineages);
  await writeSorted(path.join(OUT_DIR, "spells.json"), spells);
  await writeSorted(
    path.join(OUT_DIR, "chips.json"),
    applyManualMonsterChipNames(chips, manualMonsterChipNames),
  );
  await writeSorted(path.join(OUT_DIR, "items.json"), items);
  await writeSorted(TREASURES_FILE, treasures);
  await writeSorted(
    path.join(OUT_DIR, "legendary-locations.json"),
    legendaryLocations,
  );
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
  await writeSorted(path.join(OUT_DIR, "natives.json"), natives);
  await writeSorted(path.join(OUT_DIR, "native-summons.json"), nativeSummons);
  console.log(`→ boards.json: ${boards.length} boards total`);
  console.log(
    `→ cards.json: ${Object.keys(cards).length} names, ${countEntries(cards)} cards total`,
  );
  console.log(
    `→ classes.json: ${Object.keys(classes).length} names, ${countEntries(classes)} classes total`,
  );
  console.log(
    `→ lineages.json: ${Object.keys(lineages).length} names, ${countEntries(lineages)} lineages total`,
  );
  console.log(
    `→ spells.json: ${Object.keys(spells).length} names, ${countEntries(spells)} spells total`,
  );
  console.log(
    `→ chips.json: ${Object.keys(chips).length} names, ${countEntries(chips)} chips total`,
  );
  console.log(
    `→ items.json: ${Object.keys(items).length} names, ${countEntries(items)} item cards total`,
  );
  console.log(
    `→ treasures.json: ${Object.keys(treasures).length} names, ${countEntries(treasures)} treasure cards total`,
  );
  console.log(
    `→ legendary-locations.json: ${Object.keys(legendaryLocations).length} names, ${countEntries(legendaryLocations)} locations total`,
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
    `→ natives.json: ${Object.keys(natives).length} names, ${countEntries(natives)} groups total`,
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

function isSameTreasure(a: TTSTreasureCard, b: TTSTreasureCard): boolean {
  return a.deck === b.deck && isSameCell(a, b);
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
