import type {
  ResolvedSpecSourceLevel,
  VerticalSolutionCode,
} from '@/lib/discovery/technical-spec-types';

export const RECIPE_CODE_CATALOG = [
  'RECIPE_ROOM_STD_COLIVING_BASIC_M2',
  'RECIPE_ROOM_STD_COLIVING_PLUS_M2',
  'RECIPE_BATH_STD_COMPACT_M2',
  'RECIPE_BATH_STD_MEDIUM_M2',
  'RECIPE_BATH_ADAPTED_M2',
  'RECIPE_KITCHENETTE_120_BASIC_ML',
  'RECIPE_KITCHENETTE_180_COMPLETE_ML',
  'RECIPE_LEVELING_LIGHT_M2',
  'RECIPE_LEVELING_MEDIUM_M2',
  'RECIPE_COMMON_AREA_BASIC_M2',
  'RECIPE_COMMON_AREA_INTENSIVE_M2',
] as const;

export type RecipeCode = (typeof RECIPE_CODE_CATALOG)[number];

export const MATERIAL_CODE_CATALOG = [
  'MAT_ROOM_FLOOR_BASIC',
  'MAT_ROOM_SKIRTING_BASIC',
  'MAT_ROOM_PAINT_BASIC',
  'MAT_ROOM_ELEC_PACK_BASIC',
  'MAT_ROOM_FLOOR_PLUS',
  'MAT_ROOM_SKIRTING_PLUS',
  'MAT_ROOM_PAINT_PLUS',
  'MAT_ROOM_ELEC_PACK_PLUS',
  'MAT_BATH_TILE_COMPACT',
  'MAT_BATH_FLOOR_COMPACT',
  'MAT_BATH_SANITARY_COMPACT',
  'MAT_BATH_PLUMBING_COMPACT',
  'MAT_BATH_DRAINAGE_COMPACT',
  'MAT_BATH_ELEC_COMPACT',
  'MAT_BATH_TILE_MEDIUM',
  'MAT_BATH_FLOOR_MEDIUM',
  'MAT_BATH_SANITARY_MEDIUM',
  'MAT_BATH_PLUMBING_MEDIUM',
  'MAT_BATH_DRAINAGE_MEDIUM',
  'MAT_BATH_ELEC_MEDIUM',
  'MAT_BATH_TILE_ADAPTED',
  'MAT_BATH_FLOOR_ADAPTED',
  'MAT_BATH_SANITARY_ADAPTED',
  'MAT_BATH_SUPPORTS_ADAPTED',
  'MAT_BATH_PLUMBING_ADAPTED',
  'MAT_BATH_DRAINAGE_ADAPTED',
  'MAT_BATH_ELEC_ADAPTED',
  'MAT_KITCH_BASE_CABINET',
  'MAT_KITCH_BASE_COUNTERTOP',
  'MAT_KITCH_BASE_SINK',
  'MAT_KITCH_BASE_CONNECTIONS',
  'MAT_KITCH_COMPLETE_CABINET',
  'MAT_KITCH_COMPLETE_COUNTERTOP',
  'MAT_KITCH_COMPLETE_SINK',
  'MAT_KITCH_COMPLETE_APPLIANCE_PACK',
  'MAT_KITCH_COMPLETE_CONNECTIONS',
  'MAT_LEVELING_LIGHT_MORTAR',
  'MAT_LEVELING_MEDIUM_MORTAR',
  'MAT_COMMON_FLOOR_BASIC',
  'MAT_COMMON_PAINT_BASIC',
  'MAT_COMMON_LIGHTING_BASIC',
  'MAT_COMMON_FLOOR_INTENSIVE',
  'MAT_COMMON_PAINT_INTENSIVE',
  'MAT_COMMON_LIGHTING_INTENSIVE',
  'MAT_COMMON_PROTECTION_INTENSIVE',
] as const;

export type RecipeMaterialCode = (typeof MATERIAL_CODE_CATALOG)[number];

export const LABOR_CODE_CATALOG = [
  'LAB_ROOM_BASIC',
  'LAB_ROOM_PLUS',
  'LAB_BATH_COMPACT',
  'LAB_BATH_MEDIUM',
  'LAB_BATH_ADAPTED',
  'LAB_KITCH_BASIC',
  'LAB_KITCH_COMPLETE',
  'LAB_LEVELING_LIGHT',
  'LAB_LEVELING_MEDIUM',
  'LAB_COMMON_BASIC',
  'LAB_COMMON_INTENSIVE',
] as const;

export type RecipeLaborCode = (typeof LABOR_CODE_CATALOG)[number];

export type RecipeStatus =
  | 'RECIPE_RESOLVED'
  | 'RECIPE_PARTIAL'
  | 'RECIPE_MISSING';

export type RecipeMaterial = {
  materialCode: RecipeMaterialCode;
  description: string;
  quantity: number;
  unit: string;
  pricingStatus: 'PENDING';
};

export type RecipeLabor = {
  laborCode: RecipeLaborCode;
  description: string;
  quantity: number;
  unit: 'h' | 'jor';
};

export type RecipeLine = {
  id: string;
  spaceId: string;
  solutionCode: VerticalSolutionCode;
  measurementLineId: string;
  recipeCode: RecipeCode;
  description: string;
  status: RecipeStatus;
  materials: RecipeMaterial[];
  labor: RecipeLabor[];
  wasteFactor?: number | null;
  indirectFactor?: number | null;
  sourceLevel: ResolvedSpecSourceLevel;
  sourceRefId?: string;
  assumedFields: string[];
};

export type RecipeResult = {
  status: 'READY' | 'PARTIAL' | 'BLOCKED';
  lines: RecipeLine[];
  coverage: {
    resolvedRecipeLines: number;
    partialRecipeLines: number;
    missingRecipeLines: number;
    recipeCoveragePercent: number;
  };
  warnings: string[];
  assumptions: string[];
};
