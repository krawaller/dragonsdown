/**
 * Server-side lookup over the baked TTS card index, with alias fallback.
 *
 * Loaded once at module init (like RULEBOOKS); used by SectionView to decide
 * whether to render a "view card" button for a given section title.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { normalizeTitle, resolveCards, type AliasMap, type CardIndex, type TTSCardImage } from ".";
import aliasesData from "./aliases.json";

const INDEX_FILE = path.join(process.cwd(), "data", "tts", "cards.json");

let cachedIndex: CardIndex | null = null;
let cachedAliases: AliasMap | null = null;

function getIndex(): CardIndex {
  if (cachedIndex !== null) return cachedIndex;
  try {
    cachedIndex = JSON.parse(readFileSync(INDEX_FILE, "utf-8")) as CardIndex;
  } catch {
    // Missing index file is fine — feature is just disabled in that case.
    cachedIndex = {};
  }
  return cachedIndex;
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
  return resolveCards(title, getIndex(), getAliases());
}
