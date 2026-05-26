/**
 * Server-side lookup over the baked TTS indexes (cards and chips).
 *
 * Loaded once at module init (like RULEBOOKS); used by SectionView to decide
 * whether to render a "view card" button for a given section title.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  normalizeTitle,
  prettifyChipName,
  resolveCards,
  type AliasMap,
  type CardIndex,
  type ChipIndex,
  type TTSCardImage,
  type TTSChip,
} from ".";
import aliasesData from "./aliases.json";

const CARDS_FILE = path.join(process.cwd(), "data", "tts", "cards.json");
const CHIPS_FILE = path.join(process.cwd(), "data", "tts", "chips.json");

let cachedCardIndex: CardIndex | null = null;
let cachedChipIndex: ChipIndex | null = null;
let cachedAliases: AliasMap | null = null;

function getCardIndex(): CardIndex {
  if (cachedCardIndex !== null) return cachedCardIndex;
  cachedCardIndex = readJsonOrEmpty<CardIndex>(CARDS_FILE);
  return cachedCardIndex;
}

function getChipIndex(): ChipIndex {
  if (cachedChipIndex !== null) return cachedChipIndex;
  cachedChipIndex = readJsonOrEmpty<ChipIndex>(CHIPS_FILE);
  return cachedChipIndex;
}

function readJsonOrEmpty<T>(file: string): T {
  try {
    return JSON.parse(readFileSync(file, "utf-8")) as T;
  } catch {
    return {} as T;
  }
}

function getAliases(): AliasMap {
  if (cachedAliases !== null) return cachedAliases;
  // Normalize both sides at load time so resolveCards can do a single
  // normalized lookup per target.
  const raw = aliasesData as Record<string, string | string[]>;
  cachedAliases = {};
  for (const [from, to] of Object.entries(raw)) {
    const normalizedFrom = normalizeTitle(from);
    cachedAliases[normalizedFrom] = Array.isArray(to)
      ? to.map(normalizeTitle)
      : normalizeTitle(to);
  }
  return cachedAliases;
}

export function findCards(title: string): TTSCardImage[] {
  return resolveCards(title, getCardIndex(), getAliases());
}

/**
 * Entry shape used by the chips index page: one row per chip key.
 * `name` is the raw `GMNotes` key; `prettyName` is the display form.
 */
export type ChipEntry = {
  name: string;
  prettyName: string;
  chips: TTSChip[];
};

/** Return all chip entries, sorted alphabetically by prettified name. */
export function getAllChips(): ChipEntry[] {
  const idx = getChipIndex();
  return Object.entries(idx)
    .map(([name, chips]) => ({ name, prettyName: prettifyChipName(name), chips }))
    .sort((a, b) => a.prettyName.localeCompare(b.prettyName));
}
