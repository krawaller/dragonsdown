import classChipData from "../../data/manual/class-chips.json";
import type { TTSClassTile } from "@/lib/tts";

const MANUAL_CLASS_CHIPS: Record<string, TTSClassTile[]> = classChipData;

export function getManualClassChips(classSlug: string): TTSClassTile[] {
  return MANUAL_CLASS_CHIPS[classSlug] ?? [];
}
