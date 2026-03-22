export type RoomSolutionCode =
  | 'ROOM_STD_COLIVING_BASIC'
  | 'ROOM_STD_COLIVING_PLUS';

export type BathSolutionCode =
  | 'BATH_STD_COMPACT'
  | 'BATH_STD_MEDIUM'
  | 'BATH_ADAPTED';

export type BathEquipmentSolutionCode =
  | 'BATH_SHOWER_TRAY_STD'
  | 'BATH_BATHTUB_STD'
  | 'BATH_SCREEN_STD'
  | 'BATH_VANITY_STD'
  | 'BATH_TAPWARE_STD'
  | 'BATH_TAPWARE_PLUS';

export type KitchenetteSolutionCode =
  | 'KITCHENETTE_120_BASIC'
  | 'KITCHENETTE_180_COMPLETE';

export type KitchenetteComponentSolutionCode =
  | 'KITCHENETTE_CABINET_LOW_STD'
  | 'KITCHENETTE_CABINET_HIGH_STD'
  | 'KITCHENETTE_COUNTERTOP_STD'
  | 'KITCHENETTE_COUNTERTOP_PLUS'
  | 'KITCHENETTE_APPLIANCE_PACK_BASIC'
  | 'KITCHENETTE_SINK_STD'
  | 'KITCHENETTE_TAPWARE_STD';

export type LevelingSolutionCode =
  | 'LEVELING_LIGHT'
  | 'LEVELING_MEDIUM';

export type CommonAreaSolutionCode =
  | 'COMMON_AREA_BASIC'
  | 'COMMON_AREA_INTENSIVE';

export type PartitionSolutionCode =
  | 'PARTITION_PLADUR_STD'
  | 'PARTITION_PLADUR_ACOUSTIC'
  | 'PARTITION_BRICK_STD'
  | 'PARTITION_BLOCK_STD'
  | 'PARTITION_LINING_STD';

export type CeilingSolutionCode =
  | 'CEILING_CONTINUOUS_STD'
  | 'CEILING_CONTINUOUS_INSULATED'
  | 'CEILING_SUSPENDED_GRID'
  | 'CEILING_CONTINUOUS_PLUS';

export type FlooringSolutionCode =
  | 'FLOOR_TILE_STD'
  | 'FLOOR_LAMINATE_STD'
  | 'FLOOR_VINYL_STD'
  | 'SKIRTING_STD';

export type CarpentrySolutionCode =
  | 'DOOR_INTERIOR_STD'
  | 'DOOR_INTERIOR_PLUS'
  | 'DOOR_SLIDING_STD'
  | 'DOOR_RF_BASIC'
  | 'WINDOW_STD'
  | 'WINDOW_IMPROVED'
  | 'WINDOW_THERMAL_PLUS'
  | 'SHUTTER_STD';

export type BasicMEPSolutionCode =
  | 'ELECTRICAL_ROOM_STD'
  | 'ELECTRICAL_MECHANISMS_STD'
  | 'ELECTRICAL_PANEL_BASIC'
  | 'LIGHTING_BASIC'
  | 'PLUMBING_POINT_STD'
  | 'PLUMBING_WET_ROOM_STD'
  | 'PLUMBING_WET_ROOM_PLUS'
  | 'DRAINAGE_POINT_STD'
  | 'DRAINAGE_WET_ROOM_STD'
  | 'DRAINAGE_WET_ROOM_PLUS';

export type WallFinishSolutionCode =
  | 'WALL_TILE_BATH_STD'
  | 'WALL_TILE_BATH_PLUS'
  | 'WALL_TILE_KITCHEN_SPLASHBACK'
  | 'WALL_TILE_WET_PARTIAL'
  | 'WALL_TILE_WET_FULL'
  | 'PAINT_WALL_STD'
  | 'PAINT_WALL_PLUS'
  | 'PAINT_CEILING_STD'
  | 'WET_AREA_WATERPROOFING_STD'
  | 'WET_AREA_WATERPROOFING_PLUS';

export type VerticalSolutionCode =
  | RoomSolutionCode
  | BathSolutionCode
  | BathEquipmentSolutionCode
  | KitchenetteSolutionCode
  | KitchenetteComponentSolutionCode
  | LevelingSolutionCode
  | CommonAreaSolutionCode
  | WallFinishSolutionCode
  | PartitionSolutionCode
  | CeilingSolutionCode
  | FlooringSolutionCode
  | CarpentrySolutionCode
  | BasicMEPSolutionCode;

export type TechnicalSpecStatus = 'INCOMPLETE' | 'READY_FOR_MEASUREMENT';
export type TechnicalSpecStrategy = 'PARAMETRIC' | 'SPECIFIED';

export type TechnicalSpecCoverage = {
  rooms: boolean;
  bathrooms: boolean;
  kitchenettes: boolean;
  leveling: boolean;
  commonAreas: boolean;
  wallFinishes: boolean;
  partitions: boolean;
  ceilings: boolean;
  flooring: boolean;
  carpentry: boolean;
  mep: boolean;
};

export type TechnicalSpecSelection = {
  roomSolution?: RoomSolutionCode;
  bathSolution?: BathSolutionCode;
  bathShowerBaseSolution?: Extract<
    BathEquipmentSolutionCode,
    'BATH_SHOWER_TRAY_STD' | 'BATH_BATHTUB_STD'
  >;
  bathScreenSolution?: Extract<BathEquipmentSolutionCode, 'BATH_SCREEN_STD'>;
  bathVanitySolution?: Extract<BathEquipmentSolutionCode, 'BATH_VANITY_STD'>;
  bathTapwareSolution?: Extract<
    BathEquipmentSolutionCode,
    'BATH_TAPWARE_STD' | 'BATH_TAPWARE_PLUS'
  >;
  kitchenetteSolution?: KitchenetteSolutionCode;
  kitchenetteLowCabinetSolution?: Extract<
    KitchenetteComponentSolutionCode,
    'KITCHENETTE_CABINET_LOW_STD'
  >;
  kitchenetteHighCabinetSolution?: Extract<
    KitchenetteComponentSolutionCode,
    'KITCHENETTE_CABINET_HIGH_STD'
  >;
  kitchenetteCountertopSolution?: Extract<
    KitchenetteComponentSolutionCode,
    'KITCHENETTE_COUNTERTOP_STD' | 'KITCHENETTE_COUNTERTOP_PLUS'
  >;
  kitchenetteApplianceSolution?: Extract<
    KitchenetteComponentSolutionCode,
    'KITCHENETTE_APPLIANCE_PACK_BASIC'
  >;
  kitchenetteSinkSolution?: Extract<
    KitchenetteComponentSolutionCode,
    'KITCHENETTE_SINK_STD'
  >;
  kitchenetteTapwareSolution?: Extract<
    KitchenetteComponentSolutionCode,
    'KITCHENETTE_TAPWARE_STD'
  >;
  levelingSolution?: LevelingSolutionCode;
  commonAreaSolution?: CommonAreaSolutionCode;
  wallTileSolution?: Extract<
    WallFinishSolutionCode,
    | 'WALL_TILE_BATH_STD'
    | 'WALL_TILE_BATH_PLUS'
    | 'WALL_TILE_KITCHEN_SPLASHBACK'
    | 'WALL_TILE_WET_PARTIAL'
    | 'WALL_TILE_WET_FULL'
  >;
  wallPaintSolution?: Extract<WallFinishSolutionCode, 'PAINT_WALL_STD' | 'PAINT_WALL_PLUS'>;
  ceilingPaintSolution?: Extract<WallFinishSolutionCode, 'PAINT_CEILING_STD'>;
  waterproofingSolution?: Extract<
    WallFinishSolutionCode,
    'WET_AREA_WATERPROOFING_STD' | 'WET_AREA_WATERPROOFING_PLUS'
  >;
  partitionSolution?: PartitionSolutionCode;
  liningSolution?: Extract<PartitionSolutionCode, 'PARTITION_LINING_STD'>;
  ceilingSolution?: CeilingSolutionCode;
  flooringSolution?: FlooringSolutionCode;
  skirtingSolution?: Extract<FlooringSolutionCode, 'SKIRTING_STD'>;
  doorSolution?: Extract<CarpentrySolutionCode, 'DOOR_INTERIOR_STD' | 'DOOR_INTERIOR_PLUS'>;
  windowSolution?: Extract<CarpentrySolutionCode, 'WINDOW_STD' | 'WINDOW_IMPROVED'>;
  shutterSolution?: Extract<CarpentrySolutionCode, 'SHUTTER_STD'>;
  electricalSolution?: Extract<BasicMEPSolutionCode, 'ELECTRICAL_ROOM_STD'>;
  electricalMechanismsSolution?: Extract<BasicMEPSolutionCode, 'ELECTRICAL_MECHANISMS_STD'>;
  electricalPanelSolution?: Extract<BasicMEPSolutionCode, 'ELECTRICAL_PANEL_BASIC'>;
  lightingSolution?: Extract<BasicMEPSolutionCode, 'LIGHTING_BASIC'>;
  plumbingSolution?: Extract<BasicMEPSolutionCode, 'PLUMBING_POINT_STD'>;
  plumbingWetSolution?: Extract<
    BasicMEPSolutionCode,
    'PLUMBING_WET_ROOM_STD' | 'PLUMBING_WET_ROOM_PLUS'
  >;
  drainageSolution?: Extract<BasicMEPSolutionCode, 'DRAINAGE_POINT_STD'>;
  drainageWetSolution?: Extract<
    BasicMEPSolutionCode,
    'DRAINAGE_WET_ROOM_STD' | 'DRAINAGE_WET_ROOM_PLUS'
  >;
};

export type TechnicalSpecPatch = {
  selections: TechnicalSpecSelection;
  dimensions?: {
    roomAreaM2?: number | null;
    bathAreaM2?: number | null;
    kitchenetteLinearMeters?: number | null;
    levelingAreaM2?: number | null;
    commonAreaM2?: number | null;
    wallTileAreaM2?: number | null;
    wetWallTileAreaM2?: number | null;
    paintWallAreaM2?: number | null;
    paintCeilingAreaM2?: number | null;
    waterproofingAreaM2?: number | null;
    wetWaterproofingAreaM2?: number | null;
    backsplashAreaM2?: number | null;
    liningWallAreaM2?: number | null;
    partitionWallAreaM2?: number | null;
    partitionHeightM?: number | null;
    ceilingAreaM2?: number | null;
    flooringAreaM2?: number | null;
    skirtingLengthMl?: number | null;
    countertopLengthMl?: number | null;
  };
  counts?: {
    bathroomsCount?: number | null;
    kitchenettesCount?: number | null;
    doorCount?: number | null;
    windowCount?: number | null;
    shutterCount?: number | null;
    electricalPointsCount?: number | null;
    lightingPointsCount?: number | null;
    plumbingPointsCount?: number | null;
    drainagePointsCount?: number | null;
    electricalMechanismsCount?: number | null;
    electricalPanelCount?: number | null;
    plumbingWetPointsCount?: number | null;
    drainageWetPointsCount?: number | null;
    bathShowerBaseCount?: number | null;
    bathScreenCount?: number | null;
    bathVanityCount?: number | null;
    bathTapwareCount?: number | null;
    kitchenetteAppliancePackCount?: number | null;
    kitchenetteSinkCount?: number | null;
    kitchenetteTapwareCount?: number | null;
  };
  options?: {
    hasBathroom?: boolean;
    hasKitchenette?: boolean;
    isAccessibleBath?: boolean;
    includeCommonCorridors?: boolean;
    includePortal?: boolean;
    includeStaircase?: boolean;
    partitionInsulated?: boolean;
    partitionBoardsPerFace?: number | null;
    partitionThicknessMm?: number | null;
    acousticRequirementBasic?: boolean;
    includeWallTile?: boolean;
    includeWallPaint?: boolean;
    includeCeilingPaint?: boolean;
    includeWaterproofing?: boolean;
    includeSkirting?: boolean;
    includeShutter?: boolean;
  };
};

export type ResolvedSpecSourceLevel =
  | 'PROJECT'
  | 'FLOOR'
  | 'GROUP'
  | 'INSTANCE'
  | 'SUBSPACE';

export type TechnicalSpecModel = {
  version: 1;
  status: TechnicalSpecStatus;
  strategy: TechnicalSpecStrategy;
  coverage: TechnicalSpecCoverage; // solo ayuda UI/checklist, no fuente de verdad
  projectSpecs: TechnicalSpecPatch;
  floorSpecs: Record<string, TechnicalSpecPatch>;
  groupSpecs: Record<string, TechnicalSpecPatch>;
  instanceSpecs: Record<string, TechnicalSpecPatch>;
  subspaceSpecs: Record<string, TechnicalSpecPatch>;
};

export type ResolvedSpec = {
  selections: TechnicalSpecSelection;
  dimensions: NonNullable<TechnicalSpecPatch['dimensions']>;
  counts: NonNullable<TechnicalSpecPatch['counts']>;
  options: NonNullable<TechnicalSpecPatch['options']>;
  sourceLevel: ResolvedSpecSourceLevel;
  sourceRefId?: string;
  assumedFields: string[];
  trace: Array<{
    level: ResolvedSpecSourceLevel;
    refId?: string;
  }>;
};

export type ResolvedTechnicalSpecSummary = {
  bySpaceId: Record<string, ResolvedSpec>;
  completeness: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    specifiedScopePercent: number;
    missingScopes: string[];
  };
};

export const ROOM_SOLUTION_CODES: RoomSolutionCode[] = [
  'ROOM_STD_COLIVING_BASIC',
  'ROOM_STD_COLIVING_PLUS',
];

export const BATH_SOLUTION_CODES: BathSolutionCode[] = [
  'BATH_STD_COMPACT',
  'BATH_STD_MEDIUM',
  'BATH_ADAPTED',
];

export const BATH_EQUIPMENT_SOLUTION_CODES: BathEquipmentSolutionCode[] = [
  'BATH_SHOWER_TRAY_STD',
  'BATH_BATHTUB_STD',
  'BATH_SCREEN_STD',
  'BATH_VANITY_STD',
  'BATH_TAPWARE_STD',
  'BATH_TAPWARE_PLUS',
];

export const KITCHENETTE_SOLUTION_CODES: KitchenetteSolutionCode[] = [
  'KITCHENETTE_120_BASIC',
  'KITCHENETTE_180_COMPLETE',
];

export const KITCHENETTE_COMPONENT_SOLUTION_CODES: KitchenetteComponentSolutionCode[] = [
  'KITCHENETTE_CABINET_LOW_STD',
  'KITCHENETTE_CABINET_HIGH_STD',
  'KITCHENETTE_COUNTERTOP_STD',
  'KITCHENETTE_COUNTERTOP_PLUS',
  'KITCHENETTE_APPLIANCE_PACK_BASIC',
  'KITCHENETTE_SINK_STD',
  'KITCHENETTE_TAPWARE_STD',
];

export const LEVELING_SOLUTION_CODES: LevelingSolutionCode[] = [
  'LEVELING_LIGHT',
  'LEVELING_MEDIUM',
];

export const COMMON_AREA_SOLUTION_CODES: CommonAreaSolutionCode[] = [
  'COMMON_AREA_BASIC',
  'COMMON_AREA_INTENSIVE',
];

export const WALL_FINISH_SOLUTION_CODES: WallFinishSolutionCode[] = [
  'WALL_TILE_BATH_STD',
  'WALL_TILE_BATH_PLUS',
  'WALL_TILE_KITCHEN_SPLASHBACK',
  'WALL_TILE_WET_PARTIAL',
  'WALL_TILE_WET_FULL',
  'PAINT_WALL_STD',
  'PAINT_WALL_PLUS',
  'PAINT_CEILING_STD',
  'WET_AREA_WATERPROOFING_STD',
  'WET_AREA_WATERPROOFING_PLUS',
];

export const PARTITION_SOLUTION_CODES: PartitionSolutionCode[] = [
  'PARTITION_PLADUR_STD',
  'PARTITION_PLADUR_ACOUSTIC',
  'PARTITION_BRICK_STD',
  'PARTITION_BLOCK_STD',
  'PARTITION_LINING_STD',
];

export const CEILING_SOLUTION_CODES: CeilingSolutionCode[] = [
  'CEILING_CONTINUOUS_STD',
  'CEILING_CONTINUOUS_INSULATED',
  'CEILING_SUSPENDED_GRID',
  'CEILING_CONTINUOUS_PLUS',
];

export const FLOORING_SOLUTION_CODES: FlooringSolutionCode[] = [
  'FLOOR_TILE_STD',
  'FLOOR_LAMINATE_STD',
  'FLOOR_VINYL_STD',
  'SKIRTING_STD',
];

export const CARPENTRY_SOLUTION_CODES: CarpentrySolutionCode[] = [
  'DOOR_INTERIOR_STD',
  'DOOR_INTERIOR_PLUS',
  'DOOR_SLIDING_STD',
  'DOOR_RF_BASIC',
  'WINDOW_STD',
  'WINDOW_IMPROVED',
  'WINDOW_THERMAL_PLUS',
  'SHUTTER_STD',
];

export const BASIC_MEP_SOLUTION_CODES: BasicMEPSolutionCode[] = [
  'ELECTRICAL_ROOM_STD',
  'ELECTRICAL_MECHANISMS_STD',
  'ELECTRICAL_PANEL_BASIC',
  'LIGHTING_BASIC',
  'PLUMBING_POINT_STD',
  'PLUMBING_WET_ROOM_STD',
  'PLUMBING_WET_ROOM_PLUS',
  'DRAINAGE_POINT_STD',
  'DRAINAGE_WET_ROOM_STD',
  'DRAINAGE_WET_ROOM_PLUS',
];

export const SOLUTION_LABELS: Record<VerticalSolutionCode, string> = {
  ROOM_STD_COLIVING_BASIC: 'Habitacion coliving basica',
  ROOM_STD_COLIVING_PLUS: 'Habitacion coliving plus',
  BATH_STD_COMPACT: 'Bano compacto',
  BATH_STD_MEDIUM: 'Bano medio',
  BATH_ADAPTED: 'Bano adaptado',
  BATH_SHOWER_TRAY_STD: 'Plato de ducha estandar',
  BATH_BATHTUB_STD: 'Banera basica',
  BATH_SCREEN_STD: 'Mampara de ducha estandar',
  BATH_VANITY_STD: 'Mueble lavabo estandar',
  BATH_TAPWARE_STD: 'Griferia bano estandar',
  BATH_TAPWARE_PLUS: 'Griferia bano plus',
  KITCHENETTE_120_BASIC: 'Kitchenette 120 basica',
  KITCHENETTE_180_COMPLETE: 'Kitchenette 180 completa',
  KITCHENETTE_CABINET_LOW_STD: 'Mueble bajo cocina estandar',
  KITCHENETTE_CABINET_HIGH_STD: 'Mueble alto cocina estandar',
  KITCHENETTE_COUNTERTOP_STD: 'Encimera cocina estandar',
  KITCHENETTE_COUNTERTOP_PLUS: 'Encimera cocina mejorada',
  KITCHENETTE_APPLIANCE_PACK_BASIC: 'Pack electrodomesticos cocina basico',
  KITCHENETTE_SINK_STD: 'Fregadero cocina estandar',
  KITCHENETTE_TAPWARE_STD: 'Griferia cocina estandar',
  LEVELING_LIGHT: 'Nivelacion ligera',
  LEVELING_MEDIUM: 'Nivelacion media',
  COMMON_AREA_BASIC: 'Zona comun basica',
  COMMON_AREA_INTENSIVE: 'Zona comun intensiva',
  WALL_TILE_BATH_STD: 'Alicatado bano estandar',
  WALL_TILE_BATH_PLUS: 'Alicatado bano mejorado',
  WALL_TILE_KITCHEN_SPLASHBACK: 'Frontal cocina alicatado',
  WALL_TILE_WET_PARTIAL: 'Alicatado humedo parcial',
  WALL_TILE_WET_FULL: 'Alicatado humedo completo',
  PAINT_WALL_STD: 'Pintura paredes estandar',
  PAINT_WALL_PLUS: 'Pintura paredes mejorada',
  PAINT_CEILING_STD: 'Pintura techos estandar',
  WET_AREA_WATERPROOFING_STD: 'Impermeabilizacion ligera zona humeda',
  WET_AREA_WATERPROOFING_PLUS: 'Impermeabilizacion humeda reforzada',
  PARTITION_PLADUR_STD: 'Tabiqueria pladur estandar',
  PARTITION_PLADUR_ACOUSTIC: 'Tabiqueria pladur acustica',
  PARTITION_BRICK_STD: 'Tabiqueria ladrillo hueco',
  PARTITION_BLOCK_STD: 'Tabiqueria bloque simple',
  PARTITION_LINING_STD: 'Trasdosado basico',
  CEILING_CONTINUOUS_STD: 'Falso techo continuo estandar',
  CEILING_CONTINUOUS_INSULATED: 'Falso techo continuo con aislamiento',
  CEILING_SUSPENDED_GRID: 'Falso techo registrable',
  CEILING_CONTINUOUS_PLUS: 'Falso techo continuo reforzado',
  FLOOR_TILE_STD: 'Pavimento porcelanico estandar',
  FLOOR_LAMINATE_STD: 'Pavimento laminado estandar',
  FLOOR_VINYL_STD: 'Pavimento vinilico estandar',
  SKIRTING_STD: 'Rodapie estandar',
  DOOR_INTERIOR_STD: 'Puerta interior estandar',
  DOOR_INTERIOR_PLUS: 'Puerta interior mejorada',
  DOOR_SLIDING_STD: 'Puerta corredera estandar',
  DOOR_RF_BASIC: 'Puerta RF basica',
  WINDOW_STD: 'Ventana estandar',
  WINDOW_IMPROVED: 'Ventana mejorada',
  WINDOW_THERMAL_PLUS: 'Ventana con mejora termica',
  SHUTTER_STD: 'Persiana estandar',
  ELECTRICAL_ROOM_STD: 'Instalacion electrica basica por punto',
  ELECTRICAL_MECHANISMS_STD: 'Mecanismos electricos estandar',
  ELECTRICAL_PANEL_BASIC: 'Cuadro electrico basico',
  LIGHTING_BASIC: 'Iluminacion basica por punto',
  PLUMBING_POINT_STD: 'Fontaneria basica por punto',
  PLUMBING_WET_ROOM_STD: 'Fontaneria humeda por punto',
  PLUMBING_WET_ROOM_PLUS: 'Fontaneria humeda reforzada',
  DRAINAGE_POINT_STD: 'Saneamiento basico por punto',
  DRAINAGE_WET_ROOM_STD: 'Saneamiento humedo por punto',
  DRAINAGE_WET_ROOM_PLUS: 'Saneamiento humedo reforzado',
};
