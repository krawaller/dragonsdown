import type { RulebookLink } from "@/lib/rulebook-links";
import type { BoardPositionCrop } from "@/lib/board-position-crop";
import type { TTSCardImage } from "@/lib/tts";
import type {
  BoardEntry,
  CivLocationEntry,
  MissionEntry,
  MissionFeatureKind,
  MissionTargetKind,
  MonsterGroupEntry,
  SiteEntry,
} from "@/lib/tts/lookup";

export type CategoryChip = {
  href: string;
  label: string;
  value: string;
  imageUrl?: string;
  imageCrop?: BoardPositionCrop;
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

export type SiteTokenItemDetail = {
  href?: string;
  imageUrl: string;
  name: string;
  label: string;
  images?: { imageURL: string }[];
};

export type SiteDetail = {
  entry: SiteEntry;
  subtitle: string;
  categories: CategoryChip[];
  boards: BoardEntry[];
  tokenItems: SiteTokenItemDetail[];
  guardians: MonsterGroupEntry[];
  tokenAndGuardianCount: number;
  relatedMissions: MissionEntry[];
  rulebookLinks: RulebookLink[];
};

export type MissionInvolvementDetail = {
  key: string;
  kind: MissionTargetKind | MissionFeatureKind;
  href: string;
  name: string;
  native?: MonsterGroupEntry;
  site?: SiteEntry;
  sitePreview?: {
    imageUrl?: string;
    imageCrop?: BoardPositionCrop;
  };
  monsterGroup?: MonsterGroupEntry;
  civLocation?: CivLocationEntry;
};

export type MissionDetail = {
  entry: MissionEntry;
  subtitle?: string;
  categories: CategoryChip[];
  involvements: MissionInvolvementDetail[];
};
