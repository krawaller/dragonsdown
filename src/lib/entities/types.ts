import type { RulebookLink } from "@/lib/rulebook-links";
import type { BoardPositionCrop } from "@/lib/board-position-crop";
import type { MagicIcons } from "@/components/MagicCube";
import type {
  MapTile,
  MapTileCivLocation,
  MapTileMission,
  MapTileMonsterGroup,
  MapTileTerrainPack,
} from "@/components/MapTileViewer";
import type { TTSCardImage } from "@/lib/tts";
import type {
  BoardEntry,
  CivLocationEntry,
  EquipmentDeck,
  MissionEntry,
  MissionFeatureKind,
  MissionTargetKind,
  MonsterGroupEntry,
  MapTileEntry,
  SiteEntry,
  TerrainPackEntry,
  TerrainPackMonsterEntry,
  TerrainPackNativeEntry,
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

export type TerrainPackImageTileDetail = {
  key: string;
  href: string;
  name: string;
  imageUrl?: string;
  subtitle?: string;
  imageClassName: string;
};

export type TerrainPackTreasureTileDetail = {
  key: string;
  href: string;
  name: string;
  card?: TTSCardImage;
  subtitle: string;
};

export type TerrainPackClearingTypeDetail = {
  key: string;
  href: string;
  iconUrl: string;
  label: string;
  percentage: number;
  percentageLabel: string;
  countLabel: string;
};

export type TerrainPackDetail = {
  entry: TerrainPackEntry;
  displayName: string;
  summary: string;
  boards: BoardEntry[];
  civilisationTokens: TerrainPackImageTileDetail[];
  merchants: TerrainPackImageTileDetail[];
  wildernessTokens: TerrainPackImageTileDetail[];
  wildernessTokenCount: number;
  wildernessTokenCountLabel: string;
  terrainTreasures: TerrainPackTreasureTileDetail[];
  missions: MissionEntry[];
  civLocations: TerrainPackImageTileDetail[];
  nativeMonsterBoxTitle: string;
  uniqueNatives: TerrainPackNativeEntry[];
  uniqueMonsters: TerrainPackMonsterEntry[];
  natives: TerrainPackNativeEntry[];
  monsters: TerrainPackMonsterEntry[];
  clearingTypes: TerrainPackClearingTypeDetail[];
  sites: TerrainPackImageTileDetail[];
  mapTiles: TerrainPackImageTileDetail[];
};

export type { EquipmentDeck };

export type MapTileConnectionsDetail = Record<
  string,
  { front: { paths: unknown[] }; back: { paths: unknown[] } }
>;

export type MapTileDetail = {
  entry?: MapTileEntry;
  tile: MapTile;
  subtitle: string;
  categories: CategoryChip[];
  civLocations: MapTileCivLocation[];
  monsterGroups: MapTileMonsterGroup[];
  missions: MapTileMission[];
  mapTileConnections: MapTileConnectionsDetail;
  magicIcons: MagicIcons;
  terrainPack?: MapTileTerrainPack;
};
