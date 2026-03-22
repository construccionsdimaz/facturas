import type { ExecutionContext, ResolvedSpace } from '@/lib/discovery/types';
import type { VerticalSolutionCode } from '@/lib/discovery/technical-spec-types';
import type { MeasurementLine } from './measurement-types';
import type { RecipeLaborCode, RecipeLine } from './recipe-types';
import {
  resolveProductivityPolicyForSolution,
  type ProjectProductivityPolicy,
  type ProductivityPolicyApplication,
  type ProductivityFamilyCode,
} from './project-productivity-policy';

export const LABOR_TRADE_CODE_CATALOG = [
  'OFICIO_ALBANIL',
  'OFICIO_PLADUR',
  'OFICIO_PINTOR',
  'OFICIO_ELECTRICISTA',
  'OFICIO_FONTANERO',
  'OFICIO_CARPINTERO',
  'OFICIO_SOLADOR',
  'OFICIO_TECNICO_MULTI',
] as const;

export type LaborTradeCode = (typeof LABOR_TRADE_CODE_CATALOG)[number];

export const CREW_CODE_CATALOG = [
  'CREW_PARTITIONS_STD',
  'CREW_CEILINGS_STD',
  'CREW_FLOORING_STD',
  'CREW_TILING_WET_STD',
  'CREW_PAINT_STD',
  'CREW_CARPENTRY_STD',
  'CREW_ELECTRICAL_BASIC',
  'CREW_PLUMBING_WET',
  'CREW_KITCHENETTE_INSTALL',
  'CREW_GENERAL_INTERIORS',
] as const;

export type CrewCode = (typeof CREW_CODE_CATALOG)[number];

export type ProductivityFactorCode =
  | 'ACCESS_RESTRICTED'
  | 'ACCESS_COMPLEX'
  | 'OCCUPIED_SITE'
  | 'HIGH_COMPLEXITY'
  | 'MEDIUM_HIGH_COMPLEXITY'
  | 'WET_CONSTRAINED_SPACE'
  | 'MULTI_FLOOR_LOGISTICS'
  | 'FALLBACK_REFERENCE';

export type ProductivitySource = 'PROFILE' | 'REFERENCE' | 'FALLBACK';

export type LaborProductivityFactor = {
  code: ProductivityFactorCode;
  multiplier: number;
  reason: string;
};

export type ProductivityProfile = {
  profileCode: string;
  tradeCode: LaborTradeCode;
  crewCode: CrewCode;
  baseUnit: 'm2' | 'ml' | 'ud' | 'pt' | 'lot';
  baseOutputPerDay: number;
  baseHoursPerUnit: number;
  crewSize: number;
};

export type LaborProductivityResolution = {
  tradeCode: LaborTradeCode;
  crewCode: CrewCode;
  productivityProfileCode: string;
  baseUnit: ProductivityProfile['baseUnit'];
  baseOutputPerDay: number;
  baseHoursPerUnit: number;
  adjustedHoursPerUnit: number;
  adjustedQuantity: number;
  adjustedCrewDays: number;
  source: ProductivitySource;
  factors: LaborProductivityFactor[];
  assumptions: string[];
  policySource: 'DEFAULT' | 'PROJECT_OVERRIDE';
  policyFamilyCode: ProductivityFamilyCode;
  appliedPolicyOverrides: string[];
};

type ProfileSeed = Omit<ProductivityProfile, 'profileCode'>;

const PROFILE_BY_LABOR: Record<RecipeLaborCode, ProfileSeed> = {
  LAB_ROOM_BASIC: { tradeCode: 'OFICIO_TECNICO_MULTI', crewCode: 'CREW_GENERAL_INTERIORS', baseUnit: 'm2', baseOutputPerDay: 17.8, baseHoursPerUnit: 0.45, crewSize: 1 },
  LAB_ROOM_PLUS: { tradeCode: 'OFICIO_TECNICO_MULTI', crewCode: 'CREW_GENERAL_INTERIORS', baseUnit: 'm2', baseOutputPerDay: 13.3, baseHoursPerUnit: 0.6, crewSize: 1 },
  LAB_BATH_COMPACT: { tradeCode: 'OFICIO_FONTANERO', crewCode: 'CREW_PLUMBING_WET', baseUnit: 'm2', baseOutputPerDay: 6.4, baseHoursPerUnit: 1.25, crewSize: 1 },
  LAB_BATH_MEDIUM: { tradeCode: 'OFICIO_FONTANERO', crewCode: 'CREW_PLUMBING_WET', baseUnit: 'm2', baseOutputPerDay: 5.5, baseHoursPerUnit: 1.45, crewSize: 1 },
  LAB_BATH_ADAPTED: { tradeCode: 'OFICIO_FONTANERO', crewCode: 'CREW_PLUMBING_WET', baseUnit: 'm2', baseOutputPerDay: 4.7, baseHoursPerUnit: 1.7, crewSize: 1 },
  LAB_BATH_SHOWER_TRAY_STD: { tradeCode: 'OFICIO_FONTANERO', crewCode: 'CREW_PLUMBING_WET', baseUnit: 'ud', baseOutputPerDay: 7.3, baseHoursPerUnit: 1.1, crewSize: 1 },
  LAB_BATH_BATHTUB_STD: { tradeCode: 'OFICIO_FONTANERO', crewCode: 'CREW_PLUMBING_WET', baseUnit: 'ud', baseOutputPerDay: 5.5, baseHoursPerUnit: 1.45, crewSize: 1 },
  LAB_BATH_SCREEN_STD: { tradeCode: 'OFICIO_CARPINTERO', crewCode: 'CREW_CARPENTRY_STD', baseUnit: 'ud', baseOutputPerDay: 12.3, baseHoursPerUnit: 0.65, crewSize: 1 },
  LAB_BATH_VANITY_STD: { tradeCode: 'OFICIO_CARPINTERO', crewCode: 'CREW_CARPENTRY_STD', baseUnit: 'ud', baseOutputPerDay: 11.1, baseHoursPerUnit: 0.72, crewSize: 1 },
  LAB_BATH_TAPWARE_STD: { tradeCode: 'OFICIO_FONTANERO', crewCode: 'CREW_PLUMBING_WET', baseUnit: 'ud', baseOutputPerDay: 19, baseHoursPerUnit: 0.42, crewSize: 1 },
  LAB_BATH_TAPWARE_PLUS: { tradeCode: 'OFICIO_FONTANERO', crewCode: 'CREW_PLUMBING_WET', baseUnit: 'ud', baseOutputPerDay: 17.4, baseHoursPerUnit: 0.46, crewSize: 1 },
  LAB_KITCH_BASIC: { tradeCode: 'OFICIO_CARPINTERO', crewCode: 'CREW_KITCHENETTE_INSTALL', baseUnit: 'ml', baseOutputPerDay: 7, baseHoursPerUnit: 1.15, crewSize: 1 },
  LAB_KITCH_COMPLETE: { tradeCode: 'OFICIO_CARPINTERO', crewCode: 'CREW_KITCHENETTE_INSTALL', baseUnit: 'ml', baseOutputPerDay: 5.5, baseHoursPerUnit: 1.45, crewSize: 1 },
  LAB_KITCH_CABINET_LOW_STD: { tradeCode: 'OFICIO_CARPINTERO', crewCode: 'CREW_KITCHENETTE_INSTALL', baseUnit: 'ml', baseOutputPerDay: 11.8, baseHoursPerUnit: 0.68, crewSize: 1 },
  LAB_KITCH_CABINET_HIGH_STD: { tradeCode: 'OFICIO_CARPINTERO', crewCode: 'CREW_KITCHENETTE_INSTALL', baseUnit: 'ml', baseOutputPerDay: 10.8, baseHoursPerUnit: 0.74, crewSize: 1 },
  LAB_KITCH_COUNTERTOP_STD: { tradeCode: 'OFICIO_CARPINTERO', crewCode: 'CREW_KITCHENETTE_INSTALL', baseUnit: 'ml', baseOutputPerDay: 22.2, baseHoursPerUnit: 0.36, crewSize: 1 },
  LAB_KITCH_COUNTERTOP_PLUS: { tradeCode: 'OFICIO_CARPINTERO', crewCode: 'CREW_KITCHENETTE_INSTALL', baseUnit: 'ml', baseOutputPerDay: 20, baseHoursPerUnit: 0.4, crewSize: 1 },
  LAB_KITCH_APPLIANCE_PACK_BASIC: { tradeCode: 'OFICIO_TECNICO_MULTI', crewCode: 'CREW_KITCHENETTE_INSTALL', baseUnit: 'ud', baseOutputPerDay: 10, baseHoursPerUnit: 0.8, crewSize: 1 },
  LAB_KITCH_SINK_STD: { tradeCode: 'OFICIO_FONTANERO', crewCode: 'CREW_PLUMBING_WET', baseUnit: 'ud', baseOutputPerDay: 11.4, baseHoursPerUnit: 0.7, crewSize: 1 },
  LAB_KITCH_TAPWARE_STD: { tradeCode: 'OFICIO_FONTANERO', crewCode: 'CREW_PLUMBING_WET', baseUnit: 'ud', baseOutputPerDay: 19, baseHoursPerUnit: 0.42, crewSize: 1 },
  LAB_LEVELING_LIGHT: { tradeCode: 'OFICIO_ALBANIL', crewCode: 'CREW_FLOORING_STD', baseUnit: 'm2', baseOutputPerDay: 29.6, baseHoursPerUnit: 0.27, crewSize: 1 },
  LAB_LEVELING_MEDIUM: { tradeCode: 'OFICIO_ALBANIL', crewCode: 'CREW_FLOORING_STD', baseUnit: 'm2', baseOutputPerDay: 27.6, baseHoursPerUnit: 0.29, crewSize: 1 },
  LAB_COMMON_BASIC: { tradeCode: 'OFICIO_TECNICO_MULTI', crewCode: 'CREW_GENERAL_INTERIORS', baseUnit: 'm2', baseOutputPerDay: 29.6, baseHoursPerUnit: 0.27, crewSize: 1 },
  LAB_COMMON_INTENSIVE: { tradeCode: 'OFICIO_TECNICO_MULTI', crewCode: 'CREW_GENERAL_INTERIORS', baseUnit: 'm2', baseOutputPerDay: 26.7, baseHoursPerUnit: 0.3, crewSize: 1 },
  LAB_PARTITION_PLADUR_STD: { tradeCode: 'OFICIO_PLADUR', crewCode: 'CREW_PARTITIONS_STD', baseUnit: 'm2', baseOutputPerDay: 14.3, baseHoursPerUnit: 0.56, crewSize: 2 },
  LAB_PARTITION_PLADUR_ACOUSTIC: { tradeCode: 'OFICIO_PLADUR', crewCode: 'CREW_PARTITIONS_STD', baseUnit: 'm2', baseOutputPerDay: 12.5, baseHoursPerUnit: 0.64, crewSize: 2 },
  LAB_PARTITION_BRICK_STD: { tradeCode: 'OFICIO_ALBANIL', crewCode: 'CREW_PARTITIONS_STD', baseUnit: 'm2', baseOutputPerDay: 12, baseHoursPerUnit: 0.67, crewSize: 2 },
  LAB_PARTITION_BLOCK_STD: { tradeCode: 'OFICIO_ALBANIL', crewCode: 'CREW_PARTITIONS_STD', baseUnit: 'm2', baseOutputPerDay: 10.7, baseHoursPerUnit: 0.75, crewSize: 2 },
  LAB_CEILING_CONTINUOUS_STD: { tradeCode: 'OFICIO_PLADUR', crewCode: 'CREW_CEILINGS_STD', baseUnit: 'm2', baseOutputPerDay: 14.8, baseHoursPerUnit: 0.54, crewSize: 2 },
  LAB_CEILING_CONTINUOUS_INSULATED: { tradeCode: 'OFICIO_PLADUR', crewCode: 'CREW_CEILINGS_STD', baseUnit: 'm2', baseOutputPerDay: 13.8, baseHoursPerUnit: 0.58, crewSize: 2 },
  LAB_CEILING_SUSPENDED_GRID: { tradeCode: 'OFICIO_PLADUR', crewCode: 'CREW_CEILINGS_STD', baseUnit: 'm2', baseOutputPerDay: 14.3, baseHoursPerUnit: 0.56, crewSize: 2 },
  LAB_FLOOR_TILE_STD: { tradeCode: 'OFICIO_SOLADOR', crewCode: 'CREW_FLOORING_STD', baseUnit: 'm2', baseOutputPerDay: 14.3, baseHoursPerUnit: 0.56, crewSize: 2 },
  LAB_FLOOR_LAMINATE_STD: { tradeCode: 'OFICIO_SOLADOR', crewCode: 'CREW_FLOORING_STD', baseUnit: 'm2', baseOutputPerDay: 15.4, baseHoursPerUnit: 0.52, crewSize: 2 },
  LAB_FLOOR_VINYL_STD: { tradeCode: 'OFICIO_SOLADOR', crewCode: 'CREW_FLOORING_STD', baseUnit: 'm2', baseOutputPerDay: 16, baseHoursPerUnit: 0.5, crewSize: 2 },
  LAB_SKIRTING_STD: { tradeCode: 'OFICIO_SOLADOR', crewCode: 'CREW_FLOORING_STD', baseUnit: 'ml', baseOutputPerDay: 20, baseHoursPerUnit: 0.4, crewSize: 1 },
  LAB_DOOR_INTERIOR_STD: { tradeCode: 'OFICIO_CARPINTERO', crewCode: 'CREW_CARPENTRY_STD', baseUnit: 'ud', baseOutputPerDay: 5.9, baseHoursPerUnit: 1.35, crewSize: 1 },
  LAB_DOOR_INTERIOR_PLUS: { tradeCode: 'OFICIO_CARPINTERO', crewCode: 'CREW_CARPENTRY_STD', baseUnit: 'ud', baseOutputPerDay: 5.9, baseHoursPerUnit: 1.35, crewSize: 1 },
  LAB_WINDOW_STD: { tradeCode: 'OFICIO_CARPINTERO', crewCode: 'CREW_CARPENTRY_STD', baseUnit: 'ud', baseOutputPerDay: 4.4, baseHoursPerUnit: 1.8, crewSize: 1 },
  LAB_WINDOW_IMPROVED: { tradeCode: 'OFICIO_CARPINTERO', crewCode: 'CREW_CARPENTRY_STD', baseUnit: 'ud', baseOutputPerDay: 3.8, baseHoursPerUnit: 2.1, crewSize: 1 },
  LAB_SHUTTER_STD: { tradeCode: 'OFICIO_CARPINTERO', crewCode: 'CREW_CARPENTRY_STD', baseUnit: 'ud', baseOutputPerDay: 8.4, baseHoursPerUnit: 0.95, crewSize: 1 },
  LAB_ELECTRICAL_POINT_STD: { tradeCode: 'OFICIO_ELECTRICISTA', crewCode: 'CREW_ELECTRICAL_BASIC', baseUnit: 'pt', baseOutputPerDay: 22.9, baseHoursPerUnit: 0.35, crewSize: 1 },
  LAB_LIGHTING_POINT_STD: { tradeCode: 'OFICIO_ELECTRICISTA', crewCode: 'CREW_ELECTRICAL_BASIC', baseUnit: 'pt', baseOutputPerDay: 32, baseHoursPerUnit: 0.25, crewSize: 1 },
  LAB_PLUMBING_POINT_STD: { tradeCode: 'OFICIO_FONTANERO', crewCode: 'CREW_PLUMBING_WET', baseUnit: 'pt', baseOutputPerDay: 19, baseHoursPerUnit: 0.42, crewSize: 1 },
  LAB_DRAINAGE_POINT_STD: { tradeCode: 'OFICIO_FONTANERO', crewCode: 'CREW_PLUMBING_WET', baseUnit: 'pt', baseOutputPerDay: 21.1, baseHoursPerUnit: 0.38, crewSize: 1 },
  LAB_WALL_TILE_BATH_STD: { tradeCode: 'OFICIO_SOLADOR', crewCode: 'CREW_TILING_WET_STD', baseUnit: 'm2', baseOutputPerDay: 12.9, baseHoursPerUnit: 0.62, crewSize: 2 },
  LAB_WALL_TILE_BATH_PLUS: { tradeCode: 'OFICIO_SOLADOR', crewCode: 'CREW_TILING_WET_STD', baseUnit: 'm2', baseOutputPerDay: 11.4, baseHoursPerUnit: 0.7, crewSize: 2 },
  LAB_WALL_TILE_KITCH_SPLASHBACK: { tradeCode: 'OFICIO_SOLADOR', crewCode: 'CREW_TILING_WET_STD', baseUnit: 'm2', baseOutputPerDay: 14.5, baseHoursPerUnit: 0.55, crewSize: 2 },
  LAB_WALL_TILE_WET_PARTIAL: { tradeCode: 'OFICIO_SOLADOR', crewCode: 'CREW_TILING_WET_STD', baseUnit: 'm2', baseOutputPerDay: 13.8, baseHoursPerUnit: 0.58, crewSize: 2 },
  LAB_WALL_TILE_WET_FULL: { tradeCode: 'OFICIO_SOLADOR', crewCode: 'CREW_TILING_WET_STD', baseUnit: 'm2', baseOutputPerDay: 11.8, baseHoursPerUnit: 0.68, crewSize: 2 },
  LAB_PAINT_WALL_STD: { tradeCode: 'OFICIO_PINTOR', crewCode: 'CREW_PAINT_STD', baseUnit: 'm2', baseOutputPerDay: 44.4, baseHoursPerUnit: 0.18, crewSize: 1 },
  LAB_PAINT_WALL_PLUS: { tradeCode: 'OFICIO_PINTOR', crewCode: 'CREW_PAINT_STD', baseUnit: 'm2', baseOutputPerDay: 38.1, baseHoursPerUnit: 0.21, crewSize: 1 },
  LAB_PAINT_CEILING_STD: { tradeCode: 'OFICIO_PINTOR', crewCode: 'CREW_PAINT_STD', baseUnit: 'm2', baseOutputPerDay: 50, baseHoursPerUnit: 0.16, crewSize: 1 },
  LAB_WATERPROOFING_STD: { tradeCode: 'OFICIO_ALBANIL', crewCode: 'CREW_TILING_WET_STD', baseUnit: 'm2', baseOutputPerDay: 33.3, baseHoursPerUnit: 0.24, crewSize: 1 },
  LAB_WATERPROOFING_PLUS: { tradeCode: 'OFICIO_ALBANIL', crewCode: 'CREW_TILING_WET_STD', baseUnit: 'm2', baseOutputPerDay: 27.6, baseHoursPerUnit: 0.29, crewSize: 1 },
  LAB_PARTITION_LINING_STD: { tradeCode: 'OFICIO_PLADUR', crewCode: 'CREW_PARTITIONS_STD', baseUnit: 'm2', baseOutputPerDay: 19, baseHoursPerUnit: 0.42, crewSize: 2 },
  LAB_CEILING_CONTINUOUS_PLUS: { tradeCode: 'OFICIO_PLADUR', crewCode: 'CREW_CEILINGS_STD', baseUnit: 'm2', baseOutputPerDay: 18.2, baseHoursPerUnit: 0.44, crewSize: 2 },
  LAB_DOOR_SLIDING_STD: { tradeCode: 'OFICIO_CARPINTERO', crewCode: 'CREW_CARPENTRY_STD', baseUnit: 'ud', baseOutputPerDay: 3.6, baseHoursPerUnit: 2.2, crewSize: 1 },
  LAB_DOOR_RF_BASIC: { tradeCode: 'OFICIO_CARPINTERO', crewCode: 'CREW_CARPENTRY_STD', baseUnit: 'ud', baseOutputPerDay: 3.3, baseHoursPerUnit: 2.4, crewSize: 1 },
  LAB_WINDOW_THERMAL_PLUS: { tradeCode: 'OFICIO_CARPINTERO', crewCode: 'CREW_CARPENTRY_STD', baseUnit: 'ud', baseOutputPerDay: 3.5, baseHoursPerUnit: 2.3, crewSize: 1 },
  LAB_ELECTRICAL_MECHANISMS_STD: { tradeCode: 'OFICIO_ELECTRICISTA', crewCode: 'CREW_ELECTRICAL_BASIC', baseUnit: 'pt', baseOutputPerDay: 44.4, baseHoursPerUnit: 0.18, crewSize: 1 },
  LAB_ELECTRICAL_PANEL_BASIC: { tradeCode: 'OFICIO_ELECTRICISTA', crewCode: 'CREW_ELECTRICAL_BASIC', baseUnit: 'ud', baseOutputPerDay: 5.7, baseHoursPerUnit: 1.4, crewSize: 1 },
  LAB_PLUMBING_WET_ROOM_STD: { tradeCode: 'OFICIO_FONTANERO', crewCode: 'CREW_PLUMBING_WET', baseUnit: 'pt', baseOutputPerDay: 16.7, baseHoursPerUnit: 0.48, crewSize: 1 },
  LAB_DRAINAGE_WET_ROOM_STD: { tradeCode: 'OFICIO_FONTANERO', crewCode: 'CREW_PLUMBING_WET', baseUnit: 'pt', baseOutputPerDay: 18.2, baseHoursPerUnit: 0.44, crewSize: 1 },
  LAB_PLUMBING_WET_ROOM_PLUS: { tradeCode: 'OFICIO_FONTANERO', crewCode: 'CREW_PLUMBING_WET', baseUnit: 'pt', baseOutputPerDay: 14.3, baseHoursPerUnit: 0.56, crewSize: 1 },
  LAB_DRAINAGE_WET_ROOM_PLUS: { tradeCode: 'OFICIO_FONTANERO', crewCode: 'CREW_PLUMBING_WET', baseUnit: 'pt', baseOutputPerDay: 16, baseHoursPerUnit: 0.5, crewSize: 1 },
};

function round(value: number) {
  return Number(value.toFixed(3));
}

function buildFactors(
  executionContext: ExecutionContext,
  space: ResolvedSpace | null,
  solutionCode: VerticalSolutionCode,
): LaborProductivityFactor[] {
  const factors: LaborProductivityFactor[] = [];

  switch (executionContext.project.accessLevel) {
    case 'COMPLICADO':
      factors.push({ code: 'ACCESS_RESTRICTED', multiplier: 1.08, reason: 'Acceso complicado a obra.' });
      break;
    case 'MUY_COMPLICADO':
      factors.push({ code: 'ACCESS_COMPLEX', multiplier: 1.15, reason: 'Acceso muy complicado a obra.' });
      break;
    default:
      break;
  }

  if (space?.features?.occupancySensitive) {
    factors.push({ code: 'OCCUPIED_SITE', multiplier: 1.1, reason: 'Espacio sensible por ocupacion o convivencia de uso.' });
  }

  if (executionContext.project.complexityProfile?.riskLevel === 'ALTA') {
    factors.push({ code: 'HIGH_COMPLEXITY', multiplier: 1.12, reason: 'Perfil de complejidad alta del proyecto.' });
  } else if (executionContext.project.complexityProfile?.riskLevel === 'MEDIA_ALTA') {
    factors.push({ code: 'MEDIUM_HIGH_COMPLEXITY', multiplier: 1.06, reason: 'Perfil de complejidad media-alta del proyecto.' });
  }

  if (executionContext.totals.floors >= 3) {
    factors.push({ code: 'MULTI_FLOOR_LOGISTICS', multiplier: 1.04, reason: 'Logistica multplanta sin nivelacion avanzada de recursos.' });
  }

  const wetOrConstrained =
    solutionCode.startsWith('BATH_') ||
    solutionCode.startsWith('WALL_TILE_') ||
    solutionCode.startsWith('WET_AREA_') ||
    solutionCode.startsWith('PLUMBING_WET_') ||
    solutionCode.startsWith('DRAINAGE_WET_') ||
    space?.areaType === 'BANO' ||
    space?.subspaceKind === 'BANO_ASOCIADO' ||
    space?.subspaceKind === 'KITCHENETTE';

  if (wetOrConstrained) {
    factors.push({ code: 'WET_CONSTRAINED_SPACE', multiplier: 1.07, reason: 'Trabajo en zona humeda o espacio restringido.' });
  }

  return factors;
}

export function resolveLaborProductivity(
  laborCode: RecipeLaborCode,
  solutionCode: VerticalSolutionCode,
  quantity: number,
  baseHoursPerUnit: number,
  executionContext: ExecutionContext,
  space: ResolvedSpace | null,
  projectProductivityPolicy?: ProjectProductivityPolicy | null,
): LaborProductivityResolution {
  const policyApp = resolveProductivityPolicyForSolution(solutionCode, projectProductivityPolicy);
  const profile = PROFILE_BY_LABOR[laborCode];

  if (!profile) {
    const fallbackHours = baseHoursPerUnit * policyApp.combinedPolicyMultiplier;
    return {
      tradeCode: 'OFICIO_TECNICO_MULTI',
      crewCode: (policyApp.forcedCrewCode as CrewCode) || 'CREW_GENERAL_INTERIORS',
      productivityProfileCode: `FALLBACK_${laborCode}`,
      baseUnit: 'ud',
      baseOutputPerDay: 1,
      baseHoursPerUnit,
      adjustedHoursPerUnit: round(fallbackHours),
      adjustedQuantity: round(quantity),
      adjustedCrewDays: round((fallbackHours * quantity) / 8),
      source: 'FALLBACK',
      factors: [{ code: 'FALLBACK_REFERENCE', multiplier: 1, reason: 'Sin perfil productivo especifico; se conserva referencia base.' }],
      assumptions: [`No existe productivity profile especifico para ${laborCode}; se usa fallback de referencia.`],
      policySource: policyApp.policySource,
      policyFamilyCode: policyApp.familyCode,
      appliedPolicyOverrides: policyApp.appliedPolicyOverrides,
    };
  }

  // Resolve effective crew and profile, respecting policy overrides
  const effectiveCrewCode = (policyApp.forcedCrewCode as CrewCode) || profile.crewCode;
  const effectiveProfileCode = policyApp.forcedProfileCode || `${solutionCode}_${laborCode}`;

  const factors = buildFactors(executionContext, space, solutionCode);
  const factorMultiplier = factors.reduce((acc, factor) => acc * factor.multiplier, 1);
  const adjustedHoursPerUnit = profile.baseHoursPerUnit * factorMultiplier * policyApp.combinedPolicyMultiplier;
  const adjustedQuantity = round(quantity);
  const adjustedCrewDays = round((adjustedHoursPerUnit * quantity) / Math.max(profile.crewSize * 8, 0.001));

  const allAssumptions = factors.length > 0 ? factors.map((factor) => factor.reason) : [];
  if (policyApp.appliedPolicyOverrides.length > 0) {
    allAssumptions.push(...policyApp.appliedPolicyOverrides);
  }

  return {
    tradeCode: profile.tradeCode,
    crewCode: effectiveCrewCode,
    productivityProfileCode: effectiveProfileCode,
    baseUnit: profile.baseUnit,
    baseOutputPerDay: profile.baseOutputPerDay,
    baseHoursPerUnit: profile.baseHoursPerUnit,
    adjustedHoursPerUnit: round(adjustedHoursPerUnit),
    adjustedQuantity,
    adjustedCrewDays,
    source: factors.length > 0 ? 'PROFILE' : 'REFERENCE',
    factors,
    assumptions: allAssumptions,
    policySource: policyApp.policySource,
    policyFamilyCode: policyApp.familyCode,
    appliedPolicyOverrides: policyApp.appliedPolicyOverrides,
  };
}

export function deriveActivityDurationFromRecipeLine(line: RecipeLine) {
  const totalCrewDays = line.labor.reduce(
    (sum, labor) => sum + (labor.adjustedCrewDays ?? (labor.quantity / 8)),
    0,
  );

  if (totalCrewDays > 0) {
    return {
      durationDays: Math.max(1, Number(totalCrewDays.toFixed(1))),
      source: 'PRODUCTIVITY_PROFILE' as const,
    };
  }

  return {
    durationDays: 0,
    source: 'LEGACY_TEMPLATE' as const,
  };
}
