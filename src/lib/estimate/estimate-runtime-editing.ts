import type {
  CommercialEstimateRuntimeLine,
  CommercialEstimateRuntimeOutput,
} from './commercial-estimate-runtime';
import { buildCommercialEstimateRuntimeOutput } from './commercial-estimate-runtime';
import type { CommercialEstimateProjection } from './commercial-estimate-projection';
import type { EstimateLegacyItemCompat } from './estimate-runtime-materialization';
import {
  buildEstimateStatusFromPipeline,
  type EstimateLineEconomicSnapshot,
  type EstimateStatusSnapshot,
} from './estimate-status';

export type RuntimeLineEditableField =
  | 'chapter'
  | 'code'
  | 'description'
  | 'quantity'
  | 'unit'
  | 'unitPrice'
  | 'commercialPrice'
  | 'internalCost';

export type RuntimeLinePatch = {
  id: string;
  chapter?: string;
  code?: string | null;
  description?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number | null;
  commercialPrice?: number | null;
  internalCost?: number | null;
};

function round(value: number) {
  return Number(value.toFixed(2));
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function toFiniteNumber(value: number | null | undefined, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isEconomicEditField(field: RuntimeLineEditableField) {
  return (
    field === 'quantity' ||
    field === 'unit' ||
    field === 'unitPrice' ||
    field === 'commercialPrice' ||
    field === 'internalCost'
  );
}

function buildManualAdjustment(
  line: CommercialEstimateRuntimeLine,
  editedFields: RuntimeLineEditableField[],
  degradedTrace: boolean,
  timestamp?: string
) {
  const previousFields = line.manualAdjustment?.editedFields || [];
  return {
    applied: true,
    timestamp: timestamp || new Date().toISOString(),
    editedFields: unique([...previousFields, ...editedFields]),
    degradedTrace: line.manualAdjustment?.degradedTrace || degradedTrace,
    reason: degradedTrace
      ? 'Ajuste manual sobre magnitudes o importes runtime.'
      : 'Ajuste manual editorial sobre runtime line.',
  };
}

function degradeEconomicStatusForManualEdit(
  economicStatus: EstimateLineEconomicSnapshot,
  editedFields: RuntimeLineEditableField[]
): EstimateLineEconomicSnapshot {
  const degradedTrace = editedFields.some(isEconomicEditField);
  if (!degradedTrace) {
    return economicStatus;
  }

  return {
    ...economicStatus,
    economicStatus:
      economicStatus.economicStatus === 'PARAMETRIC_PRELIMINARY'
        ? 'PARAMETRIC_PRELIMINARY'
        : 'PRICE_PENDING_VALIDATION',
    priceSource: 'MANUAL_OVERRIDE',
    pendingValidation: true,
    costSource:
      economicStatus.costSource === 'RECIPE_PRICED'
        ? 'HYBRID'
        : economicStatus.costSource,
    commercialPriceProvisional: true,
    priceStatus: 'PRICE_PENDING_VALIDATION',
  };
}

function recalculateRuntimeSummary(
  runtimeOutput: CommercialEstimateRuntimeOutput,
  lines: CommercialEstimateRuntimeLine[]
) {
  const previousSummary = runtimeOutput.summary;
  const previousMarkupTotal =
    previousSummary.contingencyAmount + previousSummary.marginAmount;
  const contingencyShare =
    previousMarkupTotal > 0
      ? previousSummary.contingencyAmount / previousMarkupTotal
      : 0.25;
  const vatRate =
    (previousSummary.commercialSubtotal || 0) > 0
      ? previousSummary.vatAmount / (previousSummary.commercialSubtotal || 1)
      : 0.21;

  const internalCost = round(
    lines.reduce((sum, line) => sum + toFiniteNumber(line.internalCost), 0)
  );
  const commercialSubtotal = round(
    lines.reduce((sum, line) => sum + toFiniteNumber(line.commercialPrice), 0)
  );

  const markupTotal = round(commercialSubtotal - internalCost);
  const contingencyAmount =
    markupTotal >= 0
      ? round(markupTotal * contingencyShare)
      : 0;
  const marginAmount =
    markupTotal >= 0
      ? round(markupTotal - contingencyAmount)
      : markupTotal;

  const scalingBase = toFiniteNumber(previousSummary.internalCost, 0);
  const costScale = scalingBase > 0 ? internalCost / scalingBase : 1;

  const materialCost = round(previousSummary.materialCost * costScale);
  const laborCost = round(previousSummary.laborCost * costScale);
  const indirectCost = round(previousSummary.indirectCost * costScale);
  const vatAmount = round(commercialSubtotal * vatRate);
  const commercialTotal = round(commercialSubtotal + vatAmount);

  return {
    materialCost,
    laborCost,
    indirectCost,
    internalCost,
    contingencyAmount,
    marginAmount,
    commercialSubtotal,
    vatAmount,
    commercialTotal,
  };
}

function withRuntimeLines(
  runtimeOutput: CommercialEstimateRuntimeOutput,
  lines: CommercialEstimateRuntimeLine[]
): CommercialEstimateRuntimeOutput {
  const manualLines = lines.filter((line) => line.manualAdjustment?.applied);
  const degradedManualLines = manualLines.filter(
    (line) => line.manualAdjustment?.degradedTrace
  );

  return {
    ...runtimeOutput,
    chapters: Array.from(new Set(lines.map((line) => line.chapter))),
    lines,
    summary: recalculateRuntimeSummary(runtimeOutput, lines),
    warnings: unique([
      ...runtimeOutput.warnings,
      ...(manualLines.length > 0
        ? [
            `Se han aplicado ${manualLines.length} ajustes manuales sobre runtime lines.`,
          ]
        : []),
    ]),
    assumptions: unique([
      ...runtimeOutput.assumptions,
      ...(degradedManualLines.length > 0
        ? [
            'Las lineas con ajuste manual economico quedan con trazabilidad tecnica degradada y requieren validacion.',
          ]
        : []),
    ]),
  };
}

export function ensureRuntimeOutputForEditing(input: {
  runtimeOutput?: CommercialEstimateRuntimeOutput | null;
  projection?: CommercialEstimateProjection | null;
}): CommercialEstimateRuntimeOutput | null {
  if (input.runtimeOutput) {
    return input.runtimeOutput;
  }

  if (input.projection) {
    return buildCommercialEstimateRuntimeOutput({
      projection: input.projection,
    });
  }

  return null;
}

export function deriveLegacyItemsFromRuntimeOutput(
  runtimeOutput: CommercialEstimateRuntimeOutput
): EstimateLegacyItemCompat[] {
  return runtimeOutput.lines.map((line) => ({
    description: line.description,
    quantity: line.quantity,
    price: toFiniteNumber(line.commercialPrice) / Math.max(line.quantity, 0.0001),
    unit: line.unit,
    chapter: line.chapter,
  }));
}

export function applyRuntimeLinePatch(
  runtimeOutput: CommercialEstimateRuntimeOutput,
  patch: RuntimeLinePatch,
  timestamp?: string
): CommercialEstimateRuntimeOutput {
  const target = runtimeOutput.lines.find((line) => line.id === patch.id);
  if (!target) {
    return runtimeOutput;
  }

  const editedFields = (
    [
      'chapter',
      'code',
      'description',
      'quantity',
      'unit',
      'unitPrice',
      'commercialPrice',
      'internalCost',
    ] as RuntimeLineEditableField[]
  ).filter((field) => Object.prototype.hasOwnProperty.call(patch, field));

  const nextLines = runtimeOutput.lines.map((line) => {
    if (line.id !== patch.id) return line;

    const nextQuantity =
      patch.quantity != null ? Math.max(0, patch.quantity) : line.quantity;
    const nextCommercialPrice =
      patch.commercialPrice != null
        ? patch.commercialPrice
        : patch.unitPrice != null
          ? round(Math.max(0, nextQuantity) * patch.unitPrice)
          : line.commercialPrice;
    const nextInternalCost =
      patch.internalCost != null ? patch.internalCost : line.internalCost;
    const degradedTrace = editedFields.some(isEconomicEditField);
    const nextEconomicStatus = degradeEconomicStatusForManualEdit(
      line.economicStatus,
      editedFields
    );

    return {
      ...line,
      chapter:
        typeof patch.chapter === 'string' && patch.chapter.trim()
          ? patch.chapter.trim()
          : line.chapter,
      code:
        Object.prototype.hasOwnProperty.call(patch, 'code')
          ? patch.code || null
          : line.code,
      description:
        typeof patch.description === 'string'
          ? patch.description
          : line.description,
      quantity: nextQuantity,
      unit:
        typeof patch.unit === 'string' && patch.unit.trim()
          ? patch.unit.trim()
          : line.unit,
      commercialPrice: nextCommercialPrice,
      internalCost: nextInternalCost,
      provisional:
        degradedTrace || line.provisional || nextEconomicStatus.pendingValidation,
      costSource: nextEconomicStatus.costSource,
      generatedFrom:
        degradedTrace && line.generatedFrom === 'TECHNICAL'
          ? 'HYBRID'
          : line.generatedFrom,
      economicStatus: nextEconomicStatus,
      manualAdjustment: buildManualAdjustment(
        line,
        editedFields,
        degradedTrace,
        timestamp
      ),
    };
  });

  return withRuntimeLines(runtimeOutput, nextLines);
}

export function appendRuntimeLine(
  runtimeOutput: CommercialEstimateRuntimeOutput,
  input?: Partial<Pick<CommercialEstimateRuntimeLine, 'chapter' | 'description' | 'unit'>>
): CommercialEstimateRuntimeOutput {
  const line: CommercialEstimateRuntimeLine = {
    id: `manual-${Date.now()}-${Math.round(Math.random() * 100000)}`,
    chapter: input?.chapter || runtimeOutput.chapters[runtimeOutput.chapters.length - 1] || '01 GENERAL',
    code: null,
    description: input?.description || '',
    quantity: 1,
    unit: input?.unit || 'ud',
    internalCost: 0,
    commercialPrice: 0,
    costSource: 'PARAMETRIC_MASTER',
    generatedFrom: 'LEGACY_FALLBACK',
    supportedSolutionCodes: [],
    measurementLineIds: [],
    recipeLineIds: [],
    pricingLineIds: [],
    provisional: true,
    economicStatus: {
      economicStatus: 'PARAMETRIC_PRELIMINARY',
      priceSource: 'MANUAL_OVERRIDE',
      pendingValidation: true,
      costSource: 'PARAMETRIC_MASTER',
      commercialPriceProvisional: true,
      priceStatus: 'PRICE_PENDING_VALIDATION',
      recipeCoverage: 0,
      priceCoverage: 0,
      bucketCode: null,
    },
    manualAdjustment: {
      applied: true,
      timestamp: new Date().toISOString(),
      editedFields: ['description', 'quantity', 'unitPrice'],
      degradedTrace: true,
      reason: 'Linea anadida manualmente en el editor runtime.',
    },
  };

  return withRuntimeLines(runtimeOutput, [...runtimeOutput.lines, line]);
}

export function removeRuntimeLine(
  runtimeOutput: CommercialEstimateRuntimeOutput,
  lineId: string
): CommercialEstimateRuntimeOutput {
  const nextLines = runtimeOutput.lines.filter((line) => line.id !== lineId);
  return withRuntimeLines(runtimeOutput, nextLines);
}

export function renameRuntimeChapter(
  runtimeOutput: CommercialEstimateRuntimeOutput,
  previousChapter: string,
  nextChapter: string
): CommercialEstimateRuntimeOutput {
  const trimmed = nextChapter.trim();
  if (!trimmed || trimmed === previousChapter) {
    return runtimeOutput;
  }

  return withRuntimeLines(
    runtimeOutput,
    runtimeOutput.lines.map((line) =>
      line.chapter === previousChapter
        ? applyRuntimeLinePatch(
            {
              ...runtimeOutput,
              lines: [line],
            },
            {
              id: line.id,
              chapter: trimmed,
            }
          ).lines[0]
        : line
    )
  );
}

export function removeRuntimeChapter(
  runtimeOutput: CommercialEstimateRuntimeOutput,
  chapter: string
): CommercialEstimateRuntimeOutput {
  return withRuntimeLines(
    runtimeOutput,
    runtimeOutput.lines.filter((line) => line.chapter !== chapter)
  );
}

export function rebuildEstimateStatusFromRuntimeOutput(
  snapshot: EstimateStatusSnapshot | null | undefined,
  runtimeOutput: CommercialEstimateRuntimeOutput
): EstimateStatusSnapshot | null {
  if (!snapshot) return null;

  const pendingValidationCount = runtimeOutput.lines.filter(
    (line) => line.economicStatus.pendingValidation
  ).length;
  const hasHybridBuckets = runtimeOutput.lines.some(
    (line) =>
      line.costSource === 'HYBRID' ||
      line.generatedFrom === 'HYBRID' ||
      line.provisional
  );
  const lineCount = runtimeOutput.lines.length || 1;
  const pricedLines = runtimeOutput.lines.filter(
    (line) => line.economicStatus.priceStatus !== 'PRICE_PENDING_VALIDATION'
  ).length;
  const priceCoveragePercent = Math.round((pricedLines / lineCount) * 100);

  return buildEstimateStatusFromPipeline({
    technicalSpecStatus: snapshot.technicalSpecStatus,
    technicalCoveragePercent: snapshot.technicalCoveragePercent,
    recipeCoveragePercent: snapshot.recipeCoveragePercent,
    priceCoveragePercent,
    pendingValidationCount,
    hasHybridBuckets,
    manualOverride: snapshot.manualOverride,
    issuance: snapshot.issuance,
    issuanceHistory: snapshot.issuanceHistory,
    acceptance: snapshot.acceptance,
    acceptanceHistory: snapshot.acceptanceHistory,
    commercialStatusOverride:
      snapshot.commercialStatus === 'CONVERTED' ||
      snapshot.commercialStatus === 'CANCELLED'
        ? snapshot.commercialStatus
        : null,
  });
}
