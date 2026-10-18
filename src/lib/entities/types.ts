import type { RulebookLink } from "@/lib/rulebook-links";
import type { TTSCardImage } from "@/lib/tts";
import type { MissionEntry, MonsterGroupEntry } from "@/lib/tts/lookup";

export type ImageTileSource = {
  imageUrl?: string;
  terrainIconUrl?: string;
  subtitle?: string;
};

export type NativeSummonDetail = {
  name: string;
  href: string;
  imageUrl?: string;
  terrainIconUrl?: string;
  subtitle?: string;
};

export type SpellTileDetail = {
  spellName: string;
  spellSlug: string;
  card?: TTSCardImage;
  subtitle: string;
};

export type NativeDetail = {
  group: MonsterGroupEntry;
  totalChips: number;
  chipCountLabel: string;
  rulebookLinks: RulebookLink[];
  summons: NativeSummonDetail[];
  relatedMissions: MissionEntry[];
  spells: SpellTileDetail[];
};
