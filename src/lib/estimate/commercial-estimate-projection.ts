import type {
  GeneratedEstimateLine,
  GeneratedEstimateProposal,
} from '@/lib/automation/estimate-generator';
import type { ExecutionContext } from '@/lib/discovery/types';
import type { VerticalSolutionCode } from '@/lib/discovery/technical-spec-types';
import type { MeasurementResult } from './measurement-types';
import type { RecipeResult } from './recipe-types';
import type { PricingResult } from './pricing-types';
import type {
  EstimateLineEconomicSnapshot,
  EstimatePriceSource,
  EstimateStatusSnapshot,
  InternalCostSource,
} from './estimate-status';
import {
  buildLegacyStructureScaffold,
  getCommercialStructureScaffold,
  matchLegacyProposalLineToBucket,
  type CommercialLineGeneratedFrom,
  type IntegratedEstimateBucketCode,
  type LegacyBucketMatch,
  type LegacyBucketMatchStrategy,
} from './estimate-structure-scaffold';

export type { CommercialLineGeneratedFrom, IntegratedEstimateBucketCode } from './estimate-structure-scaffold';

export type IntegratedEstimateCostBucket = {
  bucketCode: IntegratedEstimateBucketCode;
  source: InternalCostSource;
  generatedFrom: CommercialLineGeneratedFrom;
  pricingLineIds: string[];
  recipeLineIds: string[];
  measurementLineIds: string[];
  supportedSolutionCodes: VerticalSolutionCode[];
  matchedProposalLineCodes: string[];
  legacyMatchStrategy: LegacyBucketMatchStrategy;
  materialCost: number;
  laborCost: number;
  indirectCost: number;
  totalCost: number | null;
  priceStatus: 'PRICE_CONFIRMED' | 'PRICE_INFERRED' | 'PRICE_PENDING_VALIDATION';
  recipeCoveragePercent: number;
  priceCoveragePercent: number;
  dominantPriceSource?: EstimatePriceSource;
  provisional: boolean;
};

export type CommercialEstimateProjection = {
  status: EstimateStatusSnapshot;
  source: 'TECHNICAL_PIPELINE' | 'HYBRID' | 'PARAMETRIC_FALLBACK';
  buckets: IntegratedEstimateCostBucket[];
  measurementLines: MeasurementResult['lines'];
  recipeLines: RecipeResult['lines'];
  pricingLines: PricingResult['lines'];
  commercialLines: Array<{
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
    supportedSolutionCodes: VerticalSolutionCode[];
    measurementLineIds: string[];
    recipeLineIds: string[];
    pricingLineIds: string[];
    provisional: boolean;
  }>;
  summary: {
    materialCost: number;
    laborCost: number;
    indirectCost: number;
    internalCost: number | null;
    commercialSubtotal: number | null;
    commercialTotal: number | null;
  };
  warnings: string[];
  assumptions: string[];
};

type ProjectionInput = {
  proposal: GeneratedEstimateProposal;
  pricingResult?: PricingResult;
  recipeResult?: RecipeResult;
  measurementResult?: MeasurementResult;
  executionContext?: ExecutionContext;
  estimateStatus: EstimateStatusSnapshot;
};

function round(value: number) {
  return Number(value.toFixed(2));
}

function bucketFromSolutionCode(solutionCode: string): IntegratedEstimateBucketCode | null {
  if (solutionCode.startsWith('ROOM_')) return 'ROOMS';
  if (solutionCode.startsWith('BATH_')) return 'BATHS';
  if (solutionCode.startsWith('KITCHENETTE_')) return 'KITCHENETTES';
  if (solutionCode.startsWith('LEVELING_')) return 'LEVELING';
  if (solutionCode.startsWith('COMMON_AREA_')) return 'COMMON_AREAS';
  if (solutionCode.startsWith('WALL_TILE_') || solutionCode.startsWith('PAINT_') || solutionCode.startsWith('WET_AREA_')) return 'WALL_FINISHES';
  if (solutionCode.startsWith('PARTITION_')) return 'PARTITIONS';
  if (solutionCode.startsWith('CEILING_')) return 'CEILINGS';
  if (solutionCode.startsWith('FLOOR_') || solutionCode === 'SKIRTING_STD') return 'FLOORING';
  if (solutionCode.startsWith('DOOR_') || solutionCode.startsWith('WINDOW_') || solutionCode.startsWith('SHUTTER_')) return 'CARPENTRY';
  if (solutionCode.startsWith('ELECTRICAL_') || solutionCode.startsWith('LIGHTING_') || solutionCode.startsWith('PLUMBING_') || solutionCode.startsWith('DRAINAGE_')) return 'BASIC_MEP';
  return null;
}

function dominantPriceSource(priceSources: EstimatePriceSource[]): EstimatePriceSource {
  const priority: EstimatePriceSource[] = [
    'MANUAL_OVERRIDE',
    'SUPPLIER_OFFER',
    'PREFERRED_SUPPLIER',
    'CATALOG_REFERENCE',
    'PARAMETRIC_REFERENCE',
    'MISSING',
  ];

  for (const candidate of priority) {
    if (priceSources.includes(candidate)) return candidate;
  }

  return 'MISSING';
}

function aggregatePricingBuckets(input: ProjectionInput): Map<IntegratedEstimateBucketCode, IntegratedEstimateCostBucket> {
  const buckets = new Map<IntegratedEstimateBucketCode, IntegratedEstimateCostBucket>();
  const pricingResult = input.pricingResult;
  if (!pricingResult) return buckets;

  const recipeById = new Map((input.recipeResult?.lines || []).map((line) => [line.id, line]));
  const measurementById = new Map((input.measurementResult?.lines || []).map((line) => [line.id, line]));

  for (const line of pricingResult.lines) {
    const bucketCode = bucketFromSolutionCode(line.solutionCode);
    if (!bucketCode) continue;

    const recipeLine = recipeById.get(line.recipeLineId);
    const measurementLine = recipeLine ? measurementById.get(recipeLine.measurementLineId) : null;
    const existing = buckets.get(bucketCode) || {
      bucketCode,
      source: 'PARAMETRIC_MASTER' as InternalCostSource,
      generatedFrom: 'TECHNICAL' as CommercialLineGeneratedFrom,
      pricingLineIds: [],
      recipeLineIds: [],
      measurementLineIds: [],
      supportedSolutionCodes: [],
      matchedProposalLineCodes: [],
      legacyMatchStrategy: 'NONE' as LegacyBucketMatchStrategy,
      materialCost: 0,
      laborCost: 0,
      indirectCost: 0,
      totalCost: 0,
      priceStatus: 'PRICE_CONFIRMED' as IntegratedEstimateCostBucket['priceStatus'],
      recipeCoveragePercent: 100,
      priceCoveragePercent: 100,
      dominantPriceSource: 'MISSING' as EstimatePriceSource,
      provisional: false,
    };

    existing.pricingLineIds.push(line.id);
    existing.recipeLineIds.push(line.recipeLineId);
    if (measurementLine) existing.measurementLineIds.push(measurementLine.id);
    if (!existing.supportedSolutionCodes.includes(line.solutionCode)) {
      existing.supportedSolutionCodes.push(line.solutionCode);
    }
    existing.materialCost += line.materialCost || 0;
    existing.laborCost += line.laborCost || 0;
    existing.indirectCost += line.indirectCost || 0;
    existing.totalCost =
      existing.totalCost === null || line.totalCost == null
        ? null
        : round((existing.totalCost || 0) + (line.totalCost || 0));

    if (line.priceStatus === 'PRICE_PENDING_VALIDATION') {
      existing.priceStatus = 'PRICE_PENDING_VALIDATION';
      existing.totalCost = null;
      existing.provisional = true;
    } else if (
      line.priceStatus === 'PRICE_INFERRED' &&
      existing.priceStatus !== 'PRICE_PENDING_VALIDATION'
    ) {
      existing.priceStatus = 'PRICE_INFERRED';
    }

    existing.dominantPriceSource = dominantPriceSource([
      ...(existing.dominantPriceSource ? [existing.dominantPriceSource] : []),
      ...line.materialPricing.map((item) => item.priceSource),
      ...line.laborPricing.map((item) => item.priceSource),
    ]);

    buckets.set(bucketCode, existing);
  }

  for (const bucket of buckets.values()) {
    const totalLines = bucket.pricingLineIds.length || 1;
    const pending =
      pricingResult.lines.filter(
        (line) =>
          bucket.pricingLineIds.includes(line.id) &&
          line.priceStatus === 'PRICE_PENDING_VALIDATION'
      ).length || 0;
    const covered = totalLines - pending;
    bucket.priceCoveragePercent = Math.round((covered / totalLines) * 100);
    bucket.recipeCoveragePercent = 100;
  }

  return buckets;
}

function buildEconomicStatus(params: {
  bucket: IntegratedEstimateCostBucket;
  priceSource: EstimatePriceSource;
}): EstimateLineEconomicSnapshot {
  return {
    economicStatus:
      params.bucket.source === 'PARAMETRIC_MASTER'
        ? 'PARAMETRIC_PRELIMINARY'
        : params.bucket.priceStatus === 'PRICE_PENDING_VALIDATION'
          ? 'PRICE_PENDING_VALIDATION'
          : 'RECIPE_PRICED',
    priceSource: params.priceSource,
    pendingValidation: params.bucket.priceStatus === 'PRICE_PENDING_VALIDATION',
    costSource: params.bucket.source,
    commercialPriceProvisional: params.bucket.source === 'HYBRID',
    priceStatus: params.bucket.priceStatus,
    recipeCoverage: params.bucket.recipeCoveragePercent,
    priceCoverage: params.bucket.priceCoveragePercent,
    bucketCode: params.bucket.bucketCode,
  };
}

function asParametricLine(
  line: GeneratedEstimateLine,
  bucketCode?: IntegratedEstimateBucketCode | null
): GeneratedEstimateLine {
  return {
    ...line,
    economicStatus: {
      ...line.economicStatus,
      costSource: 'PARAMETRIC_MASTER',
      commercialPriceProvisional: false,
      recipeCoverage: line.economicStatus.recipeCoverage ?? 0,
      priceCoverage: line.economicStatus.priceCoverage ?? 0,
      bucketCode: bucketCode || line.economicStatus.bucketCode || null,
    },
  };
}

function integrateBucketWithParametricLines(
  bucketCode: IntegratedEstimateBucketCode,
  bucket: IntegratedEstimateCostBucket,
  matchedLines: GeneratedEstimateLine[],
  legacyMatch: LegacyBucketMatch | null,
  globalCommercialFactor: number
): GeneratedEstimateLine {
  const parametric = matchedLines.reduce(
    (acc, line) => {
      acc.materialCost += line.materialCost;
      acc.laborCost += line.laborCost;
      acc.associatedCost += line.associatedCost;
      acc.internalCost += line.internalCost;
      acc.commercialPrice += line.commercialPrice;
      acc.laborHours += line.laborHours;
      if (line.code) acc.matchedProposalLineCodes.push(line.code);
      return acc;
    },
    {
      materialCost: 0,
      laborCost: 0,
      associatedCost: 0,
      internalCost: 0,
      commercialPrice: 0,
      laborHours: 0,
      matchedProposalLineCodes: [] as string[],
    }
  );

  bucket.source =
    bucket.priceStatus === 'PRICE_PENDING_VALIDATION' ? 'HYBRID' : 'RECIPE_PRICED';
  bucket.generatedFrom = bucket.source === 'HYBRID' ? 'HYBRID' : 'TECHNICAL';
  bucket.provisional = bucket.source === 'HYBRID';
  bucket.matchedProposalLineCodes = parametric.matchedProposalLineCodes;
  bucket.legacyMatchStrategy = legacyMatch?.strategy || 'NONE';

  const scaffold = getCommercialStructureScaffold(bucketCode);

  const fallbackRatio =
    bucket.priceStatus === 'PRICE_PENDING_VALIDATION'
      ? Math.max(0, 1 - bucket.priceCoveragePercent / 100)
      : 0;

  const materialCost = round(bucket.materialCost + parametric.materialCost * fallbackRatio);
  const laborCost = round(bucket.laborCost + parametric.laborCost * fallbackRatio);
  const indirectCost = round(bucket.indirectCost + parametric.associatedCost * fallbackRatio);
  const internalCost = round(materialCost + laborCost + indirectCost);
  const parametricCommercialFactor =
    parametric.internalCost > 0
      ? parametric.commercialPrice / parametric.internalCost
      : globalCommercialFactor;
  const commercialPrice = round(
    internalCost * (parametricCommercialFactor || globalCommercialFactor || 1.24)
  );

  return {
    chapter: scaffold.chapter,
    code: scaffold.code,
    description: `${scaffold.description} integradas desde pricing tecnico${bucket.provisional ? ' (provisional)' : ''}`,
    unit: scaffold.unit,
    quantity: 1,
    commercialPrice,
    internalCost,
    laborHours: round(parametric.laborHours),
    laborCost,
    materialCost,
    associatedCost: indirectCost,
    kind: bucket.provisional ? 'PROVISIONAL' : 'DIRECT',
    source: matchedLines[0]?.source || 'MASTER',
    typologyCode: matchedLines[0]?.typologyCode || null,
    standardActivityCode: null,
    productivityRateName: null,
    measurementRule: null,
    pricingRule: null,
    appliedAssumptions: {
      integrationBucket: bucketCode,
      pricingLineIds: bucket.pricingLineIds,
      recipeLineIds: bucket.recipeLineIds,
      measurementLineIds: bucket.measurementLineIds,
      supportedSolutionCodes: bucket.supportedSolutionCodes,
      replacedParametricCodes: matchedLines.map((line) => line.code).filter(Boolean),
    },
    economicStatus: buildEconomicStatus({
      bucket,
      priceSource:
        bucket.priceStatus === 'PRICE_PENDING_VALIDATION'
          ? 'MISSING'
          : bucket.dominantPriceSource || 'CATALOG_REFERENCE',
    }),
  };
}

function summarizeProposal(lines: GeneratedEstimateLine[], baseSummary: GeneratedEstimateProposal['summary']) {
  const materialCost = round(lines.reduce((sum, line) => sum + line.materialCost, 0));
  const laborCost = round(lines.reduce((sum, line) => sum + line.laborCost, 0));
  const associatedCost = round(lines.reduce((sum, line) => sum + line.associatedCost, 0));
  const internalCost = round(materialCost + laborCost + associatedCost);
  const commercialSubtotal = round(lines.reduce((sum, line) => sum + line.commercialPrice, 0));
  const vatAmount = round(commercialSubtotal * 0.21);
  const contingencyRatio =
    baseSummary.internalCost > 0 ? baseSummary.contingencyAmount / baseSummary.internalCost : 0.06;
  const marginRatio =
    baseSummary.internalCost > 0 ? baseSummary.marginAmount / baseSummary.internalCost : 0.18;

  return {
    materialCost,
    laborCost,
    associatedCost,
    internalCost,
    contingencyAmount: round(internalCost * contingencyRatio),
    marginAmount: round(internalCost * marginRatio),
    commercialSubtotal,
    vatAmount,
    commercialTotal: round(commercialSubtotal + vatAmount),
  };
}

function projectGlobalSource(
  resultLines: GeneratedEstimateLine[],
  buckets: IntegratedEstimateCostBucket[]
): CommercialEstimateProjection['source'] {
  const hasTechnicalBuckets = buckets.length > 0;
  const hasParametricLines = resultLines.some(
    (line) => line.economicStatus.costSource === 'PARAMETRIC_MASTER'
  );
  const hasHybrid = buckets.some((bucket) => bucket.source === 'HYBRID');

  if (!hasTechnicalBuckets) return 'PARAMETRIC_FALLBACK';
  if (hasHybrid || hasParametricLines) return 'HYBRID';
  return 'TECHNICAL_PIPELINE';
}

export function buildCommercialEstimateProjection(input: ProjectionInput): CommercialEstimateProjection {
  const pricingBuckets = aggregatePricingBuckets(input);
  const legacyScaffold = buildLegacyStructureScaffold(input.proposal);

  const resultLines: GeneratedEstimateLine[] = [];
  const integratedBuckets: IntegratedEstimateCostBucket[] = [];
  const consumedProposalLineIndexes = new Set<number>();
  const globalCommercialFactor = legacyScaffold.globalCommercialFactor;

  for (const [bucketCode, bucket] of pricingBuckets.entries()) {
    const legacyMatch = legacyScaffold.bucketMatches.get(bucketCode) || null;
    const matchedLines = legacyMatch?.lines || [];
    const integratedLine = integrateBucketWithParametricLines(
      bucketCode,
      bucket,
      matchedLines,
      legacyMatch,
      globalCommercialFactor
    );
    resultLines.push(integratedLine);
    integratedBuckets.push(bucket);
    legacyMatch?.lineIndexes.forEach((index) => consumedProposalLineIndexes.add(index));
  }

  for (let index = 0; index < input.proposal.lines.length; index += 1) {
    if (consumedProposalLineIndexes.has(index)) continue;

    const line = input.proposal.lines[index];
    const match = matchLegacyProposalLineToBucket(line);
    resultLines.push(asParametricLine(line, match?.bucketCode || null));
  }

  const updatedSummary = summarizeProposal(resultLines, input.proposal.summary);
  const source = projectGlobalSource(resultLines, integratedBuckets);
  const warnings = [
    ...input.proposal.notes,
    ...(input.measurementResult?.warnings || []),
    ...(input.recipeResult?.warnings || []),
    ...(input.pricingResult?.warnings || []),
    ...(input.executionContext?.warnings || []),
  ];
  const assumptions = [
    ...(input.measurementResult?.assumptions || []),
    ...(input.recipeResult?.assumptions || []),
    ...(input.pricingResult?.assumptions || []),
    ...(input.executionContext?.assumptions || []),
  ];

  return {
    status: input.estimateStatus,
    source,
    buckets: integratedBuckets,
    measurementLines: input.measurementResult?.lines || [],
    recipeLines: input.recipeResult?.lines || [],
    pricingLines: input.pricingResult?.lines || [],
    commercialLines: resultLines.map((line, index) => ({
      id: `commercial-line-${index + 1}`,
      chapter: line.chapter,
      code: line.code || null,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      internalCost: line.internalCost,
      commercialPrice: line.commercialPrice,
      costSource: line.economicStatus.costSource,
      generatedFrom:
        integratedBuckets.find((bucket) => bucket.bucketCode === line.economicStatus.bucketCode)
          ?.generatedFrom ||
        (line.economicStatus.costSource === 'HYBRID' ? 'HYBRID' : 'LEGACY_FALLBACK'),
      supportedSolutionCodes:
        integratedBuckets.find((bucket) => bucket.bucketCode === line.economicStatus.bucketCode)?.supportedSolutionCodes || [],
      measurementLineIds:
        integratedBuckets.find((bucket) => bucket.bucketCode === line.economicStatus.bucketCode)?.measurementLineIds || [],
      recipeLineIds:
        integratedBuckets.find((bucket) => bucket.bucketCode === line.economicStatus.bucketCode)?.recipeLineIds || [],
      pricingLineIds:
        integratedBuckets.find((bucket) => bucket.bucketCode === line.economicStatus.bucketCode)?.pricingLineIds || [],
      provisional: Boolean(line.economicStatus.commercialPriceProvisional),
    })),
    summary: {
      materialCost: updatedSummary.materialCost,
      laborCost: updatedSummary.laborCost,
      indirectCost: updatedSummary.associatedCost,
      internalCost: updatedSummary.internalCost,
      commercialSubtotal: updatedSummary.commercialSubtotal,
      commercialTotal: updatedSummary.commercialTotal,
    },
    warnings: Array.from(new Set(warnings.filter(Boolean))),
    assumptions: Array.from(new Set(assumptions.filter(Boolean))),
  };
}

export function applyCommercialEstimateProjectionToProposal(
  proposal: GeneratedEstimateProposal,
  projection: CommercialEstimateProjection
): GeneratedEstimateProposal & {
  integratedCostBuckets: IntegratedEstimateCostBucket[];
  commercialEstimateProjection: CommercialEstimateProjection;
} {
  const pricingLineIdSet = new Set(projection.pricingLines.map((line) => line.id));
  const recipeLineIdSet = new Set(projection.recipeLines.map((line) => line.id));
  const measurementLineIdSet = new Set(projection.measurementLines.map((line) => line.id));

  const lines: GeneratedEstimateLine[] = projection.commercialLines.map((line) => {
    const bucket = projection.buckets.find((item) => item.pricingLineIds.some((id) => line.pricingLineIds.includes(id)));
    const economicStatus: EstimateLineEconomicSnapshot = {
      economicStatus:
        line.costSource === 'PARAMETRIC_MASTER'
          ? 'PARAMETRIC_PRELIMINARY'
          : bucket?.priceStatus === 'PRICE_PENDING_VALIDATION'
            ? 'PRICE_PENDING_VALIDATION'
            : 'RECIPE_PRICED',
      priceSource:
        bucket?.dominantPriceSource ||
        (line.costSource === 'PARAMETRIC_MASTER' ? 'PARAMETRIC_REFERENCE' : 'CATALOG_REFERENCE'),
      pendingValidation: bucket?.priceStatus === 'PRICE_PENDING_VALIDATION',
      costSource: line.costSource,
      commercialPriceProvisional: line.provisional,
      priceStatus: bucket?.priceStatus || 'PRICE_PENDING_VALIDATION',
      recipeCoverage: bucket?.recipeCoveragePercent || 0,
      priceCoverage: bucket?.priceCoveragePercent || 0,
      bucketCode: bucket?.bucketCode || null,
    };

    return {
      chapter: line.chapter,
      code: line.code || null,
      description: line.description,
      unit: line.unit,
      quantity: line.quantity,
      commercialPrice: line.commercialPrice ?? 0,
      internalCost: line.internalCost ?? 0,
      laborHours: 0,
      laborCost: bucket?.laborCost || 0,
      materialCost: bucket?.materialCost || 0,
      associatedCost: bucket?.indirectCost || 0,
      kind: line.provisional ? 'PROVISIONAL' : 'DIRECT',
      source:
        line.costSource === 'PARAMETRIC_MASTER'
          ? proposal.source
          : proposal.source === 'FALLBACK'
            ? 'FALLBACK'
            : 'MASTER',
      typologyCode: proposal.typologyCode || null,
      standardActivityCode: null,
      productivityRateName: null,
      measurementRule: null,
      pricingRule: null,
      appliedAssumptions: {
        commercialProjection: true,
        generatedFrom: line.generatedFrom,
        measurementLineIds: line.measurementLineIds.filter((id) => measurementLineIdSet.has(id)),
        recipeLineIds: line.recipeLineIds.filter((id) => recipeLineIdSet.has(id)),
        pricingLineIds: line.pricingLineIds.filter((id) => pricingLineIdSet.has(id)),
        supportedSolutionCodes: line.supportedSolutionCodes,
      },
      economicStatus,
    };
  });

  return {
    ...proposal,
    chapters: Array.from(new Set(lines.map((line) => line.chapter))),
    lines,
    summary: {
      ...proposal.summary,
      materialCost: projection.summary.materialCost || 0,
      laborCost: projection.summary.laborCost || 0,
      associatedCost: projection.summary.indirectCost || 0,
      internalCost: projection.summary.internalCost || 0,
      commercialSubtotal: projection.summary.commercialSubtotal || 0,
      vatAmount: round((projection.summary.commercialSubtotal || 0) * 0.21),
      commercialTotal:
        projection.summary.commercialTotal ||
        round((projection.summary.commercialSubtotal || 0) * 1.21),
    },
    notes: Array.from(new Set([...proposal.notes, ...projection.warnings])),
    estimateStatus: projection.status,
    integratedCostBuckets: projection.buckets,
    commercialEstimateProjection: projection,
  };
}
