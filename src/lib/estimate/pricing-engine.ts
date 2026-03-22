import { db } from '@/lib/db';
import type { ExecutionContext } from '@/lib/discovery/types';
import { ensureProcurementCatalog } from '@/lib/procurement/catalog';
import { resolveRecipeMaterialSourcing } from '@/lib/procurement/material-resolution';
import {
  createDefaultProjectSourcingPolicy,
  mergeProjectSourcingPolicy,
} from '@/lib/procurement/sourcing-policy';
import type { RecipeLine, RecipeLaborCode, RecipeMaterialCode, RecipeResult } from './recipe-types';
import type {
  PricingEngineOptions,
  PriceSource,
  PriceStatus,
  PricingLabor,
  PricingMaterial,
  PricingResult,
} from './pricing-types';
import { deriveEstimateModeFromPricing } from './estimate-status';

type MaterialBinding = {
  procurementMaterialCode?: string;
  preferredSupplierName?: string;
  preferredUnitCost?: number;
  catalogReferenceUnitCost?: number;
  parametricReferenceUnitCost?: number;
};

type LaborBinding = {
  unit: 'h' | 'jor';
  catalogReferenceUnitCost?: number;
  parametricReferenceUnitCost?: number;
};

const MATERIAL_BINDINGS: Record<RecipeMaterialCode, MaterialBinding> = {
  MAT_ROOM_FLOOR_BASIC: { procurementMaterialCode: 'ACA-PORC' },
  MAT_ROOM_SKIRTING_BASIC: { catalogReferenceUnitCost: 4.2 },
  MAT_ROOM_PAINT_BASIC: { procurementMaterialCode: 'PIN-PLA' },
  MAT_ROOM_ELEC_PACK_BASIC: { procurementMaterialCode: 'ELE-MEC' },
  MAT_ROOM_FLOOR_PLUS: { procurementMaterialCode: 'ACA-PORC' },
  MAT_ROOM_SKIRTING_PLUS: { catalogReferenceUnitCost: 5.6 },
  MAT_ROOM_PAINT_PLUS: { procurementMaterialCode: 'PIN-PLA' },
  MAT_ROOM_ELEC_PACK_PLUS: { procurementMaterialCode: 'ELE-MEC' },
  MAT_BATH_TILE_COMPACT: { procurementMaterialCode: 'ACA-PORC' },
  MAT_BATH_FLOOR_COMPACT: { procurementMaterialCode: 'ACA-PORC' },
  MAT_BATH_SANITARY_COMPACT: { procurementMaterialCode: 'INS-SAN-STD' },
  MAT_BATH_PLUMBING_COMPACT: { procurementMaterialCode: 'FON-TUB-PPR' },
  MAT_BATH_DRAINAGE_COMPACT: { catalogReferenceUnitCost: 6.5 },
  MAT_BATH_ELEC_COMPACT: { procurementMaterialCode: 'ELE-MEC' },
  MAT_BATH_TILE_MEDIUM: { procurementMaterialCode: 'ACA-PORC' },
  MAT_BATH_FLOOR_MEDIUM: { procurementMaterialCode: 'ACA-PORC' },
  MAT_BATH_SANITARY_MEDIUM: { procurementMaterialCode: 'INS-SAN-STD' },
  MAT_BATH_PLUMBING_MEDIUM: { procurementMaterialCode: 'FON-TUB-PPR' },
  MAT_BATH_DRAINAGE_MEDIUM: { catalogReferenceUnitCost: 7.25 },
  MAT_BATH_ELEC_MEDIUM: { procurementMaterialCode: 'ELE-MEC' },
  MAT_BATH_TILE_ADAPTED: { procurementMaterialCode: 'ACA-PORC' },
  MAT_BATH_FLOOR_ADAPTED: { procurementMaterialCode: 'ACA-PORC' },
  MAT_BATH_SANITARY_ADAPTED: { procurementMaterialCode: 'INS-SAN-STD' },
  MAT_BATH_SUPPORTS_ADAPTED: {},
  MAT_BATH_PLUMBING_ADAPTED: { procurementMaterialCode: 'FON-TUB-PPR' },
  MAT_BATH_DRAINAGE_ADAPTED: { catalogReferenceUnitCost: 8.4 },
  MAT_BATH_ELEC_ADAPTED: { procurementMaterialCode: 'ELE-MEC' },
  MAT_BATH_SHOWER_TRAY_STD: { procurementMaterialCode: 'SAN-SHOWER-TRAY-STD', catalogReferenceUnitCost: 124 },
  MAT_BATH_BATHTUB_STD: { procurementMaterialCode: 'SAN-BATHTUB-STD', catalogReferenceUnitCost: 208 },
  MAT_BATH_SCREEN_STD: { procurementMaterialCode: 'SAN-SCREEN-STD', catalogReferenceUnitCost: 176 },
  MAT_BATH_VANITY_STD: { procurementMaterialCode: 'SAN-VANITY-STD', catalogReferenceUnitCost: 238 },
  MAT_BATH_TAPWARE_STD: { procurementMaterialCode: 'SAN-TAP-STD', catalogReferenceUnitCost: 88 },
  MAT_BATH_TAPWARE_PLUS: { procurementMaterialCode: 'SAN-TAP-PLUS', catalogReferenceUnitCost: 136 },
  MAT_KITCH_BASE_CABINET: { procurementMaterialCode: 'KIT-CAB-LOW-STD', preferredSupplierName: 'Suministros Dimaz Base', preferredUnitCost: 95 },
  MAT_KITCH_BASE_COUNTERTOP: { procurementMaterialCode: 'KIT-CTOP-STD', preferredSupplierName: 'Acabats Mediterrani', preferredUnitCost: 38 },
  MAT_KITCH_BASE_SINK: { procurementMaterialCode: 'KIT-SINK-STD', catalogReferenceUnitCost: 68 },
  MAT_KITCH_BASE_CONNECTIONS: { procurementMaterialCode: 'FON-TUB-PPR' },
  MAT_KITCH_COMPLETE_CABINET: { procurementMaterialCode: 'KIT-CAB-LOW-STD', preferredSupplierName: 'Suministros Dimaz Base', preferredUnitCost: 145 },
  MAT_KITCH_COMPLETE_COUNTERTOP: { procurementMaterialCode: 'KIT-CTOP-PLUS', preferredSupplierName: 'Acabats Mediterrani', preferredUnitCost: 56 },
  MAT_KITCH_COMPLETE_SINK: { procurementMaterialCode: 'KIT-SINK-STD', catalogReferenceUnitCost: 98 },
  MAT_KITCH_COMPLETE_APPLIANCE_PACK: { procurementMaterialCode: 'KIT-APP-BASIC', catalogReferenceUnitCost: 420 },
  MAT_KITCH_COMPLETE_CONNECTIONS: { procurementMaterialCode: 'FON-TUB-PPR' },
  MAT_KITCH_CABINET_LOW_STD: { procurementMaterialCode: 'KIT-CAB-LOW-STD', catalogReferenceUnitCost: 118 },
  MAT_KITCH_CABINET_HIGH_STD: { procurementMaterialCode: 'KIT-CAB-HIGH-STD', catalogReferenceUnitCost: 96 },
  MAT_KITCH_COUNTERTOP_STD: { procurementMaterialCode: 'KIT-CTOP-STD', catalogReferenceUnitCost: 42 },
  MAT_KITCH_COUNTERTOP_PLUS: { procurementMaterialCode: 'KIT-CTOP-PLUS', catalogReferenceUnitCost: 68 },
  MAT_KITCH_APPLIANCE_PACK_BASIC: { procurementMaterialCode: 'KIT-APP-BASIC', catalogReferenceUnitCost: 468 },
  MAT_KITCH_SINK_STD: { procurementMaterialCode: 'KIT-SINK-STD', catalogReferenceUnitCost: 92 },
  MAT_KITCH_TAPWARE_STD: { procurementMaterialCode: 'KIT-TAP-STD', catalogReferenceUnitCost: 74 },
  MAT_LEVELING_LIGHT_MORTAR: { parametricReferenceUnitCost: 8.5 },
  MAT_LEVELING_MEDIUM_MORTAR: { parametricReferenceUnitCost: 14.5 },
  MAT_COMMON_FLOOR_BASIC: { procurementMaterialCode: 'ACA-PORC' },
  MAT_COMMON_PAINT_BASIC: { procurementMaterialCode: 'PIN-PLA' },
  MAT_COMMON_LIGHTING_BASIC: { procurementMaterialCode: 'ELE-MEC' },
  MAT_COMMON_FLOOR_INTENSIVE: { procurementMaterialCode: 'ACA-PORC' },
  MAT_COMMON_PAINT_INTENSIVE: { procurementMaterialCode: 'PIN-PLA' },
  MAT_COMMON_LIGHTING_INTENSIVE: { procurementMaterialCode: 'ELE-MEC' },
  MAT_COMMON_PROTECTION_INTENSIVE: { parametricReferenceUnitCost: 18 },
  MAT_PARTITION_PLADUR_STD_FRAME: { catalogReferenceUnitCost: 8.4 },
  MAT_PARTITION_PLADUR_STD_BOARD: { catalogReferenceUnitCost: 5.8 },
  MAT_PARTITION_PLADUR_STD_FILL: { catalogReferenceUnitCost: 3.6 },
  MAT_PARTITION_PLADUR_AC_FRAME: { catalogReferenceUnitCost: 9.2 },
  MAT_PARTITION_PLADUR_AC_BOARD: { catalogReferenceUnitCost: 7.6 },
  MAT_PARTITION_PLADUR_AC_FILL: { catalogReferenceUnitCost: 5.4 },
  MAT_PARTITION_BRICK_STD_BLOCK: { catalogReferenceUnitCost: 12.5 },
  MAT_PARTITION_BRICK_STD_MORTAR: { parametricReferenceUnitCost: 10.8 },
  MAT_PARTITION_BLOCK_STD_BLOCK: { catalogReferenceUnitCost: 15.4 },
  MAT_PARTITION_BLOCK_STD_MORTAR: { parametricReferenceUnitCost: 11.6 },
  MAT_CEILING_CONT_STD_FRAME: { catalogReferenceUnitCost: 6.2 },
  MAT_CEILING_CONT_STD_BOARD: { catalogReferenceUnitCost: 5.4 },
  MAT_CEILING_CONT_INS_FRAME: { catalogReferenceUnitCost: 6.8 },
  MAT_CEILING_CONT_INS_BOARD: { catalogReferenceUnitCost: 5.9 },
  MAT_CEILING_CONT_INS_FILL: { catalogReferenceUnitCost: 4.1 },
  MAT_CEILING_GRID_MAIN: { catalogReferenceUnitCost: 8.9 },
  MAT_CEILING_GRID_TILE: { catalogReferenceUnitCost: 6.7 },
  MAT_FLOOR_TILE_STD: { procurementMaterialCode: 'ACA-PORC' },
  MAT_FLOOR_TILE_ADHESIVE: { parametricReferenceUnitCost: 8.8 },
  MAT_FLOOR_LAMINATE_STD: { catalogReferenceUnitCost: 19.8 },
  MAT_FLOOR_VINYL_STD: { catalogReferenceUnitCost: 21.2 },
  MAT_SKIRTING_STD: { catalogReferenceUnitCost: 4.8 },
  MAT_DOOR_INTERIOR_STD_SET: { catalogReferenceUnitCost: 145 },
  MAT_DOOR_INTERIOR_PLUS_SET: { catalogReferenceUnitCost: 228 },
  MAT_WINDOW_STD_SET: { catalogReferenceUnitCost: 310 },
  MAT_WINDOW_IMPROVED_SET: { catalogReferenceUnitCost: 445 },
  MAT_SHUTTER_STD_SET: { catalogReferenceUnitCost: 118 },
  MAT_ELECTRICAL_POINT_STD: { procurementMaterialCode: 'ELE-MEC' },
  MAT_LIGHTING_POINT_STD: { catalogReferenceUnitCost: 24 },
  MAT_PLUMBING_POINT_STD: { procurementMaterialCode: 'FON-TUB-PPR' },
  MAT_DRAINAGE_POINT_STD: { catalogReferenceUnitCost: 28 },
  MAT_WALL_TILE_BATH_STD: { procurementMaterialCode: 'ACA-WALL-STD', catalogReferenceUnitCost: 18.4 },
  MAT_WALL_TILE_BATH_PLUS: { procurementMaterialCode: 'ACA-WALL-PLUS', catalogReferenceUnitCost: 24.8 },
  MAT_WALL_TILE_KITCH_SPLASHBACK: { procurementMaterialCode: 'ACA-WALL-STD', catalogReferenceUnitCost: 19.2 },
  MAT_WALL_TILE_WET_PARTIAL: { procurementMaterialCode: 'ACA-WALL-WET-STD', catalogReferenceUnitCost: 21.4 },
  MAT_WALL_TILE_WET_FULL: { procurementMaterialCode: 'ACA-WALL-WET-PLUS', catalogReferenceUnitCost: 27.6 },
  MAT_PAINT_WALL_STD: { procurementMaterialCode: 'PIN-PLA', catalogReferenceUnitCost: 4.1 },
  MAT_PAINT_WALL_PLUS: { procurementMaterialCode: 'PIN-PLA-PLUS', catalogReferenceUnitCost: 5.4 },
  MAT_PAINT_CEILING_STD: { procurementMaterialCode: 'PIN-PLA', catalogReferenceUnitCost: 3.9 },
  MAT_WATERPROOFING_STD: { procurementMaterialCode: 'IMP-LIQ-STD', catalogReferenceUnitCost: 7.6 },
  MAT_WATERPROOFING_PLUS: { procurementMaterialCode: 'IMP-LIQ-PLUS', catalogReferenceUnitCost: 10.8 },
  MAT_PARTITION_LINING_FRAME: { procurementMaterialCode: 'PLADUR-FRAME-STD', catalogReferenceUnitCost: 7.8 },
  MAT_PARTITION_LINING_BOARD: { procurementMaterialCode: 'PLADUR-BOARD-STD', catalogReferenceUnitCost: 5.6 },
  MAT_PARTITION_LINING_FILL: { procurementMaterialCode: 'PLADUR-FILL-STD', catalogReferenceUnitCost: 3.8 },
  MAT_CEILING_CONT_PLUS_FRAME: { procurementMaterialCode: 'CEIL-FRAME-PLUS', catalogReferenceUnitCost: 7.2 },
  MAT_CEILING_CONT_PLUS_BOARD: { procurementMaterialCode: 'CEIL-BOARD-PLUS', catalogReferenceUnitCost: 6.4 },
  MAT_CEILING_CONT_PLUS_FILL: { procurementMaterialCode: 'CEIL-FILL-PLUS', catalogReferenceUnitCost: 4.3 },
  MAT_DOOR_SLIDING_STD_SET: { procurementMaterialCode: 'CARP-DOOR-SLI', catalogReferenceUnitCost: 285 },
  MAT_DOOR_RF_BASIC_SET: { procurementMaterialCode: 'CARP-DOOR-RF', catalogReferenceUnitCost: 365 },
  MAT_WINDOW_THERMAL_PLUS_SET: { procurementMaterialCode: 'WIN-THERM-PLUS', catalogReferenceUnitCost: 535 },
  MAT_ELECTRICAL_MECHANISMS_STD: { procurementMaterialCode: 'ELE-MECH-STD', catalogReferenceUnitCost: 12.8 },
  MAT_ELECTRICAL_PANEL_BASIC: { procurementMaterialCode: 'ELE-PANEL-BASIC', catalogReferenceUnitCost: 138 },
  MAT_PLUMBING_WET_ROOM_STD: { procurementMaterialCode: 'FON-WET-STD', catalogReferenceUnitCost: 34 },
  MAT_DRAINAGE_WET_ROOM_STD: { procurementMaterialCode: 'SAN-WET-STD', catalogReferenceUnitCost: 29 },
  MAT_PLUMBING_WET_ROOM_PLUS: { procurementMaterialCode: 'FON-WET-PLUS', catalogReferenceUnitCost: 44 },
  MAT_DRAINAGE_WET_ROOM_PLUS: { procurementMaterialCode: 'SAN-WET-PLUS', catalogReferenceUnitCost: 37 },
};

const LABOR_BINDINGS: Record<RecipeLaborCode, LaborBinding> = {
  LAB_ROOM_BASIC: { unit: 'h', parametricReferenceUnitCost: 28 },
  LAB_ROOM_PLUS: { unit: 'h', parametricReferenceUnitCost: 31 },
  LAB_BATH_COMPACT: { unit: 'h', parametricReferenceUnitCost: 30 },
  LAB_BATH_MEDIUM: { unit: 'h', parametricReferenceUnitCost: 32 },
  LAB_BATH_ADAPTED: { unit: 'h', parametricReferenceUnitCost: 34 },
  LAB_BATH_SHOWER_TRAY_STD: { unit: 'h', parametricReferenceUnitCost: 30 },
  LAB_BATH_BATHTUB_STD: { unit: 'h', parametricReferenceUnitCost: 32 },
  LAB_BATH_SCREEN_STD: { unit: 'h', parametricReferenceUnitCost: 29 },
  LAB_BATH_VANITY_STD: { unit: 'h', parametricReferenceUnitCost: 29 },
  LAB_BATH_TAPWARE_STD: { unit: 'h', parametricReferenceUnitCost: 30 },
  LAB_BATH_TAPWARE_PLUS: { unit: 'h', parametricReferenceUnitCost: 31 },
  LAB_KITCH_BASIC: { unit: 'h', parametricReferenceUnitCost: 29 },
  LAB_KITCH_COMPLETE: { unit: 'h', parametricReferenceUnitCost: 31 },
  LAB_KITCH_CABINET_LOW_STD: { unit: 'h', parametricReferenceUnitCost: 29 },
  LAB_KITCH_CABINET_HIGH_STD: { unit: 'h', parametricReferenceUnitCost: 30 },
  LAB_KITCH_COUNTERTOP_STD: { unit: 'h', parametricReferenceUnitCost: 28 },
  LAB_KITCH_COUNTERTOP_PLUS: { unit: 'h', parametricReferenceUnitCost: 30 },
  LAB_KITCH_APPLIANCE_PACK_BASIC: { unit: 'h', parametricReferenceUnitCost: 31 },
  LAB_KITCH_SINK_STD: { unit: 'h', parametricReferenceUnitCost: 29 },
  LAB_KITCH_TAPWARE_STD: { unit: 'h', parametricReferenceUnitCost: 29 },
  LAB_LEVELING_LIGHT: { unit: 'h', parametricReferenceUnitCost: 27 },
  LAB_LEVELING_MEDIUM: { unit: 'h', parametricReferenceUnitCost: 29 },
  LAB_COMMON_BASIC: { unit: 'h', parametricReferenceUnitCost: 27 },
  LAB_COMMON_INTENSIVE: { unit: 'h', parametricReferenceUnitCost: 30 },
  LAB_PARTITION_PLADUR_STD: { unit: 'h', parametricReferenceUnitCost: 28 },
  LAB_PARTITION_PLADUR_ACOUSTIC: { unit: 'h', parametricReferenceUnitCost: 30 },
  LAB_PARTITION_BRICK_STD: { unit: 'h', parametricReferenceUnitCost: 29 },
  LAB_PARTITION_BLOCK_STD: { unit: 'h', parametricReferenceUnitCost: 30 },
  LAB_CEILING_CONTINUOUS_STD: { unit: 'h', parametricReferenceUnitCost: 27 },
  LAB_CEILING_CONTINUOUS_INSULATED: { unit: 'h', parametricReferenceUnitCost: 29 },
  LAB_CEILING_SUSPENDED_GRID: { unit: 'h', parametricReferenceUnitCost: 28 },
  LAB_FLOOR_TILE_STD: { unit: 'h', parametricReferenceUnitCost: 28 },
  LAB_FLOOR_LAMINATE_STD: { unit: 'h', parametricReferenceUnitCost: 26 },
  LAB_FLOOR_VINYL_STD: { unit: 'h', parametricReferenceUnitCost: 25 },
  LAB_SKIRTING_STD: { unit: 'h', parametricReferenceUnitCost: 24 },
  LAB_DOOR_INTERIOR_STD: { unit: 'h', parametricReferenceUnitCost: 29 },
  LAB_DOOR_INTERIOR_PLUS: { unit: 'h', parametricReferenceUnitCost: 31 },
  LAB_WINDOW_STD: { unit: 'h', parametricReferenceUnitCost: 31 },
  LAB_WINDOW_IMPROVED: { unit: 'h', parametricReferenceUnitCost: 33 },
  LAB_SHUTTER_STD: { unit: 'h', parametricReferenceUnitCost: 28 },
  LAB_ELECTRICAL_POINT_STD: { unit: 'h', parametricReferenceUnitCost: 30 },
  LAB_LIGHTING_POINT_STD: { unit: 'h', parametricReferenceUnitCost: 27 },
  LAB_PLUMBING_POINT_STD: { unit: 'h', parametricReferenceUnitCost: 30 },
  LAB_DRAINAGE_POINT_STD: { unit: 'h', parametricReferenceUnitCost: 29 },
  LAB_WALL_TILE_BATH_STD: { unit: 'h', parametricReferenceUnitCost: 29 },
  LAB_WALL_TILE_BATH_PLUS: { unit: 'h', parametricReferenceUnitCost: 31 },
  LAB_WALL_TILE_KITCH_SPLASHBACK: { unit: 'h', parametricReferenceUnitCost: 28 },
  LAB_WALL_TILE_WET_PARTIAL: { unit: 'h', parametricReferenceUnitCost: 29 },
  LAB_WALL_TILE_WET_FULL: { unit: 'h', parametricReferenceUnitCost: 31 },
  LAB_PAINT_WALL_STD: { unit: 'h', parametricReferenceUnitCost: 24 },
  LAB_PAINT_WALL_PLUS: { unit: 'h', parametricReferenceUnitCost: 26 },
  LAB_PAINT_CEILING_STD: { unit: 'h', parametricReferenceUnitCost: 24 },
  LAB_WATERPROOFING_STD: { unit: 'h', parametricReferenceUnitCost: 28 },
  LAB_WATERPROOFING_PLUS: { unit: 'h', parametricReferenceUnitCost: 30 },
  LAB_PARTITION_LINING_STD: { unit: 'h', parametricReferenceUnitCost: 28 },
  LAB_CEILING_CONTINUOUS_PLUS: { unit: 'h', parametricReferenceUnitCost: 29 },
  LAB_DOOR_SLIDING_STD: { unit: 'h', parametricReferenceUnitCost: 31 },
  LAB_DOOR_RF_BASIC: { unit: 'h', parametricReferenceUnitCost: 33 },
  LAB_WINDOW_THERMAL_PLUS: { unit: 'h', parametricReferenceUnitCost: 34 },
  LAB_ELECTRICAL_MECHANISMS_STD: { unit: 'h', parametricReferenceUnitCost: 30 },
  LAB_ELECTRICAL_PANEL_BASIC: { unit: 'h', parametricReferenceUnitCost: 31 },
  LAB_PLUMBING_WET_ROOM_STD: { unit: 'h', parametricReferenceUnitCost: 31 },
  LAB_DRAINAGE_WET_ROOM_STD: { unit: 'h', parametricReferenceUnitCost: 30 },
  LAB_PLUMBING_WET_ROOM_PLUS: { unit: 'h', parametricReferenceUnitCost: 33 },
  LAB_DRAINAGE_WET_ROOM_PLUS: { unit: 'h', parametricReferenceUnitCost: 32 },
};

type OfferRecord = {
  id: string;
  supplierId: string;
  unitCost: number;
  unit: string;
  leadTimeDays: number | null;
  isPreferred: boolean | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  status?: string | null;
  supplier: { id: string; name: string; address?: string | null } | null;
};

type MaterialLookup = Record<
  string,
  {
    id: string;
    code: string;
    offers: OfferRecord[];
  }
>;

function isValidCost(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

async function loadMaterialLookup(): Promise<MaterialLookup> {
  const neededCodes = Array.from(
    new Set(
      Object.values(MATERIAL_BINDINGS)
        .map((binding) => binding.procurementMaterialCode)
        .filter((code): code is string => typeof code === 'string' && code.length > 0)
    )
  );

  const materials = await db.material.findMany({
    where: { code: { in: neededCodes } },
    include: {
      offers: {
        where: { status: 'ACTIVA', isActive: true },
        include: {
          supplier: {
            select: { id: true, name: true, address: true },
          },
        },
      },
    },
  });

  return Object.fromEntries(
    materials.map((material) => [
      material.code,
      {
        id: material.id,
        code: material.code,
        offers: material.offers.map((offer) => ({
          id: offer.id,
          supplierId: offer.supplierId,
          unitCost: offer.unitCost,
          unit: offer.unit,
          leadTimeDays: offer.leadTimeDays,
          isPreferred: offer.isPreferred,
          validFrom: offer.validFrom,
          validUntil: offer.validUntil,
          status: offer.status,
          supplier: offer.supplier ? { id: offer.supplier.id, name: offer.supplier.name, address: (offer.supplier as any).address || null } : null,
        })),
      },
    ])
  );
}

async function loadPreferredSuppliers() {
  const names = Array.from(
    new Set(
      Object.values(MATERIAL_BINDINGS)
        .map((binding) => binding.preferredSupplierName)
        .filter((name): name is string => typeof name === 'string' && name.length > 0)
    )
  );

  if (names.length === 0) return {} as Record<string, { id: string; name: string }>;

  const suppliers = await db.client.findMany({
    where: {
      category: 'PROVEEDOR',
      name: { in: names },
    },
    select: {
      id: true,
      name: true,
      address: true,
    },
  });

  return Object.fromEntries(suppliers.map((supplier) => [supplier.name, supplier]));
}

function round(value: number) {
  return Number(value.toFixed(2));
}

async function priceMaterial(
  material: RecipeLine['materials'][number],
  materialLookup: MaterialLookup,
  preferredSuppliers: Record<string, { id: string; name: string }>,
  executionContext: ExecutionContext,
  options: PricingEngineOptions
): Promise<PricingMaterial> {
  const sourcingPolicy = mergeProjectSourcingPolicy(
    createDefaultProjectSourcingPolicy(executionContext),
    options.sourcingPolicyOverride,
  );

  const manual = options.manualOverrides?.materials?.[material.materialCode];
  if (manual && isValidCost(manual.unitCost)) {
    return {
      materialCode: material.materialCode,
      quantity: material.quantity,
      unit: material.unit,
      procurementMaterialCode: MATERIAL_BINDINGS[material.materialCode]?.procurementMaterialCode || null,
      supplierId: manual.supplierId,
      supplierOfferId: manual.supplierOfferId,
      unitCost: round(manual.unitCost),
      totalCost: round(material.quantity * manual.unitCost),
      currency: 'EUR',
      priceStatus: 'PRICE_CONFIRMED',
      priceSource: 'MANUAL_OVERRIDE',
      sourcingFamily: undefined,
      sourcingStrategy: sourcingPolicy.strategy,
      sourcingReason: 'Precio confirmado mediante override manual.',
      candidateOfferCount: 0,
      eligibleOfferCount: 0,
      selectionReasonCode: 'SELECTION_MANUAL_OVERRIDE',
      filterReasonCodes: [],
      selectedOffer: null,
      candidateOffersSummary: [],
      eligibleOffersSummary: [],
      discardedOffersSummary: [],
      sourcingPolicySnapshotApplied: sourcingPolicy,
      supplierName: null,
      leadTimeDays: null,
    };
  }

  const binding = MATERIAL_BINDINGS[material.materialCode];
  if (!binding) {
    return {
      materialCode: material.materialCode,
      quantity: material.quantity,
      unit: material.unit,
      procurementMaterialCode: null,
      unitCost: null,
      totalCost: null,
      currency: 'EUR',
      priceStatus: 'PRICE_PENDING_VALIDATION',
      priceSource: 'MISSING',
      sourcingFamily: undefined,
      sourcingStrategy: sourcingPolicy.strategy,
      sourcingReason: 'Material sin binding de pricing.',
      candidateOfferCount: 0,
      eligibleOfferCount: 0,
      selectionReasonCode: 'SELECTION_MISSING',
      filterReasonCodes: [],
      selectedOffer: null,
      candidateOffersSummary: [],
      eligibleOffersSummary: [],
      discardedOffersSummary: [],
      sourcingPolicySnapshotApplied: sourcingPolicy,
      supplierName: null,
      leadTimeDays: null,
    };
  }

  const resolution = resolveRecipeMaterialSourcing({
    materialCode: material.materialCode,
    binding,
    materialLookup: binding.procurementMaterialCode
      ? materialLookup[binding.procurementMaterialCode]
      : null,
    preferredSuppliers,
    policy: sourcingPolicy,
    referenceDate: options.referenceDate || new Date(),
  });

  return {
    materialCode: material.materialCode,
    quantity: material.quantity,
    unit: material.unit,
    procurementMaterialCode: resolution.procurementMaterialCode || null,
    sourcingFamily: resolution.sourcingFamily,
    sourcingStrategy: resolution.strategyUsed,
    sourcingReason: resolution.reason,
    candidateOfferCount: resolution.candidateOfferCount,
    eligibleOfferCount: resolution.eligibleOfferCount,
    selectionReasonCode: resolution.selectionReasonCode,
    filterReasonCodes: resolution.filterReasonCodes,
    selectedOffer: resolution.selectedOffer || null,
    candidateOffersSummary: resolution.candidateOffersSummary,
    eligibleOffersSummary: resolution.eligibleOffersSummary,
    discardedOffersSummary: resolution.discardedOffersSummary,
    sourcingPolicySnapshotApplied: resolution.sourcingPolicySnapshotApplied,
    supplierId: resolution.supplierId,
    supplierName: resolution.supplierName || null,
    supplierOfferId: resolution.supplierOfferId,
    leadTimeDays: resolution.leadTimeDays ?? null,
    unitCost: isValidCost(resolution.unitCost) ? round(resolution.unitCost!) : null,
    totalCost: isValidCost(resolution.unitCost) ? round(material.quantity * resolution.unitCost!) : null,
    currency: 'EUR',
    priceStatus: resolution.priceStatus,
    priceSource: resolution.priceSource,
  };
}

function priceLabor(
  labor: RecipeLine['labor'][number],
  options: PricingEngineOptions
): PricingLabor {
  const manual = options.manualOverrides?.labor?.[labor.laborCode];
  if (manual && isValidCost(manual.unitCost)) {
    return {
      laborCode: labor.laborCode,
      quantity: labor.quantity,
      unit: labor.unit,
      unitCost: round(manual.unitCost),
      totalCost: round(labor.quantity * manual.unitCost),
      currency: 'EUR',
      priceStatus: 'PRICE_CONFIRMED',
      priceSource: 'MANUAL_OVERRIDE',
    };
  }

  const binding = LABOR_BINDINGS[labor.laborCode];
  if (!binding) {
    return {
      laborCode: labor.laborCode,
      quantity: labor.quantity,
      unit: labor.unit,
      unitCost: null,
      totalCost: null,
      currency: 'EUR',
      priceStatus: 'PRICE_PENDING_VALIDATION',
      priceSource: 'MISSING',
    };
  }

  if (isValidCost(binding.catalogReferenceUnitCost)) {
    return {
      laborCode: labor.laborCode,
      quantity: labor.quantity,
      unit: labor.unit,
      unitCost: round(binding.catalogReferenceUnitCost!),
      totalCost: round(labor.quantity * binding.catalogReferenceUnitCost!),
      currency: 'EUR',
      priceStatus: 'PRICE_INFERRED',
      priceSource: 'CATALOG_REFERENCE',
    };
  }

  if (isValidCost(binding.parametricReferenceUnitCost)) {
    return {
      laborCode: labor.laborCode,
      quantity: labor.quantity,
      unit: labor.unit,
      unitCost: round(binding.parametricReferenceUnitCost!),
      totalCost: round(labor.quantity * binding.parametricReferenceUnitCost!),
      currency: 'EUR',
      priceStatus: 'PRICE_INFERRED',
      priceSource: 'PARAMETRIC_REFERENCE',
    };
  }

  return {
    laborCode: labor.laborCode,
    quantity: labor.quantity,
    unit: labor.unit,
    unitCost: null,
    totalCost: null,
    currency: 'EUR',
    priceStatus: 'PRICE_PENDING_VALIDATION',
    priceSource: 'MISSING',
  };
}

function deriveLineStatus(
  recipeLine: RecipeLine,
  materials: PricingMaterial[],
  labor: PricingLabor[]
): PriceStatus {
  if (recipeLine.status === 'RECIPE_MISSING') return 'PRICE_PENDING_VALIDATION';
  const components = [...materials, ...labor];
  if (components.length === 0) return 'PRICE_PENDING_VALIDATION';
  if (components.some((item) => item.priceStatus === 'PRICE_PENDING_VALIDATION')) {
    return 'PRICE_PENDING_VALIDATION';
  }
  if (components.every((item) => item.priceStatus === 'PRICE_CONFIRMED')) {
    return 'PRICE_CONFIRMED';
  }
  return 'PRICE_INFERRED';
}

export async function buildPricingResult(
  recipeResult: RecipeResult | undefined,
  executionContext: ExecutionContext,
  options: PricingEngineOptions = {}
): Promise<PricingResult> {
  const sourcingPolicy = mergeProjectSourcingPolicy(
    createDefaultProjectSourcingPolicy(executionContext),
    options.sourcingPolicyOverride,
  );

  if (!recipeResult) {
    return {
      status: 'BLOCKED',
      lines: [],
      sourcingPolicy,
      coverage: {
        confirmedLines: 0,
        inferredLines: 0,
        pendingLines: 0,
        priceCoveragePercent: 0,
        pendingValidationCount: 0,
        supplierOfferLines: 0,
        preferredSupplierLines: 0,
        catalogReferenceLines: 0,
        parametricReferenceLines: 0,
        missingLines: 0,
      },
      estimateMode: deriveEstimateModeFromPricing({
        technicalSpecStatus: 'INCOMPLETE',
        recipeCoveragePercent: 0,
        priceCoveragePercent: 0,
        pendingValidationCount: 0,
      }),
      warnings: ['No existe RecipeResult para construir pricing.'],
      assumptions: [],
    };
  }

  let materialLookup: MaterialLookup;
  let preferredSuppliers: Record<string, { id: string; name: string }>;

  if (options.materialLookupOverride) {
    materialLookup = options.materialLookupOverride as MaterialLookup;
    preferredSuppliers = options.preferredSuppliersOverride || {};
  } else {
    try {
      await ensureProcurementCatalog();
    } catch (error) {
      console.warn('Pricing engine could not refresh procurement catalog, continuing with existing data.', error);
    }
    materialLookup = await loadMaterialLookup();
    preferredSuppliers = options.preferredSuppliersOverride || (await loadPreferredSuppliers());
  }

  const warnings = [...recipeResult.warnings];
  const assumptions = [...recipeResult.assumptions];
  const lines = await Promise.all(
    recipeResult.lines.map(async (recipeLine) => {
      const materialPricing = await Promise.all(
        recipeLine.materials.map((material) =>
          priceMaterial(material, materialLookup, preferredSuppliers, executionContext, {
            ...options,
            sourcingPolicyOverride: sourcingPolicy,
          })
        )
      );
      const laborPricing = recipeLine.labor.map((labor) => priceLabor(labor, options));
      const priceStatus = deriveLineStatus(recipeLine, materialPricing, laborPricing);

      const materialCostKnown = materialPricing.every((item) => isValidCost(item.totalCost));
      const laborCostKnown = laborPricing.every((item) => isValidCost(item.totalCost));
      const materialCost =
        materialPricing.length === 0
          ? 0
          : materialCostKnown
            ? round(materialPricing.reduce((sum, item) => sum + (item.totalCost || 0), 0))
            : null;
      const laborCost =
        laborPricing.length === 0
          ? 0
          : laborCostKnown
            ? round(laborPricing.reduce((sum, item) => sum + (item.totalCost || 0), 0))
            : null;

      const subtotalKnown = isValidCost(materialCost) && isValidCost(laborCost);
      const indirectCost =
        subtotalKnown && recipeLine.indirectFactor
          ? round((materialCost! + laborCost!) * recipeLine.indirectFactor)
          : subtotalKnown
            ? 0
            : null;
      const totalCost =
        priceStatus === 'PRICE_PENDING_VALIDATION' || !subtotalKnown || !isValidCost(indirectCost)
          ? null
          : round(materialCost! + laborCost! + indirectCost!);

      if (priceStatus === 'PRICE_PENDING_VALIDATION') {
        warnings.push(`Pricing pendiente de validar para ${recipeLine.recipeCode} en ${recipeLine.spaceId}.`);
      }
      if (priceStatus === 'PRICE_INFERRED') {
        assumptions.push(`Pricing inferido para ${recipeLine.recipeCode} en ${recipeLine.spaceId}.`);
      }

      return {
        id: `${recipeLine.id}:pricing`,
        spaceId: recipeLine.spaceId,
        solutionCode: recipeLine.solutionCode,
        recipeLineId: recipeLine.id,
        materialPricing,
        laborPricing,
        materialCost,
        laborCost,
        indirectCost,
        totalCost,
        priceStatus,
        assumedFields: recipeLine.assumedFields,
      };
    })
  );

  const confirmedLines = lines.filter((line) => line.priceStatus === 'PRICE_CONFIRMED').length;
  const inferredLines = lines.filter((line) => line.priceStatus === 'PRICE_INFERRED').length;
  const pendingLines = lines.filter((line) => line.priceStatus === 'PRICE_PENDING_VALIDATION').length;
  const allMaterialPricing = lines.flatMap((line) => line.materialPricing);
  const priceCoveragePercent =
    lines.length === 0 ? 0 : Math.round(((confirmedLines + inferredLines) / lines.length) * 100);
  const pendingValidationCount = pendingLines;
  const status =
    lines.length === 0 || pendingLines === lines.length
      ? 'BLOCKED'
      : pendingLines > 0
        ? 'PARTIAL'
        : 'READY';

  return {
    status,
    lines,
    sourcingPolicy,
    coverage: {
      confirmedLines,
      inferredLines,
      pendingLines,
      priceCoveragePercent,
      pendingValidationCount,
      supplierOfferLines: lines.filter((line) => line.materialPricing.some((item) => item.priceSource === 'SUPPLIER_OFFER')).length,
      preferredSupplierLines: lines.filter((line) => line.materialPricing.some((item) => item.priceSource === 'PREFERRED_SUPPLIER')).length,
      catalogReferenceLines: lines.filter((line) => line.materialPricing.some((item) => item.priceSource === 'CATALOG_REFERENCE')).length,
      parametricReferenceLines: lines.filter((line) => line.materialPricing.some((item) => item.priceSource === 'PARAMETRIC_REFERENCE')).length,
      missingLines: allMaterialPricing.filter((item) => item.priceSource === 'MISSING').length,
    },
    estimateMode: deriveEstimateModeFromPricing({
      technicalSpecStatus: executionContext.project.technicalSpecStatus || 'INCOMPLETE',
      recipeCoveragePercent: recipeResult.coverage.recipeCoveragePercent,
      priceCoveragePercent,
      pendingValidationCount,
    }),
    warnings: Array.from(new Set(warnings)),
    assumptions: Array.from(new Set(assumptions)),
  };
}

export { MATERIAL_BINDINGS, LABOR_BINDINGS };
