import {
  mergeLineEconomicStatus,
  parseGenerationNotes,
  parseLineEconomicStatus,
  serializeGenerationNotes,
  type EstimateLineEconomicSnapshot,
  type EstimateStatusSnapshot,
} from '@/lib/estimate/estimate-status';
import type {
  CommercialEstimateProjection,
  IntegratedEstimateCostBucket,
} from '@/lib/estimate/commercial-estimate-projection';
import type { CommercialEstimateRuntimeOutput } from '@/lib/estimate/commercial-estimate-runtime';

export type InternalAnalysisLineInput = {
  chapter: string;
  code?: string | null;
  description: string;
  unit: string;
  quantity: number;
  commercialPrice: number;
  internalCost: number;
  laborHours: number;
  laborCost: number;
  materialCost: number;
  associatedCost: number;
  kind: string;
  source: 'MASTER' | 'FALLBACK';
  typologyCode?: string | null;
  standardActivityCode?: string | null;
  productivityRateName?: string | null;
  measurementRule?: Record<string, unknown> | null;
  pricingRule?: Record<string, unknown> | null;
  appliedAssumptions?: Record<string, unknown> | null;
  economicStatus?: EstimateLineEconomicSnapshot | null;
};

export type InternalAnalysisSummaryInput = {
  materialCost: number;
  laborCost: number;
  associatedCost: number;
  internalCost: number;
  contingencyAmount: number;
  marginAmount: number;
  commercialSubtotal: number;
  vatAmount: number;
  commercialTotal: number;
};

export type EstimateInternalAnalysisInput = {
  source: 'MASTER' | 'FALLBACK';
  typologyCode?: string | null;
  seedVersion?: number | null;
  notes?: string[];
  estimateStatus?: EstimateStatusSnapshot | null;
  integratedCostBuckets?: IntegratedEstimateCostBucket[];
  commercialEstimateProjection?: CommercialEstimateProjection | null;
  commercialRuntimeOutput?: CommercialEstimateRuntimeOutput | null;
  summary: InternalAnalysisSummaryInput;
  lines: InternalAnalysisLineInput[];
};

function asFiniteNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function normalizeInternalAnalysis(input: any): EstimateInternalAnalysisInput | null {
  if (!input || typeof input !== 'object') return null;
  if (!Array.isArray(input.lines) || !input.summary || typeof input.summary !== 'object') return null;

  const lines = input.lines
    .filter((line: any) => line && typeof line === 'object' && typeof line.description === 'string')
    .map((line: any) => ({
      chapter: typeof line.chapter === 'string' ? line.chapter : '01 GENERAL',
      code: typeof line.code === 'string' ? line.code : null,
      description: line.description,
      unit: typeof line.unit === 'string' ? line.unit : 'ud',
      quantity: asFiniteNumber(line.quantity, 0),
      commercialPrice: asFiniteNumber(line.commercialPrice, 0),
      internalCost: asFiniteNumber(line.internalCost, 0),
      laborHours: asFiniteNumber(line.laborHours, 0),
      laborCost: asFiniteNumber(line.laborCost, 0),
      materialCost: asFiniteNumber(line.materialCost, 0),
      associatedCost: asFiniteNumber(line.associatedCost, 0),
      kind: typeof line.kind === 'string' ? line.kind : 'DIRECT',
      source: line.source === 'FALLBACK' ? 'FALLBACK' : 'MASTER',
      typologyCode: typeof line.typologyCode === 'string' ? line.typologyCode : null,
      standardActivityCode: typeof line.standardActivityCode === 'string' ? line.standardActivityCode : null,
      productivityRateName: typeof line.productivityRateName === 'string' ? line.productivityRateName : null,
      measurementRule: line.measurementRule && typeof line.measurementRule === 'object' ? line.measurementRule : null,
      pricingRule: line.pricingRule && typeof line.pricingRule === 'object' ? line.pricingRule : null,
      appliedAssumptions: line.appliedAssumptions && typeof line.appliedAssumptions === 'object' ? line.appliedAssumptions : null,
      economicStatus:
        line.economicStatus && typeof line.economicStatus === 'object'
          ? (line.economicStatus as EstimateLineEconomicSnapshot)
          : parseLineEconomicStatus(
              line.appliedAssumptions && typeof line.appliedAssumptions === 'object'
                ? line.appliedAssumptions
                : null
            ),
    }));

  if (lines.length === 0) return null;

  const summary = {
    materialCost: asFiniteNumber(input.summary.materialCost, 0),
    laborCost: asFiniteNumber(input.summary.laborCost, 0),
    associatedCost: asFiniteNumber(input.summary.associatedCost, 0),
    internalCost: asFiniteNumber(input.summary.internalCost, 0),
    contingencyAmount: asFiniteNumber(input.summary.contingencyAmount, 0),
    marginAmount: asFiniteNumber(input.summary.marginAmount, 0),
    commercialSubtotal: asFiniteNumber(input.summary.commercialSubtotal, 0),
    vatAmount: asFiniteNumber(input.summary.vatAmount, 0),
    commercialTotal: asFiniteNumber(input.summary.commercialTotal, 0),
  };

  const parsedNotes = parseGenerationNotes(input.generationNotes ?? input.notes);

  return {
    source: input.source === 'FALLBACK' ? 'FALLBACK' : 'MASTER',
    typologyCode: typeof input.typologyCode === 'string' ? input.typologyCode : null,
    seedVersion: typeof input.seedVersion === 'number' ? input.seedVersion : null,
    notes: parsedNotes.notes,
    estimateStatus: parsedNotes.estimateStatus ?? (input.estimateStatus && typeof input.estimateStatus === 'object'
      ? (input.estimateStatus as EstimateStatusSnapshot)
      : null),
    integratedCostBuckets: parsedNotes.integratedCostBuckets,
    commercialEstimateProjection:
      parsedNotes.commercialEstimateProjection && typeof parsedNotes.commercialEstimateProjection === 'object'
        ? (parsedNotes.commercialEstimateProjection as CommercialEstimateProjection)
        : input.commercialEstimateProjection && typeof input.commercialEstimateProjection === 'object'
          ? (input.commercialEstimateProjection as CommercialEstimateProjection)
          : null,
    commercialRuntimeOutput:
      parsedNotes.commercialRuntimeOutput && typeof parsedNotes.commercialRuntimeOutput === 'object'
        ? (parsedNotes.commercialRuntimeOutput as CommercialEstimateRuntimeOutput)
        : input.commercialRuntimeOutput && typeof input.commercialRuntimeOutput === 'object'
          ? (input.commercialRuntimeOutput as CommercialEstimateRuntimeOutput)
          : null,
    summary,
    lines,
  };
}

export function toEstimateInternalAnalysisCreate(input: EstimateInternalAnalysisInput) {
  return {
    generationSource: input.source,
    typologyCode: input.typologyCode || null,
    seedVersion: input.seedVersion ?? null,
    materialCostTotal: input.summary.materialCost,
    laborCostTotal: input.summary.laborCost,
    associatedCostTotal: input.summary.associatedCost,
    internalCostTotal: input.summary.internalCost,
    contingencyAmount: input.summary.contingencyAmount,
    marginAmount: input.summary.marginAmount,
    commercialSubtotal: input.summary.commercialSubtotal,
    vatAmount: input.summary.vatAmount,
    commercialTotal: input.summary.commercialTotal,
    generationNotes: serializeGenerationNotes(
      input.notes,
      input.estimateStatus,
      input.integratedCostBuckets,
      input.commercialEstimateProjection,
      input.commercialRuntimeOutput
    ),
    lines: {
      create: input.lines.map((line) => ({
        chapter: line.chapter,
        code: line.code || null,
        description: line.description,
        unit: line.unit,
        quantity: line.quantity,
        lineKind: line.kind,
        materialCost: line.materialCost,
        laborHours: line.laborHours,
        laborCost: line.laborCost,
        associatedCost: line.associatedCost,
        internalCost: line.internalCost,
        commercialPrice: line.commercialPrice,
        generationSource: line.source,
        typologyCode: line.typologyCode || null,
        standardActivityCode: line.standardActivityCode || null,
        productivityRateName: line.productivityRateName || null,
        measurementRule: line.measurementRule || null,
        pricingRule: line.pricingRule || null,
        appliedAssumptions: mergeLineEconomicStatus(line.appliedAssumptions, line.economicStatus || {
          economicStatus: 'PARAMETRIC_PRELIMINARY',
          priceSource: 'PARAMETRIC_REFERENCE',
          pendingValidation: true,
          costSource: 'PARAMETRIC_MASTER',
          commercialPriceProvisional: false,
          priceStatus: 'PRICE_PENDING_VALIDATION',
          recipeCoverage: 0,
          priceCoverage: 0,
          bucketCode: null,
        }),
      })),
    },
  };
}
