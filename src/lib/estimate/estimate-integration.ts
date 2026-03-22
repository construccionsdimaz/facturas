import type {
  GeneratedEstimateLine,
  GeneratedEstimateProposal,
} from '@/lib/automation/estimate-generator';
import type { PricingResult } from './pricing-types';
import type {
  EstimateLineEconomicSnapshot,
  EstimatePriceSource,
  InternalCostSource,
} from './estimate-status';

export type IntegratedEstimateBucketCode =
  | 'ROOMS'
  | 'BATHS'
  | 'KITCHENETTES'
  | 'LEVELING'
  | 'COMMON_AREAS';

export type IntegratedEstimateCostBucket = {
  bucketCode: IntegratedEstimateBucketCode;
  source: InternalCostSource;
  pricingLineIds: string[];
  recipeLineIds: string[];
  materialCost: number;
  laborCost: number;
  indirectCost: number;
  totalCost: number | null;
  priceStatus: 'PRICE_CONFIRMED' | 'PRICE_INFERRED' | 'PRICE_PENDING_VALIDATION';
  recipeCoveragePercent: number;
  priceCoveragePercent: number;
  dominantPriceSource?: EstimatePriceSource;
};

type IntegratedProposalResult = {
  proposal: GeneratedEstimateProposal & {
    integratedCostBuckets: IntegratedEstimateCostBucket[];
  };
};

const DEFAULT_BUCKET_LABELS: Record<IntegratedEstimateBucketCode, string> = {
  ROOMS: 'Habitaciones / unidades tipo',
  BATHS: 'Banos repetitivos',
  KITCHENETTES: 'Kitchenettes',
  LEVELING: 'Nivelacion y regularizacion',
  COMMON_AREAS: 'Zonas comunes',
};

const DEFAULT_BUCKET_CODES: Record<IntegratedEstimateBucketCode, string> = {
  ROOMS: 'INT-ROOMS',
  BATHS: 'INT-BATHS',
  KITCHENETTES: 'INT-KITCH',
  LEVELING: 'INT-LEVEL',
  COMMON_AREAS: 'INT-COMMON',
};

const DEFAULT_BUCKET_CHAPTERS: Record<IntegratedEstimateBucketCode, string> = {
  ROOMS: '05 ACABADOS Y EQUIPAMIENTO',
  BATHS: '05 ACABADOS Y EQUIPAMIENTO',
  KITCHENETTES: '05 ACABADOS Y EQUIPAMIENTO',
  LEVELING: '03 ALBANILERIA Y REDISTRIBUCION',
  COMMON_AREAS: '06 ZONAS COMUNES Y REMATES',
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
  return null;
}

function bucketFromProposalLine(line: GeneratedEstimateLine): IntegratedEstimateBucketCode | null {
  const code = (line.code || '').toUpperCase();
  const text = `${line.chapter} ${line.description}`.toUpperCase();

  if (code === 'ACABADOS_HAB' || /HABITACI|UNIDADES|COLIVING/.test(text)) return 'ROOMS';
  if (code === 'BANOS_REPETITIVOS' || /BANOS|SANITARIOS/.test(text)) return 'BATHS';
  if (code === 'COCINAS_OFFICE' || /COCINA|KITCHENETTE|OFFICE/.test(text)) return 'KITCHENETTES';
  if (code === 'ZONAS_COMUNES' || /ZONAS COMUNES|PORTAL|PASILLOS|ESCALERAS/.test(text)) return 'COMMON_AREAS';
  if (code === 'PAVIMENTOS' || /NIVELACI|REGULARIZACI|PAVIMENT/.test(text)) return 'LEVELING';
  if (code === 'REDISTRIBUCION' && /REGULARIZACI|NIVELACI/.test(text)) return 'LEVELING';

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

function aggregatePricingBuckets(
  pricingResult?: PricingResult
): Map<IntegratedEstimateBucketCode, IntegratedEstimateCostBucket> {
  const buckets = new Map<IntegratedEstimateBucketCode, IntegratedEstimateCostBucket>();
  if (!pricingResult) return buckets;

  for (const line of pricingResult.lines) {
    const bucketCode = bucketFromSolutionCode(line.solutionCode);
    if (!bucketCode) continue;

    const existing = buckets.get(bucketCode) || {
      bucketCode,
      source: 'PARAMETRIC_MASTER' as InternalCostSource,
      pricingLineIds: [],
      recipeLineIds: [],
      materialCost: 0,
      laborCost: 0,
      indirectCost: 0,
      totalCost: 0,
      priceStatus: 'PRICE_CONFIRMED' as IntegratedEstimateCostBucket['priceStatus'],
      recipeCoveragePercent: 100,
      priceCoveragePercent: 100,
      dominantPriceSource: 'MISSING' as EstimatePriceSource,
    };

    existing.pricingLineIds.push(line.id);
    existing.recipeLineIds.push(line.recipeLineId);
    existing.materialCost += line.materialCost || 0;
    existing.laborCost += line.laborCost || 0;
    existing.indirectCost += line.indirectCost || 0;
    existing.totalCost =
      existing.totalCost === null || line.totalCost == null
        ? null
        : round((existing.totalCost || 0) + (line.totalCost || 0));
    existing.recipeCoveragePercent = 100;

    if (line.priceStatus === 'PRICE_PENDING_VALIDATION') {
      existing.priceStatus = 'PRICE_PENDING_VALIDATION';
      existing.totalCost = null;
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
  }

  return buckets;
}

function buildIntegratedEconomicStatus(params: {
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

function integrateBucketWithParametricLines(
  bucketCode: IntegratedEstimateBucketCode,
  bucket: IntegratedEstimateCostBucket,
  matchedLines: GeneratedEstimateLine[],
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
      return acc;
    },
    {
      materialCost: 0,
      laborCost: 0,
      associatedCost: 0,
      internalCost: 0,
      commercialPrice: 0,
      laborHours: 0,
    }
  );

  bucket.source =
    bucket.priceStatus === 'PRICE_PENDING_VALIDATION' ? 'HYBRID' : 'RECIPE_PRICED';

  const fallbackRatio =
    bucket.priceStatus === 'PRICE_PENDING_VALIDATION'
      ? Math.max(0, 1 - bucket.priceCoveragePercent / 100)
      : 0;

  const materialCost = round(
    bucket.materialCost + parametric.materialCost * fallbackRatio
  );
  const laborCost = round(bucket.laborCost + parametric.laborCost * fallbackRatio);
  const associatedCost = round(
    bucket.indirectCost + parametric.associatedCost * fallbackRatio
  );
  const internalCost = round(materialCost + laborCost + associatedCost);

  const parametricCommercialFactor =
    parametric.internalCost > 0
      ? parametric.commercialPrice / parametric.internalCost
      : globalCommercialFactor;
  const commercialPrice = round(
    internalCost * (parametricCommercialFactor || globalCommercialFactor || 1.24)
  );
  const isHybrid = bucket.source === 'HYBRID';

  const inferredSource =
    bucket.priceStatus === 'PRICE_PENDING_VALIDATION'
      ? 'MISSING'
      : bucket.dominantPriceSource || 'CATALOG_REFERENCE';

  return {
    chapter: matchedLines[0]?.chapter || DEFAULT_BUCKET_CHAPTERS[bucketCode],
    code: DEFAULT_BUCKET_CODES[bucketCode],
    description: `${DEFAULT_BUCKET_LABELS[bucketCode]} integradas desde pricing tecnico${isHybrid ? ' (provisional)' : ''}`,
    unit: 'lot',
    quantity: 1,
    commercialPrice,
    internalCost,
    laborHours: round(parametric.laborHours),
    laborCost,
    materialCost,
    associatedCost,
    kind: isHybrid ? 'PROVISIONAL' : 'DIRECT',
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
      replacedParametricCodes: matchedLines.map((line) => line.code).filter(Boolean),
    },
    economicStatus: buildIntegratedEconomicStatus({
      bucket,
      priceSource: inferredSource,
    }),
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

function summarizeProposal(
  lines: GeneratedEstimateLine[],
  baseSummary: GeneratedEstimateProposal['summary']
) {
  const materialCost = round(lines.reduce((sum, line) => sum + line.materialCost, 0));
  const laborCost = round(lines.reduce((sum, line) => sum + line.laborCost, 0));
  const associatedCost = round(
    lines.reduce((sum, line) => sum + line.associatedCost, 0)
  );
  const internalCost = round(materialCost + laborCost + associatedCost);
  const marginRatio =
    baseSummary.internalCost > 0 ? baseSummary.marginAmount / baseSummary.internalCost : 0.18;
  const contingencyRatio =
    baseSummary.internalCost > 0
      ? baseSummary.contingencyAmount / baseSummary.internalCost
      : 0.06;
  const contingencyAmount = round(internalCost * contingencyRatio);
  const marginAmount = round(internalCost * marginRatio);
  const commercialSubtotal = round(
    lines.reduce((sum, line) => sum + line.commercialPrice, 0)
  );
  const vatAmount = round(commercialSubtotal * 0.21);

  return {
    materialCost,
    laborCost,
    associatedCost,
    internalCost,
    contingencyAmount,
    marginAmount,
    commercialSubtotal,
    vatAmount,
    commercialTotal: round(commercialSubtotal + vatAmount),
  };
}

export function integratePricingIntoEstimateProposal(
  proposal: GeneratedEstimateProposal,
  pricingResult?: PricingResult
): IntegratedProposalResult {
  const pricingBuckets = aggregatePricingBuckets(pricingResult);
  const lineBuckets = proposal.lines.map((line) => bucketFromProposalLine(line));
  const matchedLineIndexesByBucket = new Map<IntegratedEstimateBucketCode, number[]>();

  lineBuckets.forEach((bucketCode, index) => {
    if (!bucketCode) return;
    const existing = matchedLineIndexesByBucket.get(bucketCode) || [];
    existing.push(index);
    matchedLineIndexesByBucket.set(bucketCode, existing);
  });

  const resultLines: GeneratedEstimateLine[] = [];
  const integratedBuckets: IntegratedEstimateCostBucket[] = [];
  const integratedBucketKeys = new Set<IntegratedEstimateBucketCode>();
  const globalCommercialFactor =
    proposal.summary.internalCost > 0
      ? proposal.summary.commercialSubtotal / proposal.summary.internalCost
      : 1.24;

  for (let index = 0; index < proposal.lines.length; index += 1) {
    const line = proposal.lines[index];
    const bucketCode = lineBuckets[index];

    if (!bucketCode) {
      resultLines.push(asParametricLine(line));
      continue;
    }

    const matchedIndexes = matchedLineIndexesByBucket.get(bucketCode) || [];
    const firstIndex = matchedIndexes[0];
    const bucket = pricingBuckets.get(bucketCode);

    if (!bucket) {
      resultLines.push(asParametricLine(line, bucketCode));
      continue;
    }

    if (index !== firstIndex) {
      continue;
    }

    const matchedLines = matchedIndexes.map(
      (matchedIndex) => proposal.lines[matchedIndex]
    );
    const integratedLine = integrateBucketWithParametricLines(
      bucketCode,
      bucket,
      matchedLines,
      globalCommercialFactor
    );
    resultLines.push(integratedLine);
    integratedBuckets.push(bucket);
    integratedBucketKeys.add(bucketCode);
  }

  for (const [bucketCode, bucket] of pricingBuckets.entries()) {
    if (integratedBucketKeys.has(bucketCode)) continue;

    const fallbackInternalCost =
      bucket.totalCost ?? round(bucket.materialCost + bucket.laborCost + bucket.indirectCost);
    bucket.source =
      bucket.priceStatus === 'PRICE_PENDING_VALIDATION' ? 'HYBRID' : 'RECIPE_PRICED';

    resultLines.push({
      chapter: DEFAULT_BUCKET_CHAPTERS[bucketCode],
      code: DEFAULT_BUCKET_CODES[bucketCode],
      description: `${DEFAULT_BUCKET_LABELS[bucketCode]} integradas desde pricing tecnico${bucket.source === 'HYBRID' ? ' (provisional)' : ''}`,
      unit: 'lot',
      quantity: 1,
      commercialPrice: round(fallbackInternalCost * globalCommercialFactor),
      internalCost: fallbackInternalCost,
      laborHours: 0,
      laborCost: bucket.laborCost,
      materialCost: bucket.materialCost,
      associatedCost: bucket.indirectCost,
      kind: bucket.source === 'HYBRID' ? 'PROVISIONAL' : 'DIRECT',
      source: proposal.source,
      typologyCode: proposal.typologyCode || null,
      standardActivityCode: null,
      productivityRateName: null,
      measurementRule: null,
      pricingRule: null,
      appliedAssumptions: {
        integrationBucket: bucketCode,
        pricingLineIds: bucket.pricingLineIds,
        recipeLineIds: bucket.recipeLineIds,
        syntheticIntegratedLine: true,
      },
      economicStatus: buildIntegratedEconomicStatus({
        bucket,
        priceSource:
          bucket.priceStatus === 'PRICE_PENDING_VALIDATION'
            ? 'MISSING'
            : bucket.dominantPriceSource || 'CATALOG_REFERENCE',
      }),
    });
    integratedBuckets.push(bucket);
  }

  const updatedSummary = summarizeProposal(resultLines, proposal.summary);

  return {
    proposal: {
      ...proposal,
      chapters: Array.from(new Set(resultLines.map((line) => line.chapter))),
      lines: resultLines,
      summary: updatedSummary,
      integratedCostBuckets: integratedBuckets,
    },
  };
}
