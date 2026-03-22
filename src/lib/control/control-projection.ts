import type { CommercialEstimateProjection } from '@/lib/estimate/commercial-estimate-projection';
import type { CommercialEstimateRuntimeOutput } from '@/lib/estimate/commercial-estimate-runtime';
import type { PricingCoverageMetrics } from '@/lib/estimate/pricing-types';
import type { ResolvedProjectLaborRatePolicy } from '@/lib/estimate/project-labor-rate-policy';
import type { PlanningProjection } from '@/lib/planning/planning-projection';
import type { ProcurementProjection } from '@/lib/procurement/procurement-projection';
import { buildPricingCoverageMetrics } from '@/lib/estimate/pricing-coverage';
// import type { ProjectProductionLog } from '@prisma/client';
type ProjectProductionLog = any;
import { summarizeProductionLogs, ProductionActualsSummary } from '@/lib/estimate/production-actuals';


export type ControlProjectionSource =
  | 'CANONICAL_BASELINE'
  | 'HYBRID'
  | 'LEGACY_CONTROL';

export type ControlDeviationType = 'COST' | 'TIME' | 'PROCUREMENT' | 'LABOR' | 'MIXED';
export type ControlDeviationSeverity = 'INFO' | 'MEDIA' | 'ALTA' | 'CRITICA';


export type ControlProjection = {
  source: ControlProjectionSource;
  baselineEstimate: {
    source: 'RUNTIME_OUTPUT' | 'PROJECTION' | 'LEGACY';
    internalCost: number | null;
    laborCost: number | null;
    commercialTotal: number | null;
    pricingCoverage: PricingCoverageMetrics | null;
    bucketSummaries: Array<{
      bucketCode: string;
      internalCost: number | null;
      laborCost: number | null;
      commercialPrice: number | null;
      commercialLineIds: string[];
      pricingLineIds: string[];
      recipeLineIds: string[];
      measurementLineIds: string[];
      spaceIds: string[];
    }>;
  };
  baselinePlanning: {
    source: 'PLANNING_PROJECTION' | 'BASELINE_ACTIVITIES' | 'LIVE_ACTIVITIES';
    activitiesCount: number;
    totalPlannedDurationDays: number;
    bucketSummaries: Array<{
      bucketCode: string;
      plannedDurationDays: number;
      activityCount: number;
      activityIds: string[];
      locationIds: string[];
      spaceIds: string[];
    }>;
  };
  baselineProcurement: {
    source: 'PROCUREMENT_PROJECTION' | 'LIVE_SUPPLIES' | 'DISCOVERY_HINTS';
    expectedCostTotal: number | null;
    procurementLinesCount: number;
    bucketSummaries: Array<{
      bucketCode: string;
      expectedCost: number | null;
      quantity: number;
      lineIds: string[];
      supplyIds: string[];
      supplierIds: string[];
      spaceIds: string[];
      activityIds: string[];
      pricingLineIds: string[];
      recipeLineIds: string[];
    }>;
  };
  actuals: {
    expensesTotal: number;
    committedSupplyCost: number;
    receivedSupplyCost: number;
    totalActivities: number;
    completedActivities: number;
    delayedActivities: number;
    averageRealProgress: number;
    actualLaborHours: number;
    totalProductionLogs: number;
  };

  commitments: {
    expectedSupplyCost: number;
    committedSupplyCost: number;
    pendingSupplyCost: number;
  };
  deviationSummary: {
    totalLines: number;
    costLines: number;
    timeLines: number;
    procurementLines: number;
    mixedLines: number;
    criticalLines: number;
  };
  deviationLines: Array<{
    id: string;
    type: ControlDeviationType;
    severity: ControlDeviationSeverity;
    bucketCode: string | null;
    baselineValue: number | null;
    observedValue: number | null;
    deltaAbsolute: number | null;
    deltaPercent: number | null;
    commercialLineIds: string[];
    recipeLineIds: string[];
    pricingLineIds: string[];
    spaceIds: string[];
    locationIds: string[];
    activityIds: string[];
    supplyIds: string[];
    warnings: string[];
    assumptions: string[];
  }>;
  warnings: string[];
  assumptions: string[];
};

type ControlProjectionInput = {
  commercialRuntimeOutput?: CommercialEstimateRuntimeOutput | null;
  commercialEstimateProjection?: CommercialEstimateProjection | null;
  planningProjection?: PlanningProjection | null;
  procurementProjection?: ProcurementProjection | null;
  laborRatePolicy?: ResolvedProjectLaborRatePolicy | null;
  baselineSnapshot?: any;
  activities?: Array<{
    id: string;
    name: string;
    code?: string | null;
    locationId?: string | null;
    plannedDuration?: number | null;
    plannedStartDate?: Date | string | null;
    plannedEndDate?: Date | string | null;
    realStartDate?: Date | string | null;
    realEndDate?: Date | string | null;
    realProgress?: number | null;
    originCostItemCode?: string | null;
  }>;
  supplies?: Array<{
    id: string;
    description: string;
    materialId?: string | null;
    quantity?: number | null;
    unit?: string | null;
    expectedUnitCost?: number | null;
    expectedTotalCost?: number | null;
    actualUnitCost?: number | null;
    actualTotalCost?: number | null;
    status?: string | null;
    supplierId?: string | null;
    requiredOnSiteDate?: Date | string | null;
    receivedDate?: Date | string | null;
    originSource?: string | null;
    projectActivityId?: string | null;
    locationId?: string | null;
    estimateInternalLine?: {
      id: string;
      code?: string | null;
      chapter?: string | null;
      description?: string | null;
      appliedAssumptions?: Record<string, unknown> | null;
    } | null;
    material?: { code?: string | null; name?: string | null } | null;
  }>;
  expenses?: Array<{
    id: string;
    amount?: number | null;
    date?: Date | string | null;
    category?: string | null;
  }>;
  productionLogs?: ProjectProductionLog[] | null;
};


type BucketAggregate = {
  bucketCode: string;
  internalCost: number;
  laborCost: number;
  commercialPrice: number;
  commercialLineIds: string[];
  pricingLineIds: string[];
  recipeLineIds: string[];
  measurementLineIds: string[];
  spaceIds: string[];
};

function round(value: number) {
  return Number(value.toFixed(2));
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0)),
  );
}

function asFiniteNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asDate(value?: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function diffDays(start?: Date | string | null, end?: Date | string | null) {
  const startDate = asDate(start);
  const endDate = asDate(end);
  if (!startDate || !endDate) return null;
  return Math.max(
    0,
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function toPercent(baseline?: number | null, observed?: number | null) {
  if (
    baseline === null ||
    baseline === undefined ||
    observed === null ||
    observed === undefined ||
    baseline === 0
  ) {
    return null;
  }
  return round(((observed - baseline) / baseline) * 100);
}

function severityForDelta(deltaPercent?: number | null) {
  const value = Math.abs(deltaPercent || 0);
  if (value >= 30) return 'CRITICA';
  if (value >= 18) return 'ALTA';
  if (value >= 8) return 'MEDIA';
  return 'INFO';
}

function bucketFromSolutionCode(solutionCode?: string | null) {
  const value = solutionCode || '';
  if (value.startsWith('ROOM_')) return 'ROOMS';
  if (value.startsWith('BATH_')) return 'BATHS';
  if (value.startsWith('KITCHENETTE_')) return 'KITCHENETTES';
  if (value.startsWith('LEVELING_')) return 'LEVELING';
  if (value.startsWith('COMMON_AREA_')) return 'COMMON_AREAS';
  if (value.startsWith('WALL_TILE_') || value.startsWith('PAINT_') || value.startsWith('WET_AREA_')) return 'WALL_FINISHES';
  if (value.startsWith('PARTITION_')) return 'PARTITIONS';
  if (value.startsWith('CEILING_')) return 'CEILINGS';
  if (value.startsWith('FLOOR_') || value === 'SKIRTING_STD') return 'FLOORING';
  if (value.startsWith('DOOR_') || value.startsWith('WINDOW_') || value.startsWith('SHUTTER_')) return 'CARPENTRY';
  if (value.startsWith('ELECTRICAL_') || value.startsWith('LIGHTING_') || value.startsWith('PLUMBING_') || value.startsWith('DRAINAGE_')) return 'BASIC_MEP';
  return 'GENERAL';
}

function bucketFromCostItemCode(value?: string | null) {
  const code = (value || '').toUpperCase();
  if (code.includes('BANO')) return 'BATHS';
  if (code.includes('COCINA')) return 'KITCHENETTES';
  if (code.includes('ALICAT') || code.includes('PINTUR') || code.includes('IMPERM') || code.includes('REVEST')) return 'WALL_FINISHES';
  if (code.includes('PAVIMENT')) return 'LEVELING';
  if (code.includes('COMUN')) return 'COMMON_AREAS';
  if (code.includes('HAB')) return 'ROOMS';
  if (code.includes('TABIQ') || code.includes('PLADUR') || code.includes('ALBANIL')) return 'PARTITIONS';
  if (code.includes('TECHO')) return 'CEILINGS';
  if (code.includes('RODAP') || code.includes('LAMIN') || code.includes('VINIL')) return 'FLOORING';
  if (code.includes('PUERTA') || code.includes('VENTANA') || code.includes('CARPINTER')) return 'CARPENTRY';
  if (code.includes('ELECTR') || code.includes('FONTAN') || code.includes('SANEAM') || code.includes('ILUMIN')) return 'BASIC_MEP';
  return 'GENERAL';
}

function bucketFromSupply(
  input: NonNullable<ControlProjectionInput['supplies']>[number],
) {
  const economicBucket =
    input?.estimateInternalLine?.appliedAssumptions &&
    typeof input.estimateInternalLine.appliedAssumptions === 'object'
      ? (input.estimateInternalLine.appliedAssumptions as any)?.__economicStatus?.bucketCode ||
        (input.estimateInternalLine.appliedAssumptions as any)?.bucketCode ||
        null
      : null;
  if (economicBucket) return economicBucket;

  const materialCode = input?.material?.code || '';
  if (materialCode.includes('SAN')) return 'BATHS';
  if (materialCode.includes('PPR')) return 'BATHS';
  if (materialCode.includes('ACA-PORC')) return 'LEVELING';
  if (materialCode.includes('PIN-PLA')) return 'COMMON_AREAS';

  const text = `${input?.description || ''} ${input?.originSource || ''}`.toLowerCase();
  if (/ba(?:n|ñ)o/.test(text)) return 'BATHS';
  if (/kitchen|cocina/.test(text)) return 'KITCHENETTES';
  if (/nivel|mortero|paviment/.test(text)) return 'LEVELING';
  if (/com[uú]n/.test(text)) return 'COMMON_AREAS';
  if (/habitaci[oó]n|room/.test(text)) return 'ROOMS';

  return 'GENERAL';
}

function buildBaselineEstimate(input: ControlProjectionInput) {
  const runtimeOutput = input.commercialRuntimeOutput || null;
  const projection =
    runtimeOutput?.projection || input.commercialEstimateProjection || null;

  if (runtimeOutput) {
    const aggregates = new Map<string, BucketAggregate>();
    for (const line of runtimeOutput.lines) {
      const bucketCode = line.economicStatus.bucketCode || 'GENERAL';
      const current = aggregates.get(bucketCode) || {
        bucketCode,
        internalCost: 0,
        laborCost: 0,
        commercialPrice: 0,
        commercialLineIds: [],
        pricingLineIds: [],
        recipeLineIds: [],
        measurementLineIds: [],
        spaceIds: [],
      };
      current.internalCost += line.internalCost || 0;
      current.commercialPrice += line.commercialPrice || 0;
      current.commercialLineIds.push(line.id);
      current.pricingLineIds.push(...line.pricingLineIds);
      current.recipeLineIds.push(...line.recipeLineIds);
      current.measurementLineIds.push(...line.measurementLineIds);
      aggregates.set(bucketCode, current);
    }

    if (projection) {
      for (const aggregate of aggregates.values()) {
        const spaces = new Set<string>();
        let laborCost = 0;
        for (const pricingLineId of aggregate.pricingLineIds) {
          const pricingLine = projection.pricingLines.find((line) => line.id === pricingLineId);
          if (pricingLine?.spaceId) spaces.add(pricingLine.spaceId);
          laborCost += pricingLine?.laborCost || 0;
        }
        aggregate.spaceIds = Array.from(spaces);
        aggregate.laborCost = laborCost;
      }
    }

    return {
      source: 'RUNTIME_OUTPUT' as const,
      internalCost: runtimeOutput.summary.internalCost,
      laborCost: projection
        ? round(
            projection.pricingLines.reduce(
              (sum, line) => sum + (line.laborCost || 0),
              0,
            ),
          )
        : null,
      commercialTotal: runtimeOutput.summary.commercialTotal,
      pricingCoverage: runtimeOutput.economicCoverage || buildPricingCoverageMetrics(runtimeOutput.projection.pricingLines),
      bucketSummaries: Array.from(aggregates.values()).map((item) => ({
        bucketCode: item.bucketCode,
        internalCost: round(item.internalCost),
        laborCost: round(item.laborCost),
        commercialPrice: round(item.commercialPrice),
        commercialLineIds: unique(item.commercialLineIds),
        pricingLineIds: unique(item.pricingLineIds),
        recipeLineIds: unique(item.recipeLineIds),
        measurementLineIds: unique(item.measurementLineIds),
        spaceIds: unique(item.spaceIds),
      })),
    };
  }

  if (projection) {
    return {
      source: 'PROJECTION' as const,
      internalCost: projection.summary.internalCost,
      laborCost: round(
        projection.pricingLines.reduce((sum, line) => sum + (line.laborCost || 0), 0),
      ),
      commercialTotal: projection.summary.commercialTotal,
      pricingCoverage: buildPricingCoverageMetrics(projection.pricingLines),
      bucketSummaries: projection.buckets.map((bucket) => {
        const spaces = uniqueStrings(
          bucket.pricingLineIds
            .map((id) => projection.pricingLines.find((line) => line.id === id)?.spaceId)
            .filter((value): value is string => typeof value === 'string' && value.length > 0),
        );
        const laborCost = bucket.pricingLineIds.reduce((sum, id) => {
          const pricingLine = projection.pricingLines.find((line) => line.id === id);
          return sum + (pricingLine?.laborCost || 0);
        }, 0);
        return {
          bucketCode: bucket.bucketCode,
          internalCost: bucket.totalCost,
          laborCost: round(laborCost),
          commercialPrice: null,
          commercialLineIds: projection.commercialLines
            .filter((line) => line.pricingLineIds.some((id) => bucket.pricingLineIds.includes(id)))
            .map((line) => line.id),
          pricingLineIds: bucket.pricingLineIds,
          recipeLineIds: bucket.recipeLineIds,
          measurementLineIds: bucket.measurementLineIds,
          spaceIds: spaces,
        };
      }),
    };
  }

  return {
    source: 'LEGACY' as const,
    internalCost: null,
    laborCost: null,
    commercialTotal: null,
    pricingCoverage: null,
    bucketSummaries: [],
  };
}

function buildBaselinePlanning(input: ControlProjectionInput) {
  const planningProjection =
    input.planningProjection ||
    (input.baselineSnapshot?.planningProjection as PlanningProjection | undefined) ||
    null;

  if (planningProjection) {
    const aggregates = new Map<
      string,
      {
        bucketCode: string;
        plannedDurationDays: number;
        activityCount: number;
        activityIds: string[];
        locationIds: string[];
        spaceIds: string[];
      }
    >();

    for (const activity of planningProjection.activities) {
      const bucketCode = bucketFromSolutionCode(activity.provenance.solutionCode);
      const current = aggregates.get(bucketCode) || {
        bucketCode,
        plannedDurationDays: 0,
        activityCount: 0,
        activityIds: [],
        locationIds: [],
        spaceIds: [],
      };
      current.plannedDurationDays += activity.durationDays || 0;
      current.activityCount += 1;
      current.activityIds.push(activity.key);
      if (activity.locationKey) current.locationIds.push(activity.locationKey);
      if (activity.provenance.spaceId) current.spaceIds.push(activity.provenance.spaceId);
      aggregates.set(bucketCode, current);
    }

    return {
      source: 'PLANNING_PROJECTION' as const,
      activitiesCount: planningProjection.activities.length,
      totalPlannedDurationDays: round(
        planningProjection.activities.reduce((sum, activity) => sum + (activity.durationDays || 0), 0),
      ),
      bucketSummaries: Array.from(aggregates.values()).map((item) => ({
        ...item,
        plannedDurationDays: round(item.plannedDurationDays),
        activityIds: uniqueStrings(item.activityIds),
        locationIds: uniqueStrings(item.locationIds),
        spaceIds: uniqueStrings(item.spaceIds),
      })),
    };
  }

  const baselineActivities = Array.isArray(input.baselineSnapshot?.activities)
    ? input.baselineSnapshot.activities
    : [];
  if (baselineActivities.length > 0) {
    const aggregates = new Map<string, any>();
    for (const activity of baselineActivities) {
      const bucketCode = bucketFromCostItemCode(activity.originCostItemCode);
      const current = aggregates.get(bucketCode) || {
        bucketCode,
        plannedDurationDays: 0,
        activityCount: 0,
        activityIds: [],
        locationIds: [],
        spaceIds: [],
      };
      current.plannedDurationDays += activity.durationDays || activity.plannedDuration || 0;
      current.activityCount += 1;
      current.activityIds.push(activity.id || activity.key);
      if (activity.locationId || activity.locationKey) current.locationIds.push(activity.locationId || activity.locationKey);
      aggregates.set(bucketCode, current);
    }
    return {
      source: 'BASELINE_ACTIVITIES' as const,
      activitiesCount: baselineActivities.length,
      totalPlannedDurationDays: round(
        baselineActivities.reduce(
          (sum: number, activity: any) =>
            sum + asFiniteNumber(activity.durationDays ?? activity.plannedDuration, 0),
          0,
        ),
      ),
      bucketSummaries: Array.from(aggregates.values()).map((item) => ({
        ...item,
        plannedDurationDays: round(item.plannedDurationDays),
        activityIds: uniqueStrings(item.activityIds),
        locationIds: uniqueStrings(item.locationIds),
        spaceIds: uniqueStrings(item.spaceIds),
      })),
    };
  }

  const liveActivities = input.activities || [];
  const aggregates = new Map<string, any>();
  for (const activity of liveActivities) {
    const bucketCode = bucketFromCostItemCode(activity.originCostItemCode);
    const current = aggregates.get(bucketCode) || {
      bucketCode,
      plannedDurationDays: 0,
      activityCount: 0,
      activityIds: [],
      locationIds: [],
      spaceIds: [],
    };
    current.plannedDurationDays += activity.plannedDuration || 0;
    current.activityCount += 1;
    current.activityIds.push(activity.id);
    if (activity.locationId) current.locationIds.push(activity.locationId);
    aggregates.set(bucketCode, current);
  }
  return {
    source: 'LIVE_ACTIVITIES' as const,
    activitiesCount: liveActivities.length,
    totalPlannedDurationDays: round(
      liveActivities.reduce((sum, activity) => sum + asFiniteNumber(activity.plannedDuration, 0), 0),
    ),
    bucketSummaries: Array.from(aggregates.values()).map((item) => ({
      ...item,
      plannedDurationDays: round(item.plannedDurationDays),
      activityIds: uniqueStrings(item.activityIds),
      locationIds: uniqueStrings(item.locationIds),
      spaceIds: uniqueStrings(item.spaceIds),
    })),
  };
}

function buildBaselineProcurement(input: ControlProjectionInput) {
  const procurementProjection =
    input.procurementProjection ||
    (input.baselineSnapshot?.procurementProjection as ProcurementProjection | undefined) ||
    null;

  if (procurementProjection) {
    const aggregates = new Map<string, any>();
    let expectedCostTotal = 0;

    for (const line of procurementProjection.procurementLines) {
      const bucketCode =
        line.supportedSolutionCodes[0]
          ? bucketFromSolutionCode(line.supportedSolutionCodes[0])
          : 'GENERAL';
      const expectedCost =
        typeof (line as any).expectedTotalCost === 'number'
          ? (line as any).expectedTotalCost
          : typeof (line as any).unitCost === 'number'
            ? round((line as any).unitCost * line.quantity)
            : null;
      const current = aggregates.get(bucketCode) || {
        bucketCode,
        expectedCost: 0,
        quantity: 0,
        lineIds: [],
        supplyIds: [],
        supplierIds: [],
        spaceIds: [],
        activityIds: [],
        pricingLineIds: [],
        recipeLineIds: [],
      };
      current.quantity += line.quantity;
      if (expectedCost != null) {
        current.expectedCost += expectedCost;
        expectedCostTotal += expectedCost;
      }
      current.lineIds.push(line.id);
      if (line.supplierId) current.supplierIds.push(line.supplierId);
      current.spaceIds.push(...line.requiredBySpaceIds);
      if (line.planningLinkage?.projectActivityId) current.activityIds.push(line.planningLinkage.projectActivityId);
      current.pricingLineIds.push(...line.supportedPricingLineIds);
      current.recipeLineIds.push(...line.supportedRecipeLineIds);
      aggregates.set(bucketCode, current);
    }

    return {
      source:
        procurementProjection.source === 'DISCOVERY_HINTS'
          ? ('DISCOVERY_HINTS' as const)
          : ('PROCUREMENT_PROJECTION' as const),
      expectedCostTotal: expectedCostTotal ? round(expectedCostTotal) : null,
      procurementLinesCount: procurementProjection.procurementLines.length,
      bucketSummaries: Array.from(aggregates.values()).map((item) => ({
        bucketCode: item.bucketCode,
        expectedCost: item.expectedCost ? round(item.expectedCost) : null,
        quantity: round(item.quantity),
        lineIds: uniqueStrings(item.lineIds),
        supplyIds: [],
        supplierIds: uniqueStrings(item.supplierIds),
        spaceIds: uniqueStrings(item.spaceIds),
        activityIds: uniqueStrings(item.activityIds),
        pricingLineIds: uniqueStrings(item.pricingLineIds),
        recipeLineIds: uniqueStrings(item.recipeLineIds),
      })),
    };
  }

  const liveSupplies = input.supplies || [];
  const aggregates = new Map<string, any>();
  let expectedCostTotal = 0;
  for (const supply of liveSupplies) {
    const bucketCode = bucketFromSupply(supply);
    const expectedTotal =
      supply.expectedTotalCost ??
      ((supply.expectedUnitCost ?? null) !== null && (supply.quantity ?? null) !== null
        ? round((supply.expectedUnitCost || 0) * (supply.quantity || 0))
        : null);
    const current = aggregates.get(bucketCode) || {
      bucketCode,
      expectedCost: 0,
      quantity: 0,
      lineIds: [],
      supplyIds: [],
      supplierIds: [],
      spaceIds: [],
      activityIds: [],
      pricingLineIds: [],
      recipeLineIds: [],
    };
    current.quantity += supply.quantity || 0;
    if (expectedTotal != null) {
      current.expectedCost += expectedTotal;
      expectedCostTotal += expectedTotal;
    }
    current.supplyIds.push(supply.id);
    if (supply.supplierId) current.supplierIds.push(supply.supplierId);
    if (supply.projectActivityId) current.activityIds.push(supply.projectActivityId);
    aggregates.set(bucketCode, current);
  }

  return {
    source: 'LIVE_SUPPLIES' as const,
    expectedCostTotal: expectedCostTotal ? round(expectedCostTotal) : null,
    procurementLinesCount: liveSupplies.length,
    bucketSummaries: Array.from(aggregates.values()).map((item) => ({
      bucketCode: item.bucketCode,
      expectedCost: item.expectedCost ? round(item.expectedCost) : null,
      quantity: round(item.quantity),
      lineIds: uniqueStrings(item.lineIds),
      supplyIds: uniqueStrings(item.supplyIds),
      supplierIds: uniqueStrings(item.supplierIds),
      spaceIds: uniqueStrings(item.spaceIds),
      activityIds: uniqueStrings(item.activityIds),
      pricingLineIds: uniqueStrings(item.pricingLineIds),
      recipeLineIds: uniqueStrings(item.recipeLineIds),
    })),
  };
}

function buildObservedActivitySummary(activities: ControlProjectionInput['activities']) {
  const now = new Date();
  const items = activities || [];
  const byBucket = new Map<string, any>();
  let delayedActivities = 0;

  for (const activity of items) {
    const bucketCode = bucketFromCostItemCode(activity.originCostItemCode);
    const actualDuration =
      diffDays(activity.realStartDate, activity.realEndDate) ??
      (activity.realStartDate ? diffDays(activity.realStartDate, now) : null);
    const current = byBucket.get(bucketCode) || {
      bucketCode,
      observedDurationDays: 0,
      completedActivities: 0,
      delayedActivities: 0,
      activityIds: [],
      locationIds: [],
    };
    if (actualDuration != null) current.observedDurationDays += actualDuration;
    if ((activity.realProgress || 0) >= 100 || Boolean(activity.realEndDate)) {
      current.completedActivities += 1;
    }
    const plannedEnd = asDate(activity.plannedEndDate);
    if (
      plannedEnd &&
      ((activity.realEndDate && asDate(activity.realEndDate)! > plannedEnd) ||
        (!activity.realEndDate && plannedEnd < now && (activity.realProgress || 0) < 100))
    ) {
      current.delayedActivities += 1;
      delayedActivities += 1;
    }
    current.activityIds.push(activity.id);
    if (activity.locationId) current.locationIds.push(activity.locationId);
    byBucket.set(bucketCode, current);
  }

  return {
    totalActivities: items.length,
    completedActivities: items.filter((item) => (item.realProgress || 0) >= 100 || Boolean(item.realEndDate)).length,
    delayedActivities,
    averageRealProgress: items.length
      ? round(items.reduce((sum, item) => sum + asFiniteNumber(item.realProgress, 0), 0) / items.length)
      : 0,
    byBucket: Array.from(byBucket.values()).map((item) => ({
      bucketCode: item.bucketCode,
      observedDurationDays: round(item.observedDurationDays),
      completedActivities: item.completedActivities,
      delayedActivities: item.delayedActivities,
      activityIds: uniqueStrings(item.activityIds),
      locationIds: uniqueStrings(item.locationIds),
    })),
  };
}

function buildObservedSupplySummary(supplies: ControlProjectionInput['supplies']) {
  const items = supplies || [];
  const byBucket = new Map<string, any>();
  let committedSupplyCost = 0;
  let receivedSupplyCost = 0;

  for (const supply of items) {
    const bucketCode = bucketFromSupply(supply);
    const committed =
      supply.actualTotalCost ??
      ((supply.actualUnitCost ?? null) !== null && (supply.quantity ?? null) !== null
        ? round((supply.actualUnitCost || 0) * (supply.quantity || 0))
        : ['PEDIDA', 'CONFIRMADA', 'EN_TRANSITO', 'RECIBIDA', 'RETRASADA'].includes(supply.status || '')
          ? supply.expectedTotalCost ??
            ((supply.expectedUnitCost ?? null) !== null && (supply.quantity ?? null) !== null
              ? round((supply.expectedUnitCost || 0) * (supply.quantity || 0))
              : null)
          : null);
    const current = byBucket.get(bucketCode) || {
      bucketCode,
      committedCost: 0,
      receivedCost: 0,
      supplyIds: [],
      supplierIds: [],
      activityIds: [],
      locationIds: [],
    };
    if (committed != null) {
      current.committedCost += committed;
      committedSupplyCost += committed;
      if (supply.receivedDate) {
        current.receivedCost += committed;
        receivedSupplyCost += committed;
      }
    }
    current.supplyIds.push(supply.id);
    if (supply.supplierId) current.supplierIds.push(supply.supplierId);
    if (supply.projectActivityId) current.activityIds.push(supply.projectActivityId);
    if (supply.locationId) current.locationIds.push(supply.locationId);
    byBucket.set(bucketCode, current);
  }

  return {
    committedSupplyCost: round(committedSupplyCost),
    receivedSupplyCost: round(receivedSupplyCost),
    byBucket: Array.from(byBucket.values()).map((item) => ({
      bucketCode: item.bucketCode,
      committedCost: round(item.committedCost),
      receivedCost: round(item.receivedCost),
      supplyIds: uniqueStrings(item.supplyIds),
      supplierIds: uniqueStrings(item.supplierIds),
      activityIds: uniqueStrings(item.activityIds),
      locationIds: uniqueStrings(item.locationIds),
    })),
  };
}

function buildDeviationLines(params: {
  baselineEstimate: ReturnType<typeof buildBaselineEstimate>;
  baselinePlanning: ReturnType<typeof buildBaselinePlanning>;
  baselineProcurement: ReturnType<typeof buildBaselineProcurement>;
  activityObserved: ReturnType<typeof buildObservedActivitySummary>;
  supplyObserved: ReturnType<typeof buildObservedSupplySummary>;
  productionActuals: ProductionActualsSummary;
  expensesTotal: number;
}) {
  const lines: ControlProjection['deviationLines'] = [];
  const productionActuals = params.productionActuals;

  const estimateByBucket = new Map(
    params.baselineEstimate.bucketSummaries.map((item) => [item.bucketCode, item]),
  );
  const planningByBucket = new Map(
    params.baselinePlanning.bucketSummaries.map((item) => [item.bucketCode, item]),
  );
  const procurementByBucket = new Map(
    params.baselineProcurement.bucketSummaries.map((item) => [item.bucketCode, item]),
  );
  const observedActivitiesByBucket = new Map(
    params.activityObserved.byBucket.map((item) => [item.bucketCode, item]),
  );
  const observedSuppliesByBucket = new Map(
    params.supplyObserved.byBucket.map((item) => [item.bucketCode, item]),
  );

  const bucketCodes = unique([
    ...estimateByBucket.keys(),
    ...planningByBucket.keys(),
    ...procurementByBucket.keys(),
    ...observedActivitiesByBucket.keys(),
    ...observedSuppliesByBucket.keys(),
  ]);

  for (const bucketCode of bucketCodes) {
    const estimate = estimateByBucket.get(bucketCode);
    const planning = planningByBucket.get(bucketCode);
    const procurement = procurementByBucket.get(bucketCode);
    const observedActivity = observedActivitiesByBucket.get(bucketCode);
    const observedSupply = observedSuppliesByBucket.get(bucketCode);

    if (procurement?.expectedCost != null || observedSupply?.committedCost) {
      const baselineValue =
        procurement?.expectedCost ??
        estimate?.internalCost ??
        null;
      const observedValue = observedSupply?.committedCost ?? null;
      const deltaAbsolute =
        baselineValue != null && observedValue != null
          ? round(observedValue - baselineValue)
          : null;
      const deltaPercent = toPercent(baselineValue, observedValue);
      lines.push({
        id: `control:procurement:${bucketCode}`,
        type: procurement?.expectedCost != null ? 'PROCUREMENT' : 'COST',
        severity: severityForDelta(deltaPercent),
        bucketCode,
        baselineValue,
        observedValue,
        deltaAbsolute,
        deltaPercent,
        commercialLineIds: estimate?.commercialLineIds || [],
        recipeLineIds: procurement?.recipeLineIds || [],
        pricingLineIds: procurement?.pricingLineIds || estimate?.pricingLineIds || [],
        spaceIds: uniqueStrings([...(estimate?.spaceIds || []), ...(procurement?.spaceIds || [])]),
        locationIds: observedSupply?.locationIds || [],
        activityIds: uniqueStrings([...(procurement?.activityIds || []), ...(observedSupply?.activityIds || [])]),
        supplyIds: observedSupply?.supplyIds || [],
        warnings:
          baselineValue == null
            ? ['No existe baseline economica suficiente para esta familia.']
            : [],
        assumptions:
          procurement?.expectedCost == null
            ? ['Se usa coste estimate como baseline economica por falta de procurement baseline cerrada.']
            : [],
      });
    }

    if (planning?.plannedDurationDays || observedActivity?.observedDurationDays || observedActivity?.delayedActivities) {
      const baselineValue = planning?.plannedDurationDays ?? null;
      const observedValue =
        observedActivity?.observedDurationDays && observedActivity.observedDurationDays > 0
          ? observedActivity.observedDurationDays
          : observedActivity?.delayedActivities ?? null;
      const deltaAbsolute =
        baselineValue != null && observedValue != null
          ? round(observedValue - baselineValue)
          : null;
      const deltaPercent = toPercent(baselineValue, observedValue);
      lines.push({
        id: `control:time:${bucketCode}`,
        type: 'TIME',
        severity:
          (observedActivity?.delayedActivities || 0) > 0 && (deltaPercent || 0) <= 0
            ? 'MEDIA'
            : severityForDelta(deltaPercent),
        bucketCode,
        baselineValue,
        observedValue,
        deltaAbsolute,
        deltaPercent,
        commercialLineIds: estimate?.commercialLineIds || [],
        recipeLineIds: procurement?.recipeLineIds || [],
        pricingLineIds: estimate?.pricingLineIds || procurement?.pricingLineIds || [],
        spaceIds: uniqueStrings([...(estimate?.spaceIds || []), ...(planning?.spaceIds || [])]),
        locationIds: uniqueStrings([...(planning?.locationIds || []), ...(observedActivity?.locationIds || [])]),
        activityIds: uniqueStrings([...(planning?.activityIds || []), ...(observedActivity?.activityIds || [])]),
        supplyIds: [],
        warnings:
          baselineValue == null
            ? ['No existe baseline temporal suficientemente estructurada para esta familia.']
            : [],
        assumptions:
          observedActivity?.observedDurationDays
            ? []
            : ['Se usa retraso observado como proxy temporal por falta de duracion real cerrada.'],
      });
    }

    if (estimate?.laborCost != null || productionActuals.byFamily[bucketCode]?.actualHours) {
      const baselineValue = estimate?.laborCost ?? null;
      const observedValue = productionActuals.byFamily[bucketCode]?.actualHours ?? 0;
      const deltaAbsolute =
        baselineValue != null ? round(observedValue - baselineValue) : null;
      const deltaPercent = toPercent(baselineValue, observedValue);
      lines.push({
        id: `control:labor:${bucketCode}`,
        type: 'LABOR',
        severity: severityForDelta(deltaPercent),
        bucketCode,
        baselineValue,
        observedValue,
        deltaAbsolute,
        deltaPercent,
        commercialLineIds: estimate?.commercialLineIds || [],
        recipeLineIds: estimate?.recipeLineIds || [],
        pricingLineIds: estimate?.pricingLineIds || [],
        spaceIds: estimate?.spaceIds || [],
        locationIds: [],
        activityIds: [],
        supplyIds: [],
        warnings:
          baselineValue == null
            ? ['No existe baseline de labor estructurada para esta familia.']
            : [],
        assumptions: [],
      });
    }
  }

  if (params.baselineEstimate.internalCost != null || params.expensesTotal > 0) {
    const baselineValue = params.baselineEstimate.internalCost;
    const observedValue = params.expensesTotal;
    const deltaAbsolute =
      baselineValue != null ? round(observedValue - baselineValue) : null;
    const deltaPercent = toPercent(baselineValue, observedValue);
    lines.push({
      id: 'control:cost:general',
      type: 'COST',
      severity: severityForDelta(deltaPercent),
      bucketCode: 'GENERAL',
      baselineValue,
      observedValue,
      deltaAbsolute,
      deltaPercent,
      commercialLineIds: params.baselineEstimate.bucketSummaries.flatMap((item) => item.commercialLineIds),
      recipeLineIds: [],
      pricingLineIds: params.baselineEstimate.bucketSummaries.flatMap((item) => item.pricingLineIds),
      spaceIds: params.baselineEstimate.bucketSummaries.flatMap((item) => item.spaceIds),
      locationIds: [],
      activityIds: [],
      supplyIds: [],
      warnings:
        baselineValue == null
          ? ['No existe baseline estimate interna para comparar gasto observado.']
          : [],
      assumptions:
        observedValue === 0
          ? ['No hay gastos reales imputados; la desviacion economica general sigue parcial.']
          : [],
    });
  }

  return lines;
}

export function buildControlProjection(input: ControlProjectionInput): ControlProjection {
  const warnings: string[] = [];
  const assumptions: string[] = [];

  const baselineEstimate = buildBaselineEstimate(input);
  const baselinePlanning = buildBaselinePlanning(input);
  const baselineProcurement = buildBaselineProcurement(input);
  const activityObserved = buildObservedActivitySummary(input.activities || []);
  const supplyObserved = buildObservedSupplySummary(input.supplies || []);
  const productionActuals = summarizeProductionLogs(
    '', // dummy projectId, logic doesn't strictly need it if we pass the project logs
    input.productionLogs || [],
  );
  const expensesTotal = round(
    (input.expenses || []).reduce((sum, expense) => sum + asFiniteNumber(expense.amount, 0), 0),
  );

  const deviationLines = buildDeviationLines({
    baselineEstimate,
    baselinePlanning,
    baselineProcurement,
    activityObserved,
    supplyObserved,
    productionActuals,
    expensesTotal,
  });


  const hasCanonicalEstimate = baselineEstimate.source !== 'LEGACY';
  const hasCanonicalPlanning = baselinePlanning.source === 'PLANNING_PROJECTION';
  const hasCanonicalProcurement = baselineProcurement.source === 'PROCUREMENT_PROJECTION';

  let source: ControlProjectionSource = 'LEGACY_CONTROL';
  if (hasCanonicalEstimate && hasCanonicalPlanning && hasCanonicalProcurement) {
    source = 'CANONICAL_BASELINE';
  } else if (
    hasCanonicalEstimate ||
    hasCanonicalPlanning ||
    hasCanonicalProcurement
  ) {
    source = 'HYBRID';
  }

  if (!input.baselineSnapshot) {
    assumptions.push('No existe baseline persistida completa; parte del control usa snapshots/proyecciones vivas.');
  }
  if (!hasCanonicalPlanning) {
    warnings.push('La baseline temporal sigue apoyandose parcial o totalmente en actividades legacy.');
  }
  if (!hasCanonicalProcurement) {
    warnings.push('La baseline procurement no esta completamente soportada por ProcurementProjection persistida.');
  }
  if (input.laborRatePolicy?.source === 'PROJECT_OVERRIDE') {
    assumptions.push('La baseline economica aplica una policy laboral de proyecto sobre los rates canónicos.');
  }
  if (baselineEstimate.pricingCoverage?.weakFamilies.length) {
    warnings.push(
      `La baseline economica mantiene familias debiles de pricing: ${baselineEstimate.pricingCoverage.weakFamilies
        .slice(0, 4)
        .map((family) => family.label)
        .join(', ')}.`
    );
  }
  const laborWeakFamilies =
    baselineEstimate.pricingCoverage?.familyMetrics
      .filter(
        (family) =>
          family.weakness === 'LABOR' || family.weakness === 'MIXED',
      )
      .slice(0, 4) || [];
  if (laborWeakFamilies.length > 0) {
    warnings.push(
      `La baseline laboral sigue debil en: ${laborWeakFamilies
        .map((family) => `${family.label} (${family.governedLaborCoveragePercent}% gobernado)`)
        .join(', ')}.`,
    );
  }
  if ((input.expenses || []).length === 0) {
    assumptions.push('No hay gastos reales imputados; el control de coste total sigue parcial.');
  }

  for (const line of deviationLines) {
    warnings.push(...line.warnings);
    assumptions.push(...line.assumptions);
  }

  return {
    source,
    baselineEstimate,
    baselinePlanning,
    baselineProcurement,
    actuals: {
      expensesTotal,
      committedSupplyCost: supplyObserved.committedSupplyCost,
      receivedSupplyCost: supplyObserved.receivedSupplyCost,
      totalActivities: activityObserved.totalActivities,
      completedActivities: activityObserved.completedActivities,
      delayedActivities: activityObserved.delayedActivities,
      averageRealProgress: Math.max(
        activityObserved.averageRealProgress,
        productionActuals.averageProgressPercent
      ),
      actualLaborHours: productionActuals.totalActualHours,
      totalProductionLogs: (input.productionLogs || []).length,
    },
    commitments: {
      expectedSupplyCost: baselineProcurement.expectedCostTotal || 0,
      committedSupplyCost: supplyObserved.committedSupplyCost,
      pendingSupplyCost: round(
        Math.max(
          0,
          (baselineProcurement.expectedCostTotal || 0) - supplyObserved.committedSupplyCost,
        ),
      ),
    },
    deviationSummary: {
      totalLines: deviationLines.length,
      costLines: deviationLines.filter((line) => line.type === 'COST').length,
      timeLines: deviationLines.filter((line) => line.type === 'TIME').length,
      procurementLines: deviationLines.filter((line) => line.type === 'PROCUREMENT').length,
      mixedLines: deviationLines.filter((line) => line.type === 'MIXED').length,
      criticalLines: deviationLines.filter((line) => line.severity === 'CRITICA').length,
    },
    deviationLines,
    warnings: uniqueStrings(warnings),
    assumptions: uniqueStrings(assumptions),
  };
}
