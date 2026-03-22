import type { CommercialEstimateRuntimeOutput } from './commercial-estimate-runtime';
import type { CommercialEstimateProjection } from './commercial-estimate-projection';
import type { EstimateStatusSnapshot } from './estimate-status';
import { deriveLegacyItemsFromRuntimeOutput } from './estimate-runtime-editing';
import { readCommercialEstimateReadModel } from '@/lib/estimates/internal-analysis';

export type EstimateLegacyItemCompat = {
  description: string;
  quantity: number;
  price: number;
  unit: string;
  chapter: string;
};

export type EstimateOperationalMaterialization = {
  source: 'RUNTIME_OUTPUT' | 'PROJECTION' | 'LEGACY';
  runtimeOutput: CommercialEstimateRuntimeOutput | null;
  projection: CommercialEstimateProjection | null;
  estimateStatus: EstimateStatusSnapshot | null;
  chapters: string[];
  summary: {
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
  legacyItems: EstimateLegacyItemCompat[];
};

function round(value: number) {
  return Number(value.toFixed(2));
}

export function materializeEstimateOperationalView(input: {
  generationNotes?: unknown;
  commercialRuntimeOutput?: CommercialEstimateRuntimeOutput | null;
  commercialEstimateProjection?: CommercialEstimateProjection | null;
  estimateStatus?: EstimateStatusSnapshot | null;
  legacyItems?: EstimateLegacyItemCompat[] | null;
  legacySummary?: Partial<EstimateOperationalMaterialization['summary']> | null;
}): EstimateOperationalMaterialization {
  const readModel = readCommercialEstimateReadModel({
    generationNotes: input.generationNotes,
    commercialRuntimeOutput: input.commercialRuntimeOutput,
    commercialEstimateProjection: input.commercialEstimateProjection,
  });

  if (readModel.commercialRuntimeOutput) {
    const runtimeOutput = readModel.commercialRuntimeOutput;
    return {
      source: 'RUNTIME_OUTPUT',
      runtimeOutput,
      projection: runtimeOutput.projection,
      estimateStatus: input.estimateStatus || runtimeOutput.status,
      chapters: runtimeOutput.chapters,
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
      legacyItems: deriveLegacyItemsFromRuntimeOutput(runtimeOutput),
    };
  }

  if (readModel.commercialEstimateProjection) {
    const projection = readModel.commercialEstimateProjection;
    const chapters = Array.from(new Set(projection.commercialLines.map((line) => line.chapter)));
    const internalCost = projection.summary.internalCost || 0;
    const contingencyAmount = round(internalCost * 0.06);
    const marginAmount = round(internalCost * 0.18);
    const commercialSubtotal =
      projection.summary.commercialSubtotal != null
        ? projection.summary.commercialSubtotal
        : round(internalCost + contingencyAmount + marginAmount);
    const vatAmount = round(commercialSubtotal * 0.21);
    const commercialTotal =
      projection.summary.commercialTotal != null
        ? projection.summary.commercialTotal
        : round(commercialSubtotal + vatAmount);

    return {
      source: 'PROJECTION',
      runtimeOutput: null,
      projection,
      estimateStatus: input.estimateStatus || projection.status,
      chapters,
      summary: {
        materialCost: projection.summary.materialCost,
        laborCost: projection.summary.laborCost,
        associatedCost: projection.summary.indirectCost,
        internalCost,
        contingencyAmount,
        marginAmount,
        commercialSubtotal,
        vatAmount,
        commercialTotal,
      },
      legacyItems: projection.commercialLines.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        price: (line.commercialPrice ?? 0) / Math.max(line.quantity, 0.0001),
        unit: line.unit,
        chapter: line.chapter,
      })),
    };
  }

  const legacyItems = input.legacyItems || [];
  const legacySummary = input.legacySummary || {};

  return {
    source: 'LEGACY',
    runtimeOutput: null,
    projection: null,
    estimateStatus: input.estimateStatus || null,
    chapters: Array.from(new Set(legacyItems.map((item) => item.chapter || '01 GENERAL'))),
    summary: {
      materialCost: legacySummary.materialCost || 0,
      laborCost: legacySummary.laborCost || 0,
      associatedCost: legacySummary.associatedCost || 0,
      internalCost: legacySummary.internalCost || 0,
      contingencyAmount: legacySummary.contingencyAmount || 0,
      marginAmount: legacySummary.marginAmount || 0,
      commercialSubtotal:
        legacySummary.commercialSubtotal ||
        round(legacyItems.reduce((sum, item) => sum + item.quantity * item.price, 0)),
      vatAmount: legacySummary.vatAmount || 0,
      commercialTotal:
        legacySummary.commercialTotal ||
        round(legacyItems.reduce((sum, item) => sum + item.quantity * item.price, 0)),
    },
    legacyItems,
  };
}
