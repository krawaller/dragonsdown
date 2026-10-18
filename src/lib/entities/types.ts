import type { RulebookLink } from "@/lib/rulebook-links";
import type { TTSCardImage } from "@/lib/tts";
import type { MissionEntry, MonsterGroupEntry } from "@/lib/tts/lookup";

export type CategoryChip = {
  href: string;
  label: string;
  value: string;
  imageUrl?: string;
  imageFit?: "contain" | "cover";
};

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

export type MonsterSourceDetail = {
  key: string;
  href: string;
  name: string;
  subtitle: string;
  terrainIconUrl?: string;
  card?: TTSCardImage;
  imageUrl?: string;
  imageClassName: string;
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

export type MonsterGroupDetail = {
  group: MonsterGroupEntry;
  displayGroup: MonsterGroupEntry;
  totalChips: number;
  chipCountLabel: string;
  categories: CategoryChip[];
  rulebookLinks: RulebookLink[];
  sourceCount: number;
  sources: MonsterSourceDetail[];
  relatedMissions: MissionEntry[];
  spells: SpellTileDetail[];
};
