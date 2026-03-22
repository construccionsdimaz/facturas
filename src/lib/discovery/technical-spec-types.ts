export type RoomSolutionCode =
  | 'ROOM_STD_COLIVING_BASIC'
  | 'ROOM_STD_COLIVING_PLUS';

export type BathSolutionCode =
  | 'BATH_STD_COMPACT'
  | 'BATH_STD_MEDIUM'
  | 'BATH_ADAPTED';

export type KitchenetteSolutionCode =
  | 'KITCHENETTE_120_BASIC'
  | 'KITCHENETTE_180_COMPLETE';

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
  | 'PARTITION_BLOCK_STD';

export type CeilingSolutionCode =
  | 'CEILING_CONTINUOUS_STD'
  | 'CEILING_CONTINUOUS_INSULATED'
  | 'CEILING_SUSPENDED_GRID';

export type FlooringSolutionCode =
  | 'FLOOR_TILE_STD'
  | 'FLOOR_LAMINATE_STD'
  | 'FLOOR_VINYL_STD'
  | 'SKIRTING_STD';

export type CarpentrySolutionCode =
  | 'DOOR_INTERIOR_STD'
  | 'DOOR_INTERIOR_PLUS'
  | 'WINDOW_STD'
  | 'WINDOW_IMPROVED'
  | 'SHUTTER_STD';

export type BasicMEPSolutionCode =
  | 'ELECTRICAL_ROOM_STD'
  | 'LIGHTING_BASIC'
  | 'PLUMBING_POINT_STD'
  | 'DRAINAGE_POINT_STD';

export type VerticalSolutionCode =
  | RoomSolutionCode
  | BathSolutionCode
  | KitchenetteSolutionCode
  | LevelingSolutionCode
  | CommonAreaSolutionCode
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
  partitions: boolean;
  ceilings: boolean;
  flooring: boolean;
  carpentry: boolean;
  mep: boolean;
};

export type TechnicalSpecSelection = {
  roomSolution?: RoomSolutionCode;
  bathSolution?: BathSolutionCode;
  kitchenetteSolution?: KitchenetteSolutionCode;
  levelingSolution?: LevelingSolutionCode;
  commonAreaSolution?: CommonAreaSolutionCode;
  partitionSolution?: PartitionSolutionCode;
  ceilingSolution?: CeilingSolutionCode;
  flooringSolution?: FlooringSolutionCode;
  skirtingSolution?: Extract<FlooringSolutionCode, 'SKIRTING_STD'>;
  doorSolution?: Extract<CarpentrySolutionCode, 'DOOR_INTERIOR_STD' | 'DOOR_INTERIOR_PLUS'>;
  windowSolution?: Extract<CarpentrySolutionCode, 'WINDOW_STD' | 'WINDOW_IMPROVED'>;
  shutterSolution?: Extract<CarpentrySolutionCode, 'SHUTTER_STD'>;
  electricalSolution?: Extract<BasicMEPSolutionCode, 'ELECTRICAL_ROOM_STD'>;
  lightingSolution?: Extract<BasicMEPSolutionCode, 'LIGHTING_BASIC'>;
  plumbingSolution?: Extract<BasicMEPSolutionCode, 'PLUMBING_POINT_STD'>;
  drainageSolution?: Extract<BasicMEPSolutionCode, 'DRAINAGE_POINT_STD'>;
};

export type TechnicalSpecPatch = {
  selections: TechnicalSpecSelection;
  dimensions?: {
    roomAreaM2?: number | null;
    bathAreaM2?: number | null;
    kitchenetteLinearMeters?: number | null;
    levelingAreaM2?: number | null;
    commonAreaM2?: number | null;
    partitionWallAreaM2?: number | null;
    partitionHeightM?: number | null;
    ceilingAreaM2?: number | null;
    flooringAreaM2?: number | null;
    skirtingLengthMl?: number | null;
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

export const KITCHENETTE_SOLUTION_CODES: KitchenetteSolutionCode[] = [
  'KITCHENETTE_120_BASIC',
  'KITCHENETTE_180_COMPLETE',
];

export const LEVELING_SOLUTION_CODES: LevelingSolutionCode[] = [
  'LEVELING_LIGHT',
  'LEVELING_MEDIUM',
];

export const COMMON_AREA_SOLUTION_CODES: CommonAreaSolutionCode[] = [
  'COMMON_AREA_BASIC',
  'COMMON_AREA_INTENSIVE',
];

export const PARTITION_SOLUTION_CODES: PartitionSolutionCode[] = [
  'PARTITION_PLADUR_STD',
  'PARTITION_PLADUR_ACOUSTIC',
  'PARTITION_BRICK_STD',
  'PARTITION_BLOCK_STD',
];

export const CEILING_SOLUTION_CODES: CeilingSolutionCode[] = [
  'CEILING_CONTINUOUS_STD',
  'CEILING_CONTINUOUS_INSULATED',
  'CEILING_SUSPENDED_GRID',
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
  'WINDOW_STD',
  'WINDOW_IMPROVED',
  'SHUTTER_STD',
];

export const BASIC_MEP_SOLUTION_CODES: BasicMEPSolutionCode[] = [
  'ELECTRICAL_ROOM_STD',
  'LIGHTING_BASIC',
  'PLUMBING_POINT_STD',
  'DRAINAGE_POINT_STD',
];

export const SOLUTION_LABELS: Record<VerticalSolutionCode, string> = {
  ROOM_STD_COLIVING_BASIC: 'Habitacion coliving basica',
  ROOM_STD_COLIVING_PLUS: 'Habitacion coliving plus',
  BATH_STD_COMPACT: 'Bano compacto',
  BATH_STD_MEDIUM: 'Bano medio',
  BATH_ADAPTED: 'Bano adaptado',
  KITCHENETTE_120_BASIC: 'Kitchenette 120 basica',
  KITCHENETTE_180_COMPLETE: 'Kitchenette 180 completa',
  LEVELING_LIGHT: 'Nivelacion ligera',
  LEVELING_MEDIUM: 'Nivelacion media',
  COMMON_AREA_BASIC: 'Zona comun basica',
  COMMON_AREA_INTENSIVE: 'Zona comun intensiva',
  PARTITION_PLADUR_STD: 'Tabiqueria pladur estandar',
  PARTITION_PLADUR_ACOUSTIC: 'Tabiqueria pladur acustica',
  PARTITION_BRICK_STD: 'Tabiqueria ladrillo hueco',
  PARTITION_BLOCK_STD: 'Tabiqueria bloque simple',
  CEILING_CONTINUOUS_STD: 'Falso techo continuo estandar',
  CEILING_CONTINUOUS_INSULATED: 'Falso techo continuo con aislamiento',
  CEILING_SUSPENDED_GRID: 'Falso techo registrable',
  FLOOR_TILE_STD: 'Pavimento porcelanico estandar',
  FLOOR_LAMINATE_STD: 'Pavimento laminado estandar',
  FLOOR_VINYL_STD: 'Pavimento vinilico estandar',
  SKIRTING_STD: 'Rodapie estandar',
  DOOR_INTERIOR_STD: 'Puerta interior estandar',
  DOOR_INTERIOR_PLUS: 'Puerta interior mejorada',
  WINDOW_STD: 'Ventana estandar',
  WINDOW_IMPROVED: 'Ventana mejorada',
  SHUTTER_STD: 'Persiana estandar',
  ELECTRICAL_ROOM_STD: 'Instalacion electrica basica por punto',
  LIGHTING_BASIC: 'Iluminacion basica por punto',
  PLUMBING_POINT_STD: 'Fontaneria basica por punto',
  DRAINAGE_POINT_STD: 'Saneamiento basico por punto',
};
