import type {
  GeneratedEstimateLine,
  GeneratedEstimateProposal,
} from '@/lib/automation/estimate-generator';
import type { CommercialEstimateProjection } from './commercial-estimate-projection';
import type {
  CommercialLineGeneratedFrom,
  IntegratedEstimateBucketCode,
} from './estimate-structure-scaffold';
import type {
  EstimateLineEconomicSnapshot,
  EstimateStatusSnapshot,
  InternalCostSource,
} from './estimate-status';
import type { PricingCoverageMetrics } from './pricing-types';
import { buildPricingCoverageMetrics } from './pricing-coverage';

export type CommercialEstimateRuntimeLine = {
  id: string;
  chapter: string;
  code?: string | null;
  description: string;
  quantity: number;
  unit: string;
  internalCost: number | null;
  commercialPrice: number | null;
  costSource: InternalCostSource;
  generatedFrom: CommercialLineGeneratedFrom;
  supportedSolutionCodes: string[];
  measurementLineIds: string[];
  recipeLineIds: string[];
  pricingLineIds: string[];
  provisional: boolean;
  economicStatus: EstimateLineEconomicSnapshot;
  manualAdjustment?: {
    applied: boolean;
    timestamp: string;
    editedFields: string[];
    degradedTrace: boolean;
    reason: string;
  } | null;
};

export type CommercialEstimateRuntimeOutput = {
  status: EstimateStatusSnapshot;
  source: CommercialEstimateProjection['source'];
  projection: CommercialEstimateProjection;
  chapters: string[];
  lines: CommercialEstimateRuntimeLine[];
  summary: {
    materialCost: number;
    laborCost: number;
    indirectCost: number;
    internalCost: number | null;
    contingencyAmount: number;
    marginAmount: number;
    commercialSubtotal: number | null;
    vatAmount: number;
    commercialTotal: number | null;
  };
  economicCoverage: PricingCoverageMetrics;
  warnings: string[];
  assumptions: string[];
  legacyAdapter: {
    required: boolean;
    source: GeneratedEstimateProposal['source'] | null;
    structureMode: GeneratedEstimateProposal['structureMode'] | null;
    legacyCostingMode: GeneratedEstimateProposal['legacyCostingMode'] | null;
  };
};

function round(value: number) {
  return Number(value.toFixed(2));
}

function buildEconomicStatusFromProjection(
  projection: CommercialEstimateProjection,
  line: CommercialEstimateProjection['commercialLines'][number]
): EstimateLineEconomicSnapshot {
  const bucket = projection.buckets.find(
    (item) => item.bucketCode === line.code?.replace('INT-', '').replace('KITCH', 'KITCHENETTES')
  );

  const bucketByIds = projection.buckets.find((item) =>
    item.pricingLineIds.some((id) => line.pricingLineIds.includes(id))
  );

  const selectedBucket = bucketByIds || bucket || null;

  return {
    economicStatus:
      line.costSource === 'PARAMETRIC_MASTER'
        ? 'PARAMETRIC_PRELIMINARY'
        : selectedBucket?.priceStatus === 'PRICE_PENDING_VALIDATION'
          ? 'PRICE_PENDING_VALIDATION'
          : 'RECIPE_PRICED',
    priceSource:
      selectedBucket?.dominantPriceSource ||
      (line.costSource === 'PARAMETRIC_MASTER'
        ? 'PARAMETRIC_REFERENCE'
        : 'CATALOG_REFERENCE'),
    pendingValidation: selectedBucket?.priceStatus === 'PRICE_PENDING_VALIDATION',
    costSource: line.costSource,
    commercialPriceProvisional: line.provisional,
    priceStatus: selectedBucket?.priceStatus || 'PRICE_PENDING_VALIDATION',
    recipeCoverage: selectedBucket?.recipeCoveragePercent || 0,
    priceCoverage: selectedBucket?.priceCoveragePercent || 0,
    bucketCode: (selectedBucket?.bucketCode as IntegratedEstimateBucketCode | undefined) || null,
  };
}

export function buildCommercialEstimateRuntimeOutput(params: {
  projection: CommercialEstimateProjection;
  baseProposal?: GeneratedEstimateProposal | null;
}): CommercialEstimateRuntimeOutput {
  const { projection, baseProposal } = params;
  const economicCoverage = buildPricingCoverageMetrics(projection.pricingLines);
  const chapters = Array.from(
    new Set(projection.commercialLines.map((line) => line.chapter))
  );

  const contingencyRatio =
    baseProposal && baseProposal.summary.internalCost > 0
      ? baseProposal.summary.contingencyAmount / baseProposal.summary.internalCost
      : 0.06;
  const marginRatio =
    baseProposal && baseProposal.summary.internalCost > 0
      ? baseProposal.summary.marginAmount / baseProposal.summary.internalCost
      : 0.18;

  const internalCost = projection.summary.internalCost ?? 0;
  const contingencyAmount = round(internalCost * contingencyRatio);
  const marginAmount = round(internalCost * marginRatio);
  const commercialSubtotal =
    projection.summary.commercialSubtotal != null
      ? projection.summary.commercialSubtotal
      : round(internalCost + contingencyAmount + marginAmount);
  const vatAmount = round((commercialSubtotal || 0) * 0.21);
  const commercialTotal =
    projection.summary.commercialTotal != null
      ? projection.summary.commercialTotal
      : round((commercialSubtotal || 0) + vatAmount);
  const laborWeakFamilies = economicCoverage.familyMetrics
    .filter((family) => family.weakness === 'LABOR' || family.weakness === 'MIXED')
    .slice(0, 4)
    .map((family) => `${family.label} (${family.governedLaborCoveragePercent}% gobernado)`);

  return {
    status: projection.status,
    source: projection.source,
    projection,
    chapters,
    lines: projection.commercialLines.map((line) => ({
      ...line,
      economicStatus: buildEconomicStatusFromProjection(projection, line),
    })),
    summary: {
      materialCost: projection.summary.materialCost,
      laborCost: projection.summary.laborCost,
      indirectCost: projection.summary.indirectCost,
      internalCost: projection.summary.internalCost,
      contingencyAmount,
      marginAmount,
      commercialSubtotal,
      vatAmount,
      commercialTotal,
    },
    economicCoverage,
    warnings: Array.from(
      new Set([
        ...projection.warnings,
        ...(laborWeakFamilies.length > 0
          ? [
              `Cobertura laboral todavía débil en: ${laborWeakFamilies.join(', ')}.`,
            ]
          : []),
      ]),
    ),
    assumptions: projection.assumptions,
    legacyAdapter: {
      required:
        projection.source !== 'TECHNICAL_PIPELINE' ||
        Boolean(baseProposal && baseProposal.source === 'FALLBACK'),
      source: baseProposal?.source || null,
      structureMode: baseProposal?.structureMode || null,
      legacyCostingMode: baseProposal?.legacyCostingMode || null,
    },
  };
}

export function adaptCommercialRuntimeOutputToLegacyProposal(
  runtimeOutput: CommercialEstimateRuntimeOutput,
  baseProposal: GeneratedEstimateProposal
): GeneratedEstimateProposal & {
  integratedCostBuckets: CommercialEstimateProjection['buckets'];
  commercialEstimateProjection: CommercialEstimateProjection;
  commercialRuntimeOutput: CommercialEstimateRuntimeOutput;
} {
  const lines: GeneratedEstimateLine[] = runtimeOutput.lines.map((line) => ({
    chapter: line.chapter,
    code: line.code || null,
    description: line.description,
    unit: line.unit,
    quantity: line.quantity,
    commercialPrice: line.commercialPrice ?? 0,
    internalCost: line.internalCost ?? 0,
    laborHours: 0,
    laborCost:
      runtimeOutput.projection.buckets.find((bucket) =>
        bucket.pricingLineIds.some((id) => line.pricingLineIds.includes(id))
      )?.laborCost || 0,
    materialCost:
      runtimeOutput.projection.buckets.find((bucket) =>
        bucket.pricingLineIds.some((id) => line.pricingLineIds.includes(id))
      )?.materialCost || 0,
    associatedCost:
      runtimeOutput.projection.buckets.find((bucket) =>
        bucket.pricingLineIds.some((id) => line.pricingLineIds.includes(id))
      )?.indirectCost || 0,
    kind: line.provisional ? 'PROVISIONAL' : 'DIRECT',
    source:
      line.generatedFrom === 'LEGACY_FALLBACK'
        ? 'FALLBACK'
        : baseProposal.source === 'FALLBACK'
          ? 'FALLBACK'
          : 'MASTER',
    typologyCode: baseProposal.typologyCode || null,
    standardActivityCode: null,
    productivityRateName: null,
    measurementRule: null,
    pricingRule: null,
    appliedAssumptions: {
      commercialRuntimeOutput: true,
      generatedFrom: line.generatedFrom,
      supportedSolutionCodes: line.supportedSolutionCodes,
      measurementLineIds: line.measurementLineIds,
      recipeLineIds: line.recipeLineIds,
      pricingLineIds: line.pricingLineIds,
      manualAdjustment: line.manualAdjustment || null,
    },
    economicStatus: line.economicStatus,
  }));

  return {
    ...baseProposal,
    chapters: runtimeOutput.chapters,
    lines,
    summary: {
      materialCost: runtimeOutput.summary.materialCost,
      laborCost: runtimeOutput.summary.laborCost,
      associatedCost: runtimeOutput.summary.indirectCost,
      internalCost: runtimeOutput.summary.internalCost || 0,
      contingencyAmount: runtimeOutput.summary.contingencyAmount,
      marginAmount: runtimeOutput.summary.marginAmount,
      commercialSubtotal: runtimeOutput.summary.commercialSubtotal || 0,
      vatAmount: runtimeOutput.summary.vatAmount,
      commercialTotal: runtimeOutput.summary.commercialTotal || 0,
    },
    notes: Array.from(new Set([...baseProposal.notes, ...runtimeOutput.warnings])),
    estimateStatus: runtimeOutput.status,
    integratedCostBuckets: runtimeOutput.projection.buckets,
    commercialEstimateProjection: runtimeOutput.projection,
    commercialRuntimeOutput: runtimeOutput,
  };
}
