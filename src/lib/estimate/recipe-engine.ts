import type { ExecutionContext } from '@/lib/discovery/types';
import type { VerticalSolutionCode } from '@/lib/discovery/technical-spec-types';
import type { ProjectProductivityPolicy } from './project-productivity-policy';
import { resolveLaborProductivity } from './labor-productivity';
import type { MeasurementLine, MeasurementResult } from './measurement-types';
import type {
  RecipeCode,
  RecipeLabor,
  RecipeLaborCode,
  RecipeLine,
  RecipeMaterial,
  RecipeMaterialCode,
  RecipeResult,
  RecipeStatus,
} from './recipe-types';

type RecipeMeasurementCode =
  | 'ROOM_AREA'
  | 'ROOM_UNIT'
  | 'BATH_AREA'
  | 'BATH_UNIT'
  | 'SHOWER_TRAY_UNITS'
  | 'BATHTUB_UNITS'
  | 'SHOWER_SCREEN_UNITS'
  | 'VANITY_UNITS'
  | 'BATH_TAPWARE_UNITS'
  | 'KITCHENETTE_LENGTH'
  | 'KITCHEN_CABINET_LOW_LENGTH'
  | 'KITCHEN_CABINET_HIGH_LENGTH'
  | 'COUNTERTOP_LENGTH'
  | 'KITCHEN_APPLIANCE_UNITS'
  | 'KITCHEN_SINK_UNITS'
  | 'KITCHEN_TAPWARE_UNITS'
  | 'LEVELING_AREA'
  | 'COMMON_AREA'
  | 'PARTITION_WALL_AREA'
  | 'CEILING_AREA'
  | 'FLOORING_AREA'
  | 'SKIRTING_LENGTH'
  | 'DOOR_UNITS'
  | 'WINDOW_UNITS'
  | 'SHUTTER_UNITS'
  | 'ELECTRICAL_POINTS'
  | 'LIGHTING_POINTS'
  | 'PLUMBING_POINTS'
  | 'DRAINAGE_POINTS'
  | 'WALL_TILE_AREA'
  | 'BACKSPLASH_AREA'
  | 'WET_WALL_TILE_AREA'
  | 'PAINT_WALL_AREA'
  | 'PAINT_CEILING_AREA'
  | 'WATERPROOFING_AREA'
  | 'WET_WATERPROOFING_AREA'
  | 'LINING_WALL_AREA'
  | 'ELECTRICAL_MECHANISMS_COUNT'
  | 'ELECTRICAL_PANEL_UNITS'
  | 'PLUMBING_WET_POINTS'
  | 'DRAINAGE_WET_POINTS';

type RecipeTemplate = {
  recipeCode: RecipeCode;
  description: string;
  unit: 'm2' | 'ml' | 'ud' | 'pt';
  wasteFactor?: number | null;
  indirectFactor?: number | null;
  materials: Array<{
    materialCode: RecipeMaterialCode;
    description: string;
    quantityPerUnit: number;
    unit: string;
  }>;
  labor: Array<{
    laborCode: RecipeLaborCode;
    description: string;
    quantityPerUnit: number;
    unit: 'h' | 'jor';
  }>;
};

type MappingKey = `${VerticalSolutionCode}:${RecipeMeasurementCode}`;

const RECIPE_MAPPING_TABLE: Partial<Record<MappingKey, RecipeCode>> = {
  'ROOM_STD_COLIVING_BASIC:ROOM_AREA': 'RECIPE_ROOM_STD_COLIVING_BASIC_M2',
  'ROOM_STD_COLIVING_PLUS:ROOM_AREA': 'RECIPE_ROOM_STD_COLIVING_PLUS_M2',
  'BATH_STD_COMPACT:BATH_AREA': 'RECIPE_BATH_STD_COMPACT_M2',
  'BATH_STD_MEDIUM:BATH_AREA': 'RECIPE_BATH_STD_MEDIUM_M2',
  'BATH_ADAPTED:BATH_AREA': 'RECIPE_BATH_ADAPTED_M2',
  'BATH_SHOWER_TRAY_STD:SHOWER_TRAY_UNITS': 'RECIPE_BATH_SHOWER_TRAY_STD_UD',
  'BATH_BATHTUB_STD:BATHTUB_UNITS': 'RECIPE_BATH_BATHTUB_STD_UD',
  'BATH_SCREEN_STD:SHOWER_SCREEN_UNITS': 'RECIPE_BATH_SCREEN_STD_UD',
  'BATH_VANITY_STD:VANITY_UNITS': 'RECIPE_BATH_VANITY_STD_UD',
  'BATH_TAPWARE_STD:BATH_TAPWARE_UNITS': 'RECIPE_BATH_TAPWARE_STD_UD',
  'BATH_TAPWARE_PLUS:BATH_TAPWARE_UNITS': 'RECIPE_BATH_TAPWARE_PLUS_UD',
  'KITCHENETTE_120_BASIC:KITCHENETTE_LENGTH': 'RECIPE_KITCHENETTE_120_BASIC_ML',
  'KITCHENETTE_180_COMPLETE:KITCHENETTE_LENGTH': 'RECIPE_KITCHENETTE_180_COMPLETE_ML',
  'KITCHENETTE_CABINET_LOW_STD:KITCHEN_CABINET_LOW_LENGTH': 'RECIPE_KITCHENETTE_CABINET_LOW_STD_ML',
  'KITCHENETTE_CABINET_HIGH_STD:KITCHEN_CABINET_HIGH_LENGTH': 'RECIPE_KITCHENETTE_CABINET_HIGH_STD_ML',
  'KITCHENETTE_COUNTERTOP_STD:COUNTERTOP_LENGTH': 'RECIPE_KITCHENETTE_COUNTERTOP_STD_ML',
  'KITCHENETTE_COUNTERTOP_PLUS:COUNTERTOP_LENGTH': 'RECIPE_KITCHENETTE_COUNTERTOP_PLUS_ML',
  'KITCHENETTE_APPLIANCE_PACK_BASIC:KITCHEN_APPLIANCE_UNITS': 'RECIPE_KITCHENETTE_APPLIANCE_PACK_BASIC_UD',
  'KITCHENETTE_SINK_STD:KITCHEN_SINK_UNITS': 'RECIPE_KITCHENETTE_SINK_STD_UD',
  'KITCHENETTE_TAPWARE_STD:KITCHEN_TAPWARE_UNITS': 'RECIPE_KITCHENETTE_TAPWARE_STD_UD',
  'LEVELING_LIGHT:LEVELING_AREA': 'RECIPE_LEVELING_LIGHT_M2',
  'LEVELING_MEDIUM:LEVELING_AREA': 'RECIPE_LEVELING_MEDIUM_M2',
  'COMMON_AREA_BASIC:COMMON_AREA': 'RECIPE_COMMON_AREA_BASIC_M2',
  'COMMON_AREA_INTENSIVE:COMMON_AREA': 'RECIPE_COMMON_AREA_INTENSIVE_M2',
  'PARTITION_PLADUR_STD:PARTITION_WALL_AREA': 'RECIPE_PARTITION_PLADUR_STD_M2',
  'PARTITION_PLADUR_ACOUSTIC:PARTITION_WALL_AREA': 'RECIPE_PARTITION_PLADUR_ACOUSTIC_M2',
  'PARTITION_BRICK_STD:PARTITION_WALL_AREA': 'RECIPE_PARTITION_BRICK_STD_M2',
  'PARTITION_BLOCK_STD:PARTITION_WALL_AREA': 'RECIPE_PARTITION_BLOCK_STD_M2',
  'CEILING_CONTINUOUS_STD:CEILING_AREA': 'RECIPE_CEILING_CONTINUOUS_STD_M2',
  'CEILING_CONTINUOUS_INSULATED:CEILING_AREA': 'RECIPE_CEILING_CONTINUOUS_INSULATED_M2',
  'CEILING_SUSPENDED_GRID:CEILING_AREA': 'RECIPE_CEILING_SUSPENDED_GRID_M2',
  'FLOOR_TILE_STD:FLOORING_AREA': 'RECIPE_FLOOR_TILE_STD_M2',
  'FLOOR_LAMINATE_STD:FLOORING_AREA': 'RECIPE_FLOOR_LAMINATE_STD_M2',
  'FLOOR_VINYL_STD:FLOORING_AREA': 'RECIPE_FLOOR_VINYL_STD_M2',
  'SKIRTING_STD:SKIRTING_LENGTH': 'RECIPE_SKIRTING_STD_ML',
  'DOOR_INTERIOR_STD:DOOR_UNITS': 'RECIPE_DOOR_INTERIOR_STD_UD',
  'DOOR_INTERIOR_PLUS:DOOR_UNITS': 'RECIPE_DOOR_INTERIOR_PLUS_UD',
  'WINDOW_STD:WINDOW_UNITS': 'RECIPE_WINDOW_STD_UD',
  'WINDOW_IMPROVED:WINDOW_UNITS': 'RECIPE_WINDOW_IMPROVED_UD',
  'SHUTTER_STD:SHUTTER_UNITS': 'RECIPE_SHUTTER_STD_UD',
  'ELECTRICAL_ROOM_STD:ELECTRICAL_POINTS': 'RECIPE_ELECTRICAL_ROOM_STD_PT',
  'LIGHTING_BASIC:LIGHTING_POINTS': 'RECIPE_LIGHTING_BASIC_PT',
  'PLUMBING_POINT_STD:PLUMBING_POINTS': 'RECIPE_PLUMBING_POINT_STD_PT',
  'DRAINAGE_POINT_STD:DRAINAGE_POINTS': 'RECIPE_DRAINAGE_POINT_STD_PT',
  'WALL_TILE_BATH_STD:WALL_TILE_AREA': 'RECIPE_WALL_TILE_BATH_STD_M2',
  'WALL_TILE_BATH_PLUS:WALL_TILE_AREA': 'RECIPE_WALL_TILE_BATH_PLUS_M2',
  'WALL_TILE_KITCHEN_SPLASHBACK:BACKSPLASH_AREA': 'RECIPE_WALL_TILE_KITCHEN_SPLASHBACK_M2',
  'WALL_TILE_WET_PARTIAL:WET_WALL_TILE_AREA': 'RECIPE_WALL_TILE_WET_PARTIAL_M2',
  'WALL_TILE_WET_FULL:WET_WALL_TILE_AREA': 'RECIPE_WALL_TILE_WET_FULL_M2',
  'PAINT_WALL_STD:PAINT_WALL_AREA': 'RECIPE_PAINT_WALL_STD_M2',
  'PAINT_WALL_PLUS:PAINT_WALL_AREA': 'RECIPE_PAINT_WALL_PLUS_M2',
  'PAINT_CEILING_STD:PAINT_CEILING_AREA': 'RECIPE_PAINT_CEILING_STD_M2',
  'WET_AREA_WATERPROOFING_STD:WATERPROOFING_AREA': 'RECIPE_WET_AREA_WATERPROOFING_STD_M2',
  'WET_AREA_WATERPROOFING_PLUS:WET_WATERPROOFING_AREA': 'RECIPE_WET_AREA_WATERPROOFING_PLUS_M2',
  'PARTITION_LINING_STD:LINING_WALL_AREA': 'RECIPE_PARTITION_LINING_STD_M2',
  'CEILING_CONTINUOUS_PLUS:CEILING_AREA': 'RECIPE_CEILING_CONTINUOUS_PLUS_M2',
  'DOOR_SLIDING_STD:DOOR_UNITS': 'RECIPE_DOOR_SLIDING_STD_UD',
  'DOOR_RF_BASIC:DOOR_UNITS': 'RECIPE_DOOR_RF_BASIC_UD',
  'WINDOW_THERMAL_PLUS:WINDOW_UNITS': 'RECIPE_WINDOW_THERMAL_PLUS_UD',
  'ELECTRICAL_MECHANISMS_STD:ELECTRICAL_MECHANISMS_COUNT': 'RECIPE_ELECTRICAL_MECHANISMS_STD_PT',
  'ELECTRICAL_PANEL_BASIC:ELECTRICAL_PANEL_UNITS': 'RECIPE_ELECTRICAL_PANEL_BASIC_UD',
  'PLUMBING_WET_ROOM_STD:PLUMBING_WET_POINTS': 'RECIPE_PLUMBING_WET_ROOM_STD_PT',
  'DRAINAGE_WET_ROOM_STD:DRAINAGE_WET_POINTS': 'RECIPE_DRAINAGE_WET_ROOM_STD_PT',
  'PLUMBING_WET_ROOM_PLUS:PLUMBING_WET_POINTS': 'RECIPE_PLUMBING_WET_ROOM_PLUS_PT',
  'DRAINAGE_WET_ROOM_PLUS:DRAINAGE_WET_POINTS': 'RECIPE_DRAINAGE_WET_ROOM_PLUS_PT',
};

const AUXILIARY_MEASUREMENT_CODES = new Set<RecipeMeasurementCode>(['ROOM_UNIT', 'BATH_UNIT']);

const RECIPE_TEMPLATES: Record<RecipeCode, RecipeTemplate> = {
  RECIPE_ROOM_STD_COLIVING_BASIC_M2: {
    recipeCode: 'RECIPE_ROOM_STD_COLIVING_BASIC_M2',
    description: 'Habitacion coliving basica por m2',
    unit: 'm2',
    wasteFactor: 0.05,
    indirectFactor: 0.08,
    materials: [
      { materialCode: 'MAT_ROOM_FLOOR_BASIC', description: 'Pavimento habitacion basico', quantityPerUnit: 1, unit: 'm2' },
      { materialCode: 'MAT_ROOM_SKIRTING_BASIC', description: 'Rodapie habitacion basico', quantityPerUnit: 0.35, unit: 'ml' },
      { materialCode: 'MAT_ROOM_PAINT_BASIC', description: 'Pintura plastica habitacion', quantityPerUnit: 1.8, unit: 'm2' },
      { materialCode: 'MAT_ROOM_ELEC_PACK_BASIC', description: 'Paquete electrico basico habitacion', quantityPerUnit: 0.1, unit: 'lot' },
    ],
    labor: [
      { laborCode: 'LAB_ROOM_BASIC', description: 'Mano de obra habitacion basica', quantityPerUnit: 0.45, unit: 'h' },
    ],
  },
  RECIPE_ROOM_STD_COLIVING_PLUS_M2: {
    recipeCode: 'RECIPE_ROOM_STD_COLIVING_PLUS_M2',
    description: 'Habitacion coliving plus por m2',
    unit: 'm2',
    wasteFactor: 0.06,
    indirectFactor: 0.1,
    materials: [
      { materialCode: 'MAT_ROOM_FLOOR_PLUS', description: 'Pavimento habitacion plus', quantityPerUnit: 1, unit: 'm2' },
      { materialCode: 'MAT_ROOM_SKIRTING_PLUS', description: 'Rodapie habitacion plus', quantityPerUnit: 0.35, unit: 'ml' },
      { materialCode: 'MAT_ROOM_PAINT_PLUS', description: 'Pintura reforzada habitacion', quantityPerUnit: 1.9, unit: 'm2' },
      { materialCode: 'MAT_ROOM_ELEC_PACK_PLUS', description: 'Paquete electrico plus habitacion', quantityPerUnit: 0.14, unit: 'lot' },
    ],
    labor: [
      { laborCode: 'LAB_ROOM_PLUS', description: 'Mano de obra habitacion plus', quantityPerUnit: 0.6, unit: 'h' },
    ],
  },
  RECIPE_BATH_STD_COMPACT_M2: {
    recipeCode: 'RECIPE_BATH_STD_COMPACT_M2',
    description: 'Bano compacto por m2',
    unit: 'm2',
    wasteFactor: 0.08,
    indirectFactor: 0.12,
    materials: [
      { materialCode: 'MAT_BATH_TILE_COMPACT', description: 'Alicatado bano compacto', quantityPerUnit: 2.6, unit: 'm2' },
      { materialCode: 'MAT_BATH_FLOOR_COMPACT', description: 'Pavimento bano compacto', quantityPerUnit: 1, unit: 'm2' },
      { materialCode: 'MAT_BATH_SANITARY_COMPACT', description: 'Paquete sanitario compacto', quantityPerUnit: 0.25, unit: 'lot' },
      { materialCode: 'MAT_BATH_PLUMBING_COMPACT', description: 'Fontaneria bano compacto', quantityPerUnit: 0.25, unit: 'lot' },
      { materialCode: 'MAT_BATH_DRAINAGE_COMPACT', description: 'Saneamiento bano compacto', quantityPerUnit: 0.2, unit: 'lot' },
      { materialCode: 'MAT_BATH_ELEC_COMPACT', description: 'Electricidad bano compacto', quantityPerUnit: 0.12, unit: 'lot' },
    ],
    labor: [
      { laborCode: 'LAB_BATH_COMPACT', description: 'Mano de obra bano compacto', quantityPerUnit: 1.25, unit: 'h' },
    ],
  },
  RECIPE_BATH_STD_MEDIUM_M2: {
    recipeCode: 'RECIPE_BATH_STD_MEDIUM_M2',
    description: 'Bano medio por m2',
    unit: 'm2',
    wasteFactor: 0.08,
    indirectFactor: 0.13,
    materials: [
      { materialCode: 'MAT_BATH_TILE_MEDIUM', description: 'Alicatado bano medio', quantityPerUnit: 2.8, unit: 'm2' },
      { materialCode: 'MAT_BATH_FLOOR_MEDIUM', description: 'Pavimento bano medio', quantityPerUnit: 1, unit: 'm2' },
      { materialCode: 'MAT_BATH_SANITARY_MEDIUM', description: 'Paquete sanitario medio', quantityPerUnit: 0.3, unit: 'lot' },
      { materialCode: 'MAT_BATH_PLUMBING_MEDIUM', description: 'Fontaneria bano medio', quantityPerUnit: 0.3, unit: 'lot' },
      { materialCode: 'MAT_BATH_DRAINAGE_MEDIUM', description: 'Saneamiento bano medio', quantityPerUnit: 0.22, unit: 'lot' },
      { materialCode: 'MAT_BATH_ELEC_MEDIUM', description: 'Electricidad bano medio', quantityPerUnit: 0.14, unit: 'lot' },
    ],
    labor: [
      { laborCode: 'LAB_BATH_MEDIUM', description: 'Mano de obra bano medio', quantityPerUnit: 1.45, unit: 'h' },
    ],
  },
  RECIPE_BATH_ADAPTED_M2: {
    recipeCode: 'RECIPE_BATH_ADAPTED_M2',
    description: 'Bano adaptado por m2',
    unit: 'm2',
    wasteFactor: 0.09,
    indirectFactor: 0.14,
    materials: [
      { materialCode: 'MAT_BATH_TILE_ADAPTED', description: 'Alicatado bano adaptado', quantityPerUnit: 2.9, unit: 'm2' },
      { materialCode: 'MAT_BATH_FLOOR_ADAPTED', description: 'Pavimento bano adaptado', quantityPerUnit: 1, unit: 'm2' },
      { materialCode: 'MAT_BATH_SANITARY_ADAPTED', description: 'Sanitario adaptado', quantityPerUnit: 0.35, unit: 'lot' },
      { materialCode: 'MAT_BATH_SUPPORTS_ADAPTED', description: 'Barras y apoyos adaptados', quantityPerUnit: 0.2, unit: 'lot' },
      { materialCode: 'MAT_BATH_PLUMBING_ADAPTED', description: 'Fontaneria bano adaptado', quantityPerUnit: 0.32, unit: 'lot' },
      { materialCode: 'MAT_BATH_DRAINAGE_ADAPTED', description: 'Saneamiento bano adaptado', quantityPerUnit: 0.24, unit: 'lot' },
      { materialCode: 'MAT_BATH_ELEC_ADAPTED', description: 'Electricidad bano adaptado', quantityPerUnit: 0.16, unit: 'lot' },
    ],
    labor: [
      { laborCode: 'LAB_BATH_ADAPTED', description: 'Mano de obra bano adaptado', quantityPerUnit: 1.7, unit: 'h' },
    ],
  },
  RECIPE_BATH_SHOWER_TRAY_STD_UD: {
    recipeCode: 'RECIPE_BATH_SHOWER_TRAY_STD_UD',
    description: 'Plato de ducha estandar por unidad',
    unit: 'ud',
    wasteFactor: 0.02,
    indirectFactor: 0.08,
    materials: [{ materialCode: 'MAT_BATH_SHOWER_TRAY_STD', description: 'Plato de ducha estandar', quantityPerUnit: 1, unit: 'ud' }],
    labor: [{ laborCode: 'LAB_BATH_SHOWER_TRAY_STD', description: 'Montaje plato de ducha estandar', quantityPerUnit: 1.1, unit: 'h' }],
  },
  RECIPE_BATH_BATHTUB_STD_UD: {
    recipeCode: 'RECIPE_BATH_BATHTUB_STD_UD',
    description: 'Banera basica por unidad',
    unit: 'ud',
    wasteFactor: 0.02,
    indirectFactor: 0.09,
    materials: [{ materialCode: 'MAT_BATH_BATHTUB_STD', description: 'Banera basica', quantityPerUnit: 1, unit: 'ud' }],
    labor: [{ laborCode: 'LAB_BATH_BATHTUB_STD', description: 'Montaje banera basica', quantityPerUnit: 1.45, unit: 'h' }],
  },
  RECIPE_BATH_SCREEN_STD_UD: {
    recipeCode: 'RECIPE_BATH_SCREEN_STD_UD',
    description: 'Mampara estandar por unidad',
    unit: 'ud',
    wasteFactor: 0.02,
    indirectFactor: 0.08,
    materials: [{ materialCode: 'MAT_BATH_SCREEN_STD', description: 'Mampara estandar', quantityPerUnit: 1, unit: 'ud' }],
    labor: [{ laborCode: 'LAB_BATH_SCREEN_STD', description: 'Montaje mampara estandar', quantityPerUnit: 0.65, unit: 'h' }],
  },
  RECIPE_BATH_VANITY_STD_UD: {
    recipeCode: 'RECIPE_BATH_VANITY_STD_UD',
    description: 'Mueble lavabo estandar por unidad',
    unit: 'ud',
    wasteFactor: 0.02,
    indirectFactor: 0.08,
    materials: [{ materialCode: 'MAT_BATH_VANITY_STD', description: 'Mueble lavabo estandar', quantityPerUnit: 1, unit: 'ud' }],
    labor: [{ laborCode: 'LAB_BATH_VANITY_STD', description: 'Montaje mueble lavabo estandar', quantityPerUnit: 0.72, unit: 'h' }],
  },
  RECIPE_BATH_TAPWARE_STD_UD: {
    recipeCode: 'RECIPE_BATH_TAPWARE_STD_UD',
    description: 'Griferia bano estandar por unidad',
    unit: 'ud',
    wasteFactor: 0.01,
    indirectFactor: 0.07,
    materials: [{ materialCode: 'MAT_BATH_TAPWARE_STD', description: 'Juego de griferia bano estandar', quantityPerUnit: 1, unit: 'ud' }],
    labor: [{ laborCode: 'LAB_BATH_TAPWARE_STD', description: 'Montaje griferia bano estandar', quantityPerUnit: 0.42, unit: 'h' }],
  },
  RECIPE_BATH_TAPWARE_PLUS_UD: {
    recipeCode: 'RECIPE_BATH_TAPWARE_PLUS_UD',
    description: 'Griferia bano plus por unidad',
    unit: 'ud',
    wasteFactor: 0.01,
    indirectFactor: 0.08,
    materials: [{ materialCode: 'MAT_BATH_TAPWARE_PLUS', description: 'Juego de griferia bano plus', quantityPerUnit: 1, unit: 'ud' }],
    labor: [{ laborCode: 'LAB_BATH_TAPWARE_PLUS', description: 'Montaje griferia bano plus', quantityPerUnit: 0.46, unit: 'h' }],
  },
  RECIPE_KITCHENETTE_120_BASIC_ML: {
    recipeCode: 'RECIPE_KITCHENETTE_120_BASIC_ML',
    description: 'Kitchenette 120 basica por metro lineal',
    unit: 'ml',
    wasteFactor: 0.05,
    indirectFactor: 0.1,
    materials: [
      { materialCode: 'MAT_KITCH_BASE_CABINET', description: 'Mobiliario kitchenette basica', quantityPerUnit: 1, unit: 'ml' },
      { materialCode: 'MAT_KITCH_BASE_COUNTERTOP', description: 'Encimera kitchenette basica', quantityPerUnit: 1, unit: 'ml' },
      { materialCode: 'MAT_KITCH_BASE_SINK', description: 'Fregadero kitchenette basica', quantityPerUnit: 0.5, unit: 'ud' },
      { materialCode: 'MAT_KITCH_BASE_CONNECTIONS', description: 'Conexiones kitchenette basica', quantityPerUnit: 0.5, unit: 'lot' },
    ],
    labor: [
      { laborCode: 'LAB_KITCH_BASIC', description: 'Montaje kitchenette basica', quantityPerUnit: 1.15, unit: 'h' },
    ],
  },
  RECIPE_KITCHENETTE_180_COMPLETE_ML: {
    recipeCode: 'RECIPE_KITCHENETTE_180_COMPLETE_ML',
    description: 'Kitchenette 180 completa por metro lineal',
    unit: 'ml',
    wasteFactor: 0.06,
    indirectFactor: 0.12,
    materials: [
      { materialCode: 'MAT_KITCH_COMPLETE_CABINET', description: 'Mobiliario kitchenette completa', quantityPerUnit: 1, unit: 'ml' },
      { materialCode: 'MAT_KITCH_COMPLETE_COUNTERTOP', description: 'Encimera kitchenette completa', quantityPerUnit: 1, unit: 'ml' },
      { materialCode: 'MAT_KITCH_COMPLETE_SINK', description: 'Fregadero kitchenette completa', quantityPerUnit: 0.6, unit: 'ud' },
      { materialCode: 'MAT_KITCH_COMPLETE_APPLIANCE_PACK', description: 'Pack electrodomesticos kitchenette', quantityPerUnit: 0.5, unit: 'lot' },
      { materialCode: 'MAT_KITCH_COMPLETE_CONNECTIONS', description: 'Conexiones kitchenette completa', quantityPerUnit: 0.6, unit: 'lot' },
    ],
    labor: [
      { laborCode: 'LAB_KITCH_COMPLETE', description: 'Montaje kitchenette completa', quantityPerUnit: 1.45, unit: 'h' },
    ],
  },
  RECIPE_KITCHENETTE_CABINET_LOW_STD_ML: {
    recipeCode: 'RECIPE_KITCHENETTE_CABINET_LOW_STD_ML',
    description: 'Mueble bajo cocina por metro lineal',
    unit: 'ml',
    wasteFactor: 0.04,
    indirectFactor: 0.08,
    materials: [{ materialCode: 'MAT_KITCH_CABINET_LOW_STD', description: 'Mueble bajo cocina estandar', quantityPerUnit: 1, unit: 'ml' }],
    labor: [{ laborCode: 'LAB_KITCH_CABINET_LOW_STD', description: 'Montaje mueble bajo cocina', quantityPerUnit: 0.68, unit: 'h' }],
  },
  RECIPE_KITCHENETTE_CABINET_HIGH_STD_ML: {
    recipeCode: 'RECIPE_KITCHENETTE_CABINET_HIGH_STD_ML',
    description: 'Mueble alto cocina por metro lineal',
    unit: 'ml',
    wasteFactor: 0.04,
    indirectFactor: 0.08,
    materials: [{ materialCode: 'MAT_KITCH_CABINET_HIGH_STD', description: 'Mueble alto cocina estandar', quantityPerUnit: 1, unit: 'ml' }],
    labor: [{ laborCode: 'LAB_KITCH_CABINET_HIGH_STD', description: 'Montaje mueble alto cocina', quantityPerUnit: 0.74, unit: 'h' }],
  },
  RECIPE_KITCHENETTE_COUNTERTOP_STD_ML: {
    recipeCode: 'RECIPE_KITCHENETTE_COUNTERTOP_STD_ML',
    description: 'Encimera cocina estandar por metro lineal',
    unit: 'ml',
    wasteFactor: 0.03,
    indirectFactor: 0.08,
    materials: [{ materialCode: 'MAT_KITCH_COUNTERTOP_STD', description: 'Encimera cocina estandar', quantityPerUnit: 1, unit: 'ml' }],
    labor: [{ laborCode: 'LAB_KITCH_COUNTERTOP_STD', description: 'Montaje encimera cocina estandar', quantityPerUnit: 0.36, unit: 'h' }],
  },
  RECIPE_KITCHENETTE_COUNTERTOP_PLUS_ML: {
    recipeCode: 'RECIPE_KITCHENETTE_COUNTERTOP_PLUS_ML',
    description: 'Encimera cocina mejorada por metro lineal',
    unit: 'ml',
    wasteFactor: 0.03,
    indirectFactor: 0.09,
    materials: [{ materialCode: 'MAT_KITCH_COUNTERTOP_PLUS', description: 'Encimera cocina mejorada', quantityPerUnit: 1, unit: 'ml' }],
    labor: [{ laborCode: 'LAB_KITCH_COUNTERTOP_PLUS', description: 'Montaje encimera cocina mejorada', quantityPerUnit: 0.4, unit: 'h' }],
  },
  RECIPE_KITCHENETTE_APPLIANCE_PACK_BASIC_UD: {
    recipeCode: 'RECIPE_KITCHENETTE_APPLIANCE_PACK_BASIC_UD',
    description: 'Pack de electrodomesticos basico por unidad',
    unit: 'ud',
    wasteFactor: 0.01,
    indirectFactor: 0.09,
    materials: [{ materialCode: 'MAT_KITCH_APPLIANCE_PACK_BASIC', description: 'Pack electrodomesticos basico', quantityPerUnit: 1, unit: 'ud' }],
    labor: [{ laborCode: 'LAB_KITCH_APPLIANCE_PACK_BASIC', description: 'Montaje pack electrodomesticos basico', quantityPerUnit: 0.8, unit: 'h' }],
  },
  RECIPE_KITCHENETTE_SINK_STD_UD: {
    recipeCode: 'RECIPE_KITCHENETTE_SINK_STD_UD',
    description: 'Fregadero cocina estandar por unidad',
    unit: 'ud',
    wasteFactor: 0.01,
    indirectFactor: 0.07,
    materials: [{ materialCode: 'MAT_KITCH_SINK_STD', description: 'Fregadero cocina estandar', quantityPerUnit: 1, unit: 'ud' }],
    labor: [{ laborCode: 'LAB_KITCH_SINK_STD', description: 'Montaje fregadero cocina estandar', quantityPerUnit: 0.46, unit: 'h' }],
  },
  RECIPE_KITCHENETTE_TAPWARE_STD_UD: {
    recipeCode: 'RECIPE_KITCHENETTE_TAPWARE_STD_UD',
    description: 'Griferia cocina estandar por unidad',
    unit: 'ud',
    wasteFactor: 0.01,
    indirectFactor: 0.07,
    materials: [{ materialCode: 'MAT_KITCH_TAPWARE_STD', description: 'Griferia cocina estandar', quantityPerUnit: 1, unit: 'ud' }],
    labor: [{ laborCode: 'LAB_KITCH_TAPWARE_STD', description: 'Montaje griferia cocina estandar', quantityPerUnit: 0.34, unit: 'h' }],
  },
  RECIPE_LEVELING_LIGHT_M2: {
    recipeCode: 'RECIPE_LEVELING_LIGHT_M2',
    description: 'Nivelacion ligera por m2',
    unit: 'm2',
    wasteFactor: 0.04,
    indirectFactor: 0.08,
    materials: [
      { materialCode: 'MAT_LEVELING_LIGHT_MORTAR', description: 'Mortero nivelacion ligera', quantityPerUnit: 1, unit: 'm2' },
    ],
    labor: [
      { laborCode: 'LAB_LEVELING_LIGHT', description: 'Mano de obra nivelacion ligera', quantityPerUnit: 0.28, unit: 'h' },
    ],
  },
  RECIPE_LEVELING_MEDIUM_M2: {
    recipeCode: 'RECIPE_LEVELING_MEDIUM_M2',
    description: 'Nivelacion media por m2',
    unit: 'm2',
    wasteFactor: 0.05,
    indirectFactor: 0.1,
    materials: [
      { materialCode: 'MAT_LEVELING_MEDIUM_MORTAR', description: 'Mortero nivelacion media', quantityPerUnit: 1, unit: 'm2' },
    ],
    labor: [
      { laborCode: 'LAB_LEVELING_MEDIUM', description: 'Mano de obra nivelacion media', quantityPerUnit: 0.42, unit: 'h' },
    ],
  },
  RECIPE_COMMON_AREA_BASIC_M2: {
    recipeCode: 'RECIPE_COMMON_AREA_BASIC_M2',
    description: 'Zona comun basica por m2',
    unit: 'm2',
    wasteFactor: 0.05,
    indirectFactor: 0.09,
    materials: [
      { materialCode: 'MAT_COMMON_FLOOR_BASIC', description: 'Pavimento zona comun basica', quantityPerUnit: 1, unit: 'm2' },
      { materialCode: 'MAT_COMMON_PAINT_BASIC', description: 'Pintura zona comun basica', quantityPerUnit: 1.6, unit: 'm2' },
      { materialCode: 'MAT_COMMON_LIGHTING_BASIC', description: 'Iluminacion zona comun basica', quantityPerUnit: 0.08, unit: 'lot' },
    ],
    labor: [
      { laborCode: 'LAB_COMMON_BASIC', description: 'Mano de obra zona comun basica', quantityPerUnit: 0.55, unit: 'h' },
    ],
  },
  RECIPE_COMMON_AREA_INTENSIVE_M2: {
    recipeCode: 'RECIPE_COMMON_AREA_INTENSIVE_M2',
    description: 'Zona comun intensiva por m2',
    unit: 'm2',
    wasteFactor: 0.06,
    indirectFactor: 0.12,
    materials: [
      { materialCode: 'MAT_COMMON_FLOOR_INTENSIVE', description: 'Pavimento zona comun intensiva', quantityPerUnit: 1, unit: 'm2' },
      { materialCode: 'MAT_COMMON_PAINT_INTENSIVE', description: 'Pintura zona comun intensiva', quantityPerUnit: 1.8, unit: 'm2' },
      { materialCode: 'MAT_COMMON_LIGHTING_INTENSIVE', description: 'Iluminacion zona comun intensiva', quantityPerUnit: 0.12, unit: 'lot' },
      { materialCode: 'MAT_COMMON_PROTECTION_INTENSIVE', description: 'Protecciones y refuerzo zona comun', quantityPerUnit: 0.1, unit: 'lot' },
    ],
    labor: [
      { laborCode: 'LAB_COMMON_INTENSIVE', description: 'Mano de obra zona comun intensiva', quantityPerUnit: 0.8, unit: 'h' },
    ],
  },
  RECIPE_PARTITION_PLADUR_STD_M2: {
    recipeCode: 'RECIPE_PARTITION_PLADUR_STD_M2',
    description: 'Tabiqueria pladur estandar por m2',
    unit: 'm2',
    wasteFactor: 0.05,
    indirectFactor: 0.08,
    materials: [
      { materialCode: 'MAT_PARTITION_PLADUR_STD_FRAME', description: 'Perfileria pladur estandar', quantityPerUnit: 1, unit: 'm2' },
      { materialCode: 'MAT_PARTITION_PLADUR_STD_BOARD', description: 'Placa pladur estandar', quantityPerUnit: 2, unit: 'm2' },
      { materialCode: 'MAT_PARTITION_PLADUR_STD_FILL', description: 'Relleno interior pladur estandar', quantityPerUnit: 1, unit: 'm2' },
    ],
    labor: [{ laborCode: 'LAB_PARTITION_PLADUR_STD', description: 'Montaje tabiqueria pladur estandar', quantityPerUnit: 0.52, unit: 'h' }],
  },
  RECIPE_PARTITION_PLADUR_ACOUSTIC_M2: {
    recipeCode: 'RECIPE_PARTITION_PLADUR_ACOUSTIC_M2',
    description: 'Tabiqueria pladur acustica por m2',
    unit: 'm2',
    wasteFactor: 0.06,
    indirectFactor: 0.1,
    materials: [
      { materialCode: 'MAT_PARTITION_PLADUR_AC_FRAME', description: 'Perfileria pladur acustico', quantityPerUnit: 1, unit: 'm2' },
      { materialCode: 'MAT_PARTITION_PLADUR_AC_BOARD', description: 'Placa pladur acustica', quantityPerUnit: 4, unit: 'm2' },
      { materialCode: 'MAT_PARTITION_PLADUR_AC_FILL', description: 'Aislamiento tabiqueria acustica', quantityPerUnit: 1, unit: 'm2' },
    ],
    labor: [{ laborCode: 'LAB_PARTITION_PLADUR_ACOUSTIC', description: 'Montaje tabiqueria pladur acustica', quantityPerUnit: 0.68, unit: 'h' }],
  },
  RECIPE_PARTITION_BRICK_STD_M2: {
    recipeCode: 'RECIPE_PARTITION_BRICK_STD_M2',
    description: 'Tabiqueria ladrillo hueco por m2',
    unit: 'm2',
    wasteFactor: 0.07,
    indirectFactor: 0.1,
    materials: [
      { materialCode: 'MAT_PARTITION_BRICK_STD_BLOCK', description: 'Ladrillo hueco sencillo', quantityPerUnit: 1, unit: 'm2' },
      { materialCode: 'MAT_PARTITION_BRICK_STD_MORTAR', description: 'Mortero agarre tabiqueria ceramica', quantityPerUnit: 0.12, unit: 'm3' },
    ],
    labor: [{ laborCode: 'LAB_PARTITION_BRICK_STD', description: 'Ejecucion tabiqueria ladrillo hueco', quantityPerUnit: 0.74, unit: 'h' }],
  },
  RECIPE_PARTITION_BLOCK_STD_M2: {
    recipeCode: 'RECIPE_PARTITION_BLOCK_STD_M2',
    description: 'Tabiqueria bloque simple por m2',
    unit: 'm2',
    wasteFactor: 0.08,
    indirectFactor: 0.11,
    materials: [
      { materialCode: 'MAT_PARTITION_BLOCK_STD_BLOCK', description: 'Bloque sencillo', quantityPerUnit: 1, unit: 'm2' },
      { materialCode: 'MAT_PARTITION_BLOCK_STD_MORTAR', description: 'Mortero tabiqueria bloque', quantityPerUnit: 0.14, unit: 'm3' },
    ],
    labor: [{ laborCode: 'LAB_PARTITION_BLOCK_STD', description: 'Ejecucion tabiqueria bloque simple', quantityPerUnit: 0.78, unit: 'h' }],
  },
  RECIPE_CEILING_CONTINUOUS_STD_M2: {
    recipeCode: 'RECIPE_CEILING_CONTINUOUS_STD_M2',
    description: 'Falso techo continuo estandar por m2',
    unit: 'm2',
    wasteFactor: 0.04,
    indirectFactor: 0.08,
    materials: [
      { materialCode: 'MAT_CEILING_CONT_STD_FRAME', description: 'Perfileria falso techo continuo', quantityPerUnit: 1, unit: 'm2' },
      { materialCode: 'MAT_CEILING_CONT_STD_BOARD', description: 'Placa falso techo continuo', quantityPerUnit: 1.05, unit: 'm2' },
    ],
    labor: [{ laborCode: 'LAB_CEILING_CONTINUOUS_STD', description: 'Montaje falso techo continuo', quantityPerUnit: 0.36, unit: 'h' }],
  },
  RECIPE_CEILING_CONTINUOUS_INSULATED_M2: {
    recipeCode: 'RECIPE_CEILING_CONTINUOUS_INSULATED_M2',
    description: 'Falso techo continuo aislado por m2',
    unit: 'm2',
    wasteFactor: 0.05,
    indirectFactor: 0.09,
    materials: [
      { materialCode: 'MAT_CEILING_CONT_INS_FRAME', description: 'Perfileria falso techo aislado', quantityPerUnit: 1, unit: 'm2' },
      { materialCode: 'MAT_CEILING_CONT_INS_BOARD', description: 'Placa falso techo aislado', quantityPerUnit: 1.05, unit: 'm2' },
      { materialCode: 'MAT_CEILING_CONT_INS_FILL', description: 'Aislamiento falso techo', quantityPerUnit: 1, unit: 'm2' },
    ],
    labor: [{ laborCode: 'LAB_CEILING_CONTINUOUS_INSULATED', description: 'Montaje falso techo aislado', quantityPerUnit: 0.42, unit: 'h' }],
  },
  RECIPE_CEILING_SUSPENDED_GRID_M2: {
    recipeCode: 'RECIPE_CEILING_SUSPENDED_GRID_M2',
    description: 'Falso techo registrable por m2',
    unit: 'm2',
    wasteFactor: 0.05,
    indirectFactor: 0.09,
    materials: [
      { materialCode: 'MAT_CEILING_GRID_MAIN', description: 'Perfileria registrable', quantityPerUnit: 1, unit: 'm2' },
      { materialCode: 'MAT_CEILING_GRID_TILE', description: 'Placa registrable', quantityPerUnit: 1.02, unit: 'm2' },
    ],
    labor: [{ laborCode: 'LAB_CEILING_SUSPENDED_GRID', description: 'Montaje falso techo registrable', quantityPerUnit: 0.33, unit: 'h' }],
  },
  RECIPE_FLOOR_TILE_STD_M2: {
    recipeCode: 'RECIPE_FLOOR_TILE_STD_M2',
    description: 'Pavimento porcelanico estandar por m2',
    unit: 'm2',
    wasteFactor: 0.06,
    indirectFactor: 0.09,
    materials: [
      { materialCode: 'MAT_FLOOR_TILE_STD', description: 'Pavimento porcelanico estandar', quantityPerUnit: 1, unit: 'm2' },
      { materialCode: 'MAT_FLOOR_TILE_ADHESIVE', description: 'Adhesivo pavimento porcelanico', quantityPerUnit: 0.18, unit: 'bag' },
    ],
    labor: [{ laborCode: 'LAB_FLOOR_TILE_STD', description: 'Colocacion pavimento porcelanico', quantityPerUnit: 0.4, unit: 'h' }],
  },
  RECIPE_FLOOR_LAMINATE_STD_M2: {
    recipeCode: 'RECIPE_FLOOR_LAMINATE_STD_M2',
    description: 'Pavimento laminado estandar por m2',
    unit: 'm2',
    wasteFactor: 0.05,
    indirectFactor: 0.08,
    materials: [
      { materialCode: 'MAT_FLOOR_LAMINATE_STD', description: 'Pavimento laminado estandar', quantityPerUnit: 1, unit: 'm2' },
    ],
    labor: [{ laborCode: 'LAB_FLOOR_LAMINATE_STD', description: 'Colocacion pavimento laminado', quantityPerUnit: 0.28, unit: 'h' }],
  },
  RECIPE_FLOOR_VINYL_STD_M2: {
    recipeCode: 'RECIPE_FLOOR_VINYL_STD_M2',
    description: 'Pavimento vinilico estandar por m2',
    unit: 'm2',
    wasteFactor: 0.05,
    indirectFactor: 0.08,
    materials: [
      { materialCode: 'MAT_FLOOR_VINYL_STD', description: 'Pavimento vinilico estandar', quantityPerUnit: 1, unit: 'm2' },
    ],
    labor: [{ laborCode: 'LAB_FLOOR_VINYL_STD', description: 'Colocacion pavimento vinilico', quantityPerUnit: 0.25, unit: 'h' }],
  },
  RECIPE_SKIRTING_STD_ML: {
    recipeCode: 'RECIPE_SKIRTING_STD_ML',
    description: 'Rodapie estandar por ml',
    unit: 'ml',
    wasteFactor: 0.04,
    indirectFactor: 0.06,
    materials: [
      { materialCode: 'MAT_SKIRTING_STD', description: 'Rodapie estandar', quantityPerUnit: 1, unit: 'ml' },
    ],
    labor: [{ laborCode: 'LAB_SKIRTING_STD', description: 'Colocacion rodapie estandar', quantityPerUnit: 0.08, unit: 'h' }],
  },
  RECIPE_DOOR_INTERIOR_STD_UD: {
    recipeCode: 'RECIPE_DOOR_INTERIOR_STD_UD',
    description: 'Puerta interior estandar por ud',
    unit: 'ud',
    wasteFactor: 0.02,
    indirectFactor: 0.08,
    materials: [{ materialCode: 'MAT_DOOR_INTERIOR_STD_SET', description: 'Puerta interior estandar completa', quantityPerUnit: 1, unit: 'ud' }],
    labor: [{ laborCode: 'LAB_DOOR_INTERIOR_STD', description: 'Colocacion puerta interior estandar', quantityPerUnit: 1.2, unit: 'h' }],
  },
  RECIPE_DOOR_INTERIOR_PLUS_UD: {
    recipeCode: 'RECIPE_DOOR_INTERIOR_PLUS_UD',
    description: 'Puerta interior mejorada por ud',
    unit: 'ud',
    wasteFactor: 0.02,
    indirectFactor: 0.09,
    materials: [{ materialCode: 'MAT_DOOR_INTERIOR_PLUS_SET', description: 'Puerta interior mejorada completa', quantityPerUnit: 1, unit: 'ud' }],
    labor: [{ laborCode: 'LAB_DOOR_INTERIOR_PLUS', description: 'Colocacion puerta interior mejorada', quantityPerUnit: 1.35, unit: 'h' }],
  },
  RECIPE_WINDOW_STD_UD: {
    recipeCode: 'RECIPE_WINDOW_STD_UD',
    description: 'Ventana estandar por ud',
    unit: 'ud',
    wasteFactor: 0.02,
    indirectFactor: 0.1,
    materials: [{ materialCode: 'MAT_WINDOW_STD_SET', description: 'Ventana estandar completa', quantityPerUnit: 1, unit: 'ud' }],
    labor: [{ laborCode: 'LAB_WINDOW_STD', description: 'Colocacion ventana estandar', quantityPerUnit: 1.8, unit: 'h' }],
  },
  RECIPE_WINDOW_IMPROVED_UD: {
    recipeCode: 'RECIPE_WINDOW_IMPROVED_UD',
    description: 'Ventana mejorada por ud',
    unit: 'ud',
    wasteFactor: 0.02,
    indirectFactor: 0.11,
    materials: [{ materialCode: 'MAT_WINDOW_IMPROVED_SET', description: 'Ventana mejorada completa', quantityPerUnit: 1, unit: 'ud' }],
    labor: [{ laborCode: 'LAB_WINDOW_IMPROVED', description: 'Colocacion ventana mejorada', quantityPerUnit: 2.1, unit: 'h' }],
  },
  RECIPE_SHUTTER_STD_UD: {
    recipeCode: 'RECIPE_SHUTTER_STD_UD',
    description: 'Persiana estandar por ud',
    unit: 'ud',
    wasteFactor: 0.02,
    indirectFactor: 0.08,
    materials: [{ materialCode: 'MAT_SHUTTER_STD_SET', description: 'Persiana estandar completa', quantityPerUnit: 1, unit: 'ud' }],
    labor: [{ laborCode: 'LAB_SHUTTER_STD', description: 'Colocacion persiana estandar', quantityPerUnit: 0.95, unit: 'h' }],
  },
  RECIPE_ELECTRICAL_ROOM_STD_PT: {
    recipeCode: 'RECIPE_ELECTRICAL_ROOM_STD_PT',
    description: 'Punto electrico estandar',
    unit: 'pt',
    wasteFactor: 0.03,
    indirectFactor: 0.08,
    materials: [{ materialCode: 'MAT_ELECTRICAL_POINT_STD', description: 'Material electrico por punto', quantityPerUnit: 1, unit: 'pt' }],
    labor: [{ laborCode: 'LAB_ELECTRICAL_POINT_STD', description: 'Montaje punto electrico', quantityPerUnit: 0.35, unit: 'h' }],
  },
  RECIPE_LIGHTING_BASIC_PT: {
    recipeCode: 'RECIPE_LIGHTING_BASIC_PT',
    description: 'Punto de iluminacion basico',
    unit: 'pt',
    wasteFactor: 0.03,
    indirectFactor: 0.08,
    materials: [{ materialCode: 'MAT_LIGHTING_POINT_STD', description: 'Material iluminacion por punto', quantityPerUnit: 1, unit: 'pt' }],
    labor: [{ laborCode: 'LAB_LIGHTING_POINT_STD', description: 'Montaje punto de iluminacion', quantityPerUnit: 0.25, unit: 'h' }],
  },
  RECIPE_PLUMBING_POINT_STD_PT: {
    recipeCode: 'RECIPE_PLUMBING_POINT_STD_PT',
    description: 'Punto de fontaneria basico',
    unit: 'pt',
    wasteFactor: 0.03,
    indirectFactor: 0.08,
    materials: [{ materialCode: 'MAT_PLUMBING_POINT_STD', description: 'Material fontaneria por punto', quantityPerUnit: 1, unit: 'pt' }],
    labor: [{ laborCode: 'LAB_PLUMBING_POINT_STD', description: 'Montaje punto de fontaneria', quantityPerUnit: 0.42, unit: 'h' }],
  },
  RECIPE_DRAINAGE_POINT_STD_PT: {
    recipeCode: 'RECIPE_DRAINAGE_POINT_STD_PT',
    description: 'Punto de saneamiento basico',
    unit: 'pt',
    wasteFactor: 0.03,
    indirectFactor: 0.08,
    materials: [{ materialCode: 'MAT_DRAINAGE_POINT_STD', description: 'Material saneamiento por punto', quantityPerUnit: 1, unit: 'pt' }],
    labor: [{ laborCode: 'LAB_DRAINAGE_POINT_STD', description: 'Montaje punto de saneamiento', quantityPerUnit: 0.38, unit: 'h' }],
  },
  RECIPE_WALL_TILE_BATH_STD_M2: {
    recipeCode: 'RECIPE_WALL_TILE_BATH_STD_M2',
    description: 'Alicatado bano estandar por m2',
    unit: 'm2',
    wasteFactor: 0.08,
    indirectFactor: 0.1,
    materials: [{ materialCode: 'MAT_WALL_TILE_BATH_STD', description: 'Revestimiento ceramico bano estandar', quantityPerUnit: 1.05, unit: 'm2' }],
    labor: [{ laborCode: 'LAB_WALL_TILE_BATH_STD', description: 'Colocacion alicatado bano estandar', quantityPerUnit: 0.62, unit: 'h' }],
  },
  RECIPE_WALL_TILE_BATH_PLUS_M2: {
    recipeCode: 'RECIPE_WALL_TILE_BATH_PLUS_M2',
    description: 'Alicatado bano mejorado por m2',
    unit: 'm2',
    wasteFactor: 0.09,
    indirectFactor: 0.11,
    materials: [{ materialCode: 'MAT_WALL_TILE_BATH_PLUS', description: 'Revestimiento ceramico bano mejorado', quantityPerUnit: 1.06, unit: 'm2' }],
    labor: [{ laborCode: 'LAB_WALL_TILE_BATH_PLUS', description: 'Colocacion alicatado bano mejorado', quantityPerUnit: 0.7, unit: 'h' }],
  },
  RECIPE_WALL_TILE_KITCHEN_SPLASHBACK_M2: {
    recipeCode: 'RECIPE_WALL_TILE_KITCHEN_SPLASHBACK_M2',
    description: 'Frente de cocina alicatado por m2',
    unit: 'm2',
    wasteFactor: 0.08,
    indirectFactor: 0.09,
    materials: [{ materialCode: 'MAT_WALL_TILE_KITCH_SPLASHBACK', description: 'Revestimiento frente cocina', quantityPerUnit: 1.05, unit: 'm2' }],
    labor: [{ laborCode: 'LAB_WALL_TILE_KITCH_SPLASHBACK', description: 'Colocacion frente cocina', quantityPerUnit: 0.55, unit: 'h' }],
  },
  RECIPE_WALL_TILE_WET_PARTIAL_M2: {
    recipeCode: 'RECIPE_WALL_TILE_WET_PARTIAL_M2',
    description: 'Alicatado humedo parcial por m2',
    unit: 'm2',
    wasteFactor: 0.08,
    indirectFactor: 0.1,
    materials: [{ materialCode: 'MAT_WALL_TILE_WET_PARTIAL', description: 'Revestimiento humedo parcial', quantityPerUnit: 1.05, unit: 'm2' }],
    labor: [{ laborCode: 'LAB_WALL_TILE_WET_PARTIAL', description: 'Colocacion alicatado humedo parcial', quantityPerUnit: 0.58, unit: 'h' }],
  },
  RECIPE_WALL_TILE_WET_FULL_M2: {
    recipeCode: 'RECIPE_WALL_TILE_WET_FULL_M2',
    description: 'Alicatado humedo completo por m2',
    unit: 'm2',
    wasteFactor: 0.09,
    indirectFactor: 0.11,
    materials: [{ materialCode: 'MAT_WALL_TILE_WET_FULL', description: 'Revestimiento humedo completo', quantityPerUnit: 1.06, unit: 'm2' }],
    labor: [{ laborCode: 'LAB_WALL_TILE_WET_FULL', description: 'Colocacion alicatado humedo completo', quantityPerUnit: 0.68, unit: 'h' }],
  },
  RECIPE_PAINT_WALL_STD_M2: {
    recipeCode: 'RECIPE_PAINT_WALL_STD_M2',
    description: 'Pintura pared estandar por m2',
    unit: 'm2',
    wasteFactor: 0.03,
    indirectFactor: 0.08,
    materials: [{ materialCode: 'MAT_PAINT_WALL_STD', description: 'Pintura pared estandar', quantityPerUnit: 1.02, unit: 'm2' }],
    labor: [{ laborCode: 'LAB_PAINT_WALL_STD', description: 'Aplicacion pintura pared estandar', quantityPerUnit: 0.18, unit: 'h' }],
  },
  RECIPE_PAINT_WALL_PLUS_M2: {
    recipeCode: 'RECIPE_PAINT_WALL_PLUS_M2',
    description: 'Pintura pared mejorada por m2',
    unit: 'm2',
    wasteFactor: 0.04,
    indirectFactor: 0.09,
    materials: [{ materialCode: 'MAT_PAINT_WALL_PLUS', description: 'Pintura pared mejorada', quantityPerUnit: 1.03, unit: 'm2' }],
    labor: [{ laborCode: 'LAB_PAINT_WALL_PLUS', description: 'Aplicacion pintura pared mejorada', quantityPerUnit: 0.21, unit: 'h' }],
  },
  RECIPE_PAINT_CEILING_STD_M2: {
    recipeCode: 'RECIPE_PAINT_CEILING_STD_M2',
    description: 'Pintura techo estandar por m2',
    unit: 'm2',
    wasteFactor: 0.03,
    indirectFactor: 0.08,
    materials: [{ materialCode: 'MAT_PAINT_CEILING_STD', description: 'Pintura techo estandar', quantityPerUnit: 1.02, unit: 'm2' }],
    labor: [{ laborCode: 'LAB_PAINT_CEILING_STD', description: 'Aplicacion pintura techo estandar', quantityPerUnit: 0.16, unit: 'h' }],
  },
  RECIPE_WET_AREA_WATERPROOFING_STD_M2: {
    recipeCode: 'RECIPE_WET_AREA_WATERPROOFING_STD_M2',
    description: 'Impermeabilizacion ligera de zona humeda por m2',
    unit: 'm2',
    wasteFactor: 0.04,
    indirectFactor: 0.09,
    materials: [{ materialCode: 'MAT_WATERPROOFING_STD', description: 'Lamina/liquido impermeabilizante ligero', quantityPerUnit: 1.05, unit: 'm2' }],
    labor: [{ laborCode: 'LAB_WATERPROOFING_STD', description: 'Aplicacion impermeabilizacion ligera', quantityPerUnit: 0.24, unit: 'h' }],
  },
  RECIPE_WET_AREA_WATERPROOFING_PLUS_M2: {
    recipeCode: 'RECIPE_WET_AREA_WATERPROOFING_PLUS_M2',
    description: 'Impermeabilizacion humeda reforzada por m2',
    unit: 'm2',
    wasteFactor: 0.05,
    indirectFactor: 0.1,
    materials: [{ materialCode: 'MAT_WATERPROOFING_PLUS', description: 'Impermeabilizacion humeda reforzada', quantityPerUnit: 1.08, unit: 'm2' }],
    labor: [{ laborCode: 'LAB_WATERPROOFING_PLUS', description: 'Aplicacion impermeabilizacion humeda reforzada', quantityPerUnit: 0.29, unit: 'h' }],
  },
  RECIPE_PARTITION_LINING_STD_M2: {
    recipeCode: 'RECIPE_PARTITION_LINING_STD_M2',
    description: 'Trasdosado basico por m2',
    unit: 'm2',
    wasteFactor: 0.05,
    indirectFactor: 0.08,
    materials: [
      { materialCode: 'MAT_PARTITION_LINING_FRAME', description: 'Perfileria trasdosado basico', quantityPerUnit: 1, unit: 'm2' },
      { materialCode: 'MAT_PARTITION_LINING_BOARD', description: 'Placa trasdosado basico', quantityPerUnit: 1.05, unit: 'm2' },
      { materialCode: 'MAT_PARTITION_LINING_FILL', description: 'Aislamiento trasdosado basico', quantityPerUnit: 1, unit: 'm2' },
    ],
    labor: [{ laborCode: 'LAB_PARTITION_LINING_STD', description: 'Montaje trasdosado basico', quantityPerUnit: 0.42, unit: 'h' }],
  },
  RECIPE_CEILING_CONTINUOUS_PLUS_M2: {
    recipeCode: 'RECIPE_CEILING_CONTINUOUS_PLUS_M2',
    description: 'Falso techo continuo plus por m2',
    unit: 'm2',
    wasteFactor: 0.05,
    indirectFactor: 0.1,
    materials: [
      { materialCode: 'MAT_CEILING_CONT_PLUS_FRAME', description: 'Perfileria falso techo plus', quantityPerUnit: 1, unit: 'm2' },
      { materialCode: 'MAT_CEILING_CONT_PLUS_BOARD', description: 'Placa falso techo plus', quantityPerUnit: 1.08, unit: 'm2' },
      { materialCode: 'MAT_CEILING_CONT_PLUS_FILL', description: 'Aislamiento falso techo plus', quantityPerUnit: 1, unit: 'm2' },
    ],
    labor: [{ laborCode: 'LAB_CEILING_CONTINUOUS_PLUS', description: 'Montaje falso techo continuo plus', quantityPerUnit: 0.44, unit: 'h' }],
  },
  RECIPE_DOOR_SLIDING_STD_UD: {
    recipeCode: 'RECIPE_DOOR_SLIDING_STD_UD',
    description: 'Puerta corredera interior estandar por ud',
    unit: 'ud',
    wasteFactor: 0.02,
    indirectFactor: 0.1,
    materials: [{ materialCode: 'MAT_DOOR_SLIDING_STD_SET', description: 'Kit puerta corredera interior', quantityPerUnit: 1, unit: 'ud' }],
    labor: [{ laborCode: 'LAB_DOOR_SLIDING_STD', description: 'Montaje puerta corredera interior', quantityPerUnit: 2.2, unit: 'h' }],
  },
  RECIPE_DOOR_RF_BASIC_UD: {
    recipeCode: 'RECIPE_DOOR_RF_BASIC_UD',
    description: 'Puerta RF basica por ud',
    unit: 'ud',
    wasteFactor: 0.02,
    indirectFactor: 0.11,
    materials: [{ materialCode: 'MAT_DOOR_RF_BASIC_SET', description: 'Kit puerta RF basica', quantityPerUnit: 1, unit: 'ud' }],
    labor: [{ laborCode: 'LAB_DOOR_RF_BASIC', description: 'Montaje puerta RF basica', quantityPerUnit: 2.4, unit: 'h' }],
  },
  RECIPE_WINDOW_THERMAL_PLUS_UD: {
    recipeCode: 'RECIPE_WINDOW_THERMAL_PLUS_UD',
    description: 'Ventana termica mejorada por ud',
    unit: 'ud',
    wasteFactor: 0.02,
    indirectFactor: 0.11,
    materials: [{ materialCode: 'MAT_WINDOW_THERMAL_PLUS_SET', description: 'Ventana termica mejorada completa', quantityPerUnit: 1, unit: 'ud' }],
    labor: [{ laborCode: 'LAB_WINDOW_THERMAL_PLUS', description: 'Colocacion ventana termica mejorada', quantityPerUnit: 2.3, unit: 'h' }],
  },
  RECIPE_ELECTRICAL_MECHANISMS_STD_PT: {
    recipeCode: 'RECIPE_ELECTRICAL_MECHANISMS_STD_PT',
    description: 'Mecanismo electrico estandar por punto',
    unit: 'pt',
    wasteFactor: 0.03,
    indirectFactor: 0.08,
    materials: [{ materialCode: 'MAT_ELECTRICAL_MECHANISMS_STD', description: 'Mecanismo electrico estandar', quantityPerUnit: 1, unit: 'pt' }],
    labor: [{ laborCode: 'LAB_ELECTRICAL_MECHANISMS_STD', description: 'Montaje mecanismo electrico estandar', quantityPerUnit: 0.18, unit: 'h' }],
  },
  RECIPE_ELECTRICAL_PANEL_BASIC_UD: {
    recipeCode: 'RECIPE_ELECTRICAL_PANEL_BASIC_UD',
    description: 'Cuadro electrico basico por ud',
    unit: 'ud',
    wasteFactor: 0.02,
    indirectFactor: 0.1,
    materials: [{ materialCode: 'MAT_ELECTRICAL_PANEL_BASIC', description: 'Cuadro electrico basico', quantityPerUnit: 1, unit: 'ud' }],
    labor: [{ laborCode: 'LAB_ELECTRICAL_PANEL_BASIC', description: 'Montaje cuadro electrico basico', quantityPerUnit: 1.4, unit: 'h' }],
  },
  RECIPE_PLUMBING_WET_ROOM_STD_PT: {
    recipeCode: 'RECIPE_PLUMBING_WET_ROOM_STD_PT',
    description: 'Punto humedo de fontaneria por punto',
    unit: 'pt',
    wasteFactor: 0.03,
    indirectFactor: 0.09,
    materials: [{ materialCode: 'MAT_PLUMBING_WET_ROOM_STD', description: 'Material fontaneria zona humeda', quantityPerUnit: 1, unit: 'pt' }],
    labor: [{ laborCode: 'LAB_PLUMBING_WET_ROOM_STD', description: 'Montaje fontaneria zona humeda', quantityPerUnit: 0.48, unit: 'h' }],
  },
  RECIPE_DRAINAGE_WET_ROOM_STD_PT: {
    recipeCode: 'RECIPE_DRAINAGE_WET_ROOM_STD_PT',
    description: 'Punto humedo de saneamiento por punto',
    unit: 'pt',
    wasteFactor: 0.03,
    indirectFactor: 0.09,
    materials: [{ materialCode: 'MAT_DRAINAGE_WET_ROOM_STD', description: 'Material saneamiento zona humeda', quantityPerUnit: 1, unit: 'pt' }],
    labor: [{ laborCode: 'LAB_DRAINAGE_WET_ROOM_STD', description: 'Montaje saneamiento zona humeda', quantityPerUnit: 0.44, unit: 'h' }],
  },
  RECIPE_PLUMBING_WET_ROOM_PLUS_PT: {
    recipeCode: 'RECIPE_PLUMBING_WET_ROOM_PLUS_PT',
    description: 'Punto humedo de fontaneria reforzado por punto',
    unit: 'pt',
    wasteFactor: 0.03,
    indirectFactor: 0.1,
    materials: [{ materialCode: 'MAT_PLUMBING_WET_ROOM_PLUS', description: 'Material fontaneria humeda reforzada', quantityPerUnit: 1, unit: 'pt' }],
    labor: [{ laborCode: 'LAB_PLUMBING_WET_ROOM_PLUS', description: 'Montaje fontaneria humeda reforzada', quantityPerUnit: 0.56, unit: 'h' }],
  },
  RECIPE_DRAINAGE_WET_ROOM_PLUS_PT: {
    recipeCode: 'RECIPE_DRAINAGE_WET_ROOM_PLUS_PT',
    description: 'Punto humedo de saneamiento reforzado por punto',
    unit: 'pt',
    wasteFactor: 0.03,
    indirectFactor: 0.1,
    materials: [{ materialCode: 'MAT_DRAINAGE_WET_ROOM_PLUS', description: 'Material saneamiento humedo reforzado', quantityPerUnit: 1, unit: 'pt' }],
    labor: [{ laborCode: 'LAB_DRAINAGE_WET_ROOM_PLUS', description: 'Montaje saneamiento humedo reforzado', quantityPerUnit: 0.5, unit: 'h' }],
  },
};

function getMappingKey(line: MeasurementLine): MappingKey {
  return `${line.solutionCode}:${line.measurementCode as RecipeMeasurementCode}`;
}

function scaleMaterials(template: RecipeTemplate, quantity: number): RecipeMaterial[] {
  return template.materials.map((item) => ({
    materialCode: item.materialCode,
    description: item.description,
    quantity: Number((item.quantityPerUnit * quantity).toFixed(3)),
    unit: item.unit,
    pricingStatus: 'PENDING',
  }));
}

function scaleLabor(
  template: RecipeTemplate,
  quantity: number,
  measurementLine: MeasurementLine,
  executionContext: ExecutionContext,
  projectPolicy?: ProjectProductivityPolicy | null
): RecipeLabor[] {
  const space =
    executionContext.resolvedSpaces.find((item) => item.spaceId === measurementLine.spaceId) ||
    null;
  return template.labor.map((item) => {
    const productivity = resolveLaborProductivity(
      item.laborCode,
      measurementLine.solutionCode,
      quantity,
      item.quantityPerUnit,
      executionContext,
      space,
      projectPolicy
    );

    return {
      laborCode: item.laborCode,
      description: item.description,
      quantity: Number((productivity.adjustedQuantity * productivity.adjustedHoursPerUnit).toFixed(3)),
      unit: item.unit,
      tradeCode: productivity.tradeCode,
      crewCode: productivity.crewCode,
      productivityProfileCode: productivity.productivityProfileCode,
      productivityUnit: productivity.baseUnit,
      productivitySource: productivity.source,
      baseHoursPerUnit: productivity.baseHoursPerUnit,
      adjustedHoursPerUnit: productivity.adjustedHoursPerUnit,
      adjustedCrewDays: productivity.adjustedCrewDays,
      productivityFactors: productivity.factors,
      assumptions: productivity.assumptions,
      policySource: productivity.policySource,
      policyFamilyCode: productivity.policyFamilyCode,
      appliedPolicyOverrides: productivity.appliedPolicyOverrides,
    };
  });
}

function toRecipeStatus(line: MeasurementLine): RecipeStatus {
  if (line.status === 'BLOCKED') return 'RECIPE_MISSING';
  if (line.status === 'ASSUMED' || line.status === 'PARTIAL') return 'RECIPE_PARTIAL';
  return 'RECIPE_RESOLVED';
}

export function buildRecipeResult(
  measurementResult: MeasurementResult | undefined,
  executionContext: ExecutionContext,
  projectPolicy?: ProjectProductivityPolicy | null
): RecipeResult {
  if (!measurementResult) {
    return {
      status: 'BLOCKED',
      lines: [],
      coverage: {
        resolvedRecipeLines: 0,
        partialRecipeLines: 0,
        missingRecipeLines: 0,
        recipeCoveragePercent: 0,
      },
      warnings: ['No existe MeasurementResult para construir recetas.'],
      assumptions: [],
    };
  }

  const warnings = [...measurementResult.warnings];
  const assumptions = [...measurementResult.assumptions];
  const lines: RecipeLine[] = [];
  const auxiliaryOmissions = new Set<string>();

  for (const measurementLine of measurementResult.lines) {
    const mappingKey = getMappingKey(measurementLine);
    const recipeCode = RECIPE_MAPPING_TABLE[mappingKey];

    if (!recipeCode) {
      if (AUXILIARY_MEASUREMENT_CODES.has(measurementLine.measurementCode as RecipeMeasurementCode)) {
        auxiliaryOmissions.add(measurementLine.measurementCode);
      }
      continue;
    }

    const template = RECIPE_TEMPLATES[recipeCode];
    if (!template) {
      warnings.push(`No existe plantilla de receta para ${recipeCode}.`);
      lines.push({
        id: `${measurementLine.id}:recipe`,
        spaceId: measurementLine.spaceId,
        solutionCode: measurementLine.solutionCode,
        measurementLineId: measurementLine.id,
        recipeCode,
        description: `Receta pendiente para ${recipeCode}`,
        status: 'RECIPE_MISSING',
        materials: [],
        labor: [],
        wasteFactor: null,
        indirectFactor: null,
        sourceLevel: measurementLine.sourceLevel,
        sourceRefId: measurementLine.sourceRefId,
        assumedFields: measurementLine.assumedFields,
      });
      continue;
    }

    const status = toRecipeStatus(measurementLine);
    if (status === 'RECIPE_PARTIAL' && measurementLine.assumedFields.length > 0) {
      assumptions.push(
        `La receta ${recipeCode} arrastra supuestos de medicion en ${measurementLine.spaceId}: ${measurementLine.assumedFields.join(', ')}.`
      );
    }
    if (status === 'RECIPE_MISSING') {
      warnings.push(`La receta ${recipeCode} no se puede cerrar porque la medicion ${measurementLine.measurementCode} esta bloqueada.`);
    }

    const space = executionContext.resolvedSpaces.find((item) => item.spaceId === measurementLine.spaceId);
    lines.push({
      id: `${measurementLine.id}:recipe`,
      spaceId: measurementLine.spaceId,
      solutionCode: measurementLine.solutionCode,
      measurementLineId: measurementLine.id,
      recipeCode,
      description: `${template.description}${space ? ` - ${space.label}` : ''}`,
      status,
      materials: status === 'RECIPE_MISSING' ? [] : scaleMaterials(template, measurementLine.quantity),
      labor:
        status === 'RECIPE_MISSING'
          ? []
          : scaleLabor(template, measurementLine.quantity, measurementLine, executionContext, projectPolicy),
      wasteFactor: template.wasteFactor ?? null,
      indirectFactor: template.indirectFactor ?? null,
      sourceLevel: measurementLine.sourceLevel,
      sourceRefId: measurementLine.sourceRefId,
      assumedFields: measurementLine.assumedFields,
    });
  }

  if (auxiliaryOmissions.size > 0) {
    warnings.push(
      `Lineas auxiliares sin receta para evitar duplicidad: ${Array.from(auxiliaryOmissions).join(', ')}.`
    );
  }

  const resolvedRecipeLines = lines.filter((line) => line.status === 'RECIPE_RESOLVED').length;
  const partialRecipeLines = lines.filter((line) => line.status === 'RECIPE_PARTIAL').length;
  const missingRecipeLines = lines.filter((line) => line.status === 'RECIPE_MISSING').length;

  const status =
    lines.length === 0 || missingRecipeLines === lines.length
      ? 'BLOCKED'
      : missingRecipeLines > 0 || partialRecipeLines > 0
        ? 'PARTIAL'
        : 'READY';

  const recipeCoveragePercent =
    lines.length === 0 ? 0 : Math.round(((resolvedRecipeLines + partialRecipeLines) / lines.length) * 100);

  return {
    status,
    lines,
    coverage: {
      resolvedRecipeLines,
      partialRecipeLines,
      missingRecipeLines,
      recipeCoveragePercent,
    },
    warnings: Array.from(new Set(warnings)),
    assumptions: Array.from(new Set(assumptions)),
  };
}

export { RECIPE_MAPPING_TABLE, RECIPE_TEMPLATES };
