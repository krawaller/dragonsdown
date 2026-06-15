/**
 * TypeScript type definitions for Dragons Down Workshop JSON files
 * Represents a Tabletop Simulator save file structure
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

export interface TabState {
  title: string;
  body: string;
  color: string;
  visibleColor: ColorRGB;
  id: number;
}

export interface TabStates {
  [key: string]: TabState;
}

export interface Grid {
  Type: number;
  Lines: boolean;
  Color: ColorRGB;
  Opacity: number;
  ThickLines: boolean;
  Snapping: boolean;
  Offset: boolean;
  BothSnapping: boolean;
  xSize: number;
  ySize: number;
  PosOffset: Vector3;
}

export interface Lighting {
  LightIntensity: number;
  LightColor: ColorRGB;
  AmbientIntensity: number;
  AmbientType: number;
  AmbientSkyColor: ColorRGB;
  AmbientEquatorColor: ColorRGB;
  AmbientGroundColor: ColorRGB;
  ReflectionIntensity: number;
  LutIndex: number;
  LutContribution: number;
  LutURL: string;
}

export interface Hands {
  Enable: boolean;
  DisableUnused: boolean;
  Hiding: number;
}

export interface ComponentTagLabel {
  displayed: string;
  normalized: string;
}

export interface ComponentTags {
  labels: ComponentTagLabel[];
}

export interface Turns {
  Enable: boolean;
  Type: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- The TurnOrder structure is complex and not currently used in a typed way, so we'll allow it to be any for now.
  TurnOrder: any[];
  Reverse: boolean;
  SkipEmpty: boolean;
  DisableInteractions: boolean;
  PassTurns: boolean;
  TurnColor: string;
}

export interface CameraState {
  Position: Vector3;
  Rotation: Vector3;
  Distance: number;
  Zoomed: boolean;
  AbsolutePosition: Vector3;
}

export interface DecalPalletItem {
  Name: string;
  ImageURL: string;
  Size: number;
}

export interface VectorLine {
  points3: Vector3[];
  color: ColorRGB;
  thickness: number;
}

export interface SnapPoint {
  Position: Vector3;
  Rotation?: Vector3;
}

export interface Transform {
  posX: number;
  posY: number;
  posZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

export interface ColorRGBA {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface CustomAssetbundle {
  AssetbundleURL: string;
  AssetbundleSecondaryURL: string;
  MaterialIndex: number;
  TypeIndex: number;
  LoopingEffectIndex: number;
}

export interface CustomMesh {
  MeshURL: string;
  DiffuseURL: string;
  NormalURL: string;
  ColliderURL: string;
  Convex: boolean;
  MaterialIndex: number;
  TypeIndex: number;
  CustomShader?: {
    SpecularColor: ColorRGB;
    SpecularIntensity: number;
    SpecularSharpness: number;
    FresnelStrength: number;
  };
}

export interface CustomImage {
  ImageURL: string;
  ImageSecondaryURL: string;
  ImageScalar: number;
  WidthScale: number;
  CustomTile?: {
    Type: number;
    Thickness: number;
    Stackable: boolean;
    Stretch: boolean;
  };
}

export interface PhysicsMaterial {
  StaticFriction: number;
  DynamicFriction: number;
  Bounciness: number;
  FrictionCombine: number;
  BounceCombine: number;
}

export interface Rigidbody {
  Mass: number;
  Drag: number;
  AngularDrag: number;
  UseGravity: boolean;
}

export interface BagProperties {
  Order: number;
}

export interface CustomDeckInfo {
  FaceURL: string;
  BackURL: string;
  NumWidth: number;
  NumHeight: number;
  BackIsHidden: boolean;
  UniqueBack: boolean;
  Type: number;
}

export interface CustomDeck {
  [key: string]: CustomDeckInfo;
}

export interface AttachedSnapPoint {
  Position: Vector3;
  Rotation?: Vector3;
}

export interface ObjectState {
  GUID: string;
  Name: string;
  Transform: Transform;
  Nickname: string;
  Description: string;
  GMNotes: string;
  AltLookAngle: Vector3;
  ColorDiffuse: ColorRGBA;
  LayoutGroupSortIndex: number;
  Value: number;
  Locked: boolean;
  Grid: boolean;
  Snap: boolean;
  IgnoreFoW: boolean;
  MeasureMovement: boolean;
  DragSelectable: boolean;
  Autoraise: boolean;
  Sticky: boolean;
  Tooltip: boolean;
  GridProjection: boolean;
  HideWhenFaceDown: boolean;
  Hands: boolean;
  FogColor?: string;
  MaterialIndex?: number;
  MeshIndex?: number;
  LuaScript: string;
  LuaScriptState: string;
  XmlUI: string;

  // Optional properties specific to certain object types
  CustomAssetbundle?: CustomAssetbundle;
  CustomMesh?: CustomMesh;
  CustomImage?: CustomImage;
  PhysicsMaterial?: PhysicsMaterial;
  Rigidbody?: Rigidbody;
  Bag?: BagProperties;
  States?: { [key: string]: ObjectState };
  ContainedObjects?: ObjectState[];
  ChildObjects?: ObjectState[];

  // Card and Deck specific properties
  SidewaysCard?: boolean;
  CardID?: number;
  DeckIDs?: number[];
  CustomDeck?: CustomDeck;

  // Snap point properties
  AttachedSnapPoints?: AttachedSnapPoint[];

  // Additional object-specific properties
  memo?: string;
}

/**
 * Main interface for Dragons Down Workshop JSON structure
 * This represents a complete Tabletop Simulator save file
 */
export interface DragonsDownWorkshop {
  SaveName: string;
  EpochTime: number;
  Date: string;
  VersionNumber: string;
  GameMode: string;
  GameType: string;
  GameComplexity: string;
  PlayingTime: [number, number];
  PlayerCounts: [number, number];
  Tags: string[];
  Gravity: number;
  PlayArea: number;
  Table: string;
  Sky: string;
  SkyURL: string;
  Note: string;
  TabStates: TabStates;
  Grid: Grid;
  Lighting: Lighting;
  Hands: Hands;
  ComponentTags: ComponentTags;
  Turns: Turns;
  CameraStates: CameraState[];
  DecalPallet: DecalPalletItem[];
  LuaScript: string;
  LuaScriptState: string;
  XmlUI: string;
  VectorLines: VectorLine[];
  SnapPoints: SnapPoint[];
  ObjectStates: ObjectState[];
}

export default DragonsDownWorkshop;
