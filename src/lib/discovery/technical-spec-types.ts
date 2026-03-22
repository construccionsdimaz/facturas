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

export type VerticalSolutionCode =
  | RoomSolutionCode
  | BathSolutionCode
  | KitchenetteSolutionCode
  | LevelingSolutionCode
  | CommonAreaSolutionCode;

export type TechnicalSpecStatus = 'INCOMPLETE' | 'READY_FOR_MEASUREMENT';
export type TechnicalSpecStrategy = 'PARAMETRIC' | 'SPECIFIED';

export type TechnicalSpecCoverage = {
  rooms: boolean;
  bathrooms: boolean;
  kitchenettes: boolean;
  leveling: boolean;
  commonAreas: boolean;
};

export type TechnicalSpecSelection = {
  roomSolution?: RoomSolutionCode;
  bathSolution?: BathSolutionCode;
  kitchenetteSolution?: KitchenetteSolutionCode;
  levelingSolution?: LevelingSolutionCode;
  commonAreaSolution?: CommonAreaSolutionCode;
};

export type TechnicalSpecPatch = {
  selections: TechnicalSpecSelection;
  dimensions?: {
    roomAreaM2?: number | null;
    bathAreaM2?: number | null;
    kitchenetteLinearMeters?: number | null;
    levelingAreaM2?: number | null;
    commonAreaM2?: number | null;
  };
  counts?: {
    bathroomsCount?: number | null;
    kitchenettesCount?: number | null;
  };
  options?: {
    hasBathroom?: boolean;
    hasKitchenette?: boolean;
    isAccessibleBath?: boolean;
    includeCommonCorridors?: boolean;
    includePortal?: boolean;
    includeStaircase?: boolean;
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
};
