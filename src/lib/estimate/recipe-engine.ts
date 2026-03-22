import type { ExecutionContext } from '@/lib/discovery/types';
import type { VerticalSolutionCode } from '@/lib/discovery/technical-spec-types';
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
  | 'KITCHENETTE_LENGTH'
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
  | 'DRAINAGE_POINTS';

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
  'KITCHENETTE_120_BASIC:KITCHENETTE_LENGTH': 'RECIPE_KITCHENETTE_120_BASIC_ML',
  'KITCHENETTE_180_COMPLETE:KITCHENETTE_LENGTH': 'RECIPE_KITCHENETTE_180_COMPLETE_ML',
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

function scaleLabor(template: RecipeTemplate, quantity: number): RecipeLabor[] {
  return template.labor.map((item) => ({
    laborCode: item.laborCode,
    description: item.description,
    quantity: Number((item.quantityPerUnit * quantity).toFixed(3)),
    unit: item.unit,
  }));
}

function toRecipeStatus(line: MeasurementLine): RecipeStatus {
  if (line.status === 'BLOCKED') return 'RECIPE_MISSING';
  if (line.status === 'ASSUMED' || line.status === 'PARTIAL') return 'RECIPE_PARTIAL';
  return 'RECIPE_RESOLVED';
}

export function buildRecipeResult(
  measurementResult: MeasurementResult | undefined,
  executionContext: ExecutionContext
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
      labor: status === 'RECIPE_MISSING' ? [] : scaleLabor(template, measurementLine.quantity),
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
