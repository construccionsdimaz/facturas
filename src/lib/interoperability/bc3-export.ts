import type { CommercialEstimateProjection } from '@/lib/estimate/commercial-estimate-projection';
import type { CommercialEstimateRuntimeOutput } from '@/lib/estimate/commercial-estimate-runtime';
import type { MeasurementLine, MeasurementResult } from '@/lib/estimate/measurement-types';
import type { CommercialEstimateReadModel } from '@/lib/estimates/internal-analysis';

type LegacyEstimateItem = {
  description: string;
  quantity: number;
  price: number;
  unit?: string | null;
  chapter?: string | null;
};

type ExportCommercialLine = {
  id: string;
  chapter: string;
  code: string;
  description: string;
  quantity: number;
  unit: string;
  commercialPrice: number | null;
  lineTotal: number | null;
  measurementLineIds: string[];
  generatedFrom: string;
  provisional: boolean;
};

export type Bc3ExportSource = 'RUNTIME_OUTPUT' | 'PROJECTION' | 'LEGACY';
export type Bc3MeasurementSource = 'DISCOVERY_SESSION' | 'NONE';

export type Bc3ExportSummary = {
  sourceOfTruth: Bc3ExportSource;
  measurementSource: Bc3MeasurementSource;
  fallbackUsed: boolean;
  exportedChapterCount: number;
  exportedLineCount: number;
  exportedMeasurementCount: number;
  omittedMeasurementCount: number;
  warnings: string[];
  omittedSections: string[];
  runtimeSource?: string | null;
  projectionSource?: string | null;
};

export type Bc3ExportResult = {
  fileName: string;
  mediaType: string;
  content: string;
  summary: Bc3ExportSummary;
};

function round(value: number) {
  return Number(value.toFixed(2));
}

function sanitizeCode(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'LINE';
}

function sanitizeText(value?: string | null) {
  return (value || '')
    .replace(/[|\\]/g, ' ')
    .replace(/\r?\n/g, ' ')
    .trim();
}

function formatDate(value?: string | Date | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

function parseMeasurementResultSnapshot(value: unknown): MeasurementResult | null {
  return value && typeof value === 'object' && Array.isArray((value as any).lines)
    ? (value as MeasurementResult)
    : null;
}

function readMeasurementResultFromDiscovery(derivedInput: unknown): MeasurementResult | null {
  if (!derivedInput || typeof derivedInput !== 'object') return null;
  return parseMeasurementResultSnapshot((derivedInput as any).measurementResult);
}

function normalizeRuntimeLines(runtimeOutput: CommercialEstimateRuntimeOutput): ExportCommercialLine[] {
  return runtimeOutput.lines.map((line, index) => ({
    id: line.id || `runtime-${index + 1}`,
    chapter: line.chapter || '01 GENERAL',
    code: sanitizeCode(line.code || `${line.chapter}-${index + 1}`),
    description: line.description,
    quantity: line.quantity,
    unit: line.unit || 'ud',
    commercialPrice: line.commercialPrice,
    lineTotal:
      typeof line.commercialPrice === 'number'
        ? round(line.commercialPrice)
        : null,
    measurementLineIds: line.measurementLineIds || [],
    generatedFrom: line.generatedFrom,
    provisional: Boolean(line.provisional),
  }));
}

function normalizeProjectionLines(projection: CommercialEstimateProjection): ExportCommercialLine[] {
  return projection.commercialLines.map((line, index) => ({
    id: line.code || `projection-${index + 1}`,
    chapter: line.chapter || '01 GENERAL',
    code: sanitizeCode(line.code || `${line.chapter}-${index + 1}`),
    description: line.description,
    quantity: line.quantity,
    unit: line.unit || 'ud',
    commercialPrice: line.commercialPrice,
    lineTotal:
      typeof line.commercialPrice === 'number'
        ? round(line.commercialPrice)
        : null,
    measurementLineIds: line.measurementLineIds || [],
    generatedFrom: line.generatedFrom,
    provisional: Boolean(line.provisional),
  }));
}

function normalizeLegacyItems(items: LegacyEstimateItem[]): ExportCommercialLine[] {
  return items.map((item, index) => {
    const lineTotal = round((item.quantity || 0) * (item.price || 0));
    return {
      id: `legacy-${index + 1}`,
      chapter: item.chapter || '01 GENERAL',
      code: sanitizeCode(item.chapter || `LEGACY_${index + 1}`) + `_${index + 1}`,
      description: item.description,
      quantity: item.quantity || 0,
      unit: item.unit || 'ud',
      commercialPrice: typeof item.price === 'number' ? item.price : null,
      lineTotal,
      measurementLineIds: [],
      generatedFrom: 'LEGACY_FALLBACK',
      provisional: false,
    };
  });
}

function resolveCommercialExportSource(params: {
  commercialReadModel?: CommercialEstimateReadModel | null;
  legacyItems?: LegacyEstimateItem[];
}) {
  const runtimeOutput = params.commercialReadModel?.commercialRuntimeOutput || null;
  const projection = params.commercialReadModel?.commercialEstimateProjection || null;

  if (runtimeOutput) {
    return {
      sourceOfTruth: 'RUNTIME_OUTPUT' as const,
      lines: normalizeRuntimeLines(runtimeOutput),
      runtimeOutput,
      projection: runtimeOutput.projection || projection,
      fallbackUsed: false,
    };
  }

  if (projection) {
    return {
      sourceOfTruth: 'PROJECTION' as const,
      lines: normalizeProjectionLines(projection),
      runtimeOutput: null,
      projection,
      fallbackUsed: true,
    };
  }

  return {
    sourceOfTruth: 'LEGACY' as const,
    lines: normalizeLegacyItems(params.legacyItems || []),
    runtimeOutput: null,
    projection: null,
    fallbackUsed: true,
  };
}

function buildMeasurementById(measurementResult?: MeasurementResult | null) {
  const map = new Map<string, MeasurementLine>();
  for (const line of measurementResult?.lines || []) {
    map.set(line.id, line);
  }
  return map;
}

function toBc3Content(params: {
  estimateNumber: string;
  estimateName: string;
  issueDate?: string | Date | null;
  projectName?: string | null;
  clientName?: string | null;
  lines: ExportCommercialLine[];
  measurementById: Map<string, MeasurementLine>;
}) {
  const rootCode = sanitizeCode(params.estimateNumber || params.estimateName || 'ESTIMATE');
  const chapterCodes = new Map<string, string>();
  const records: string[] = [];

  records.push(`~V|FIEBDC-3/2020|DIMAZ|${formatDate(params.issueDate) || formatDate(new Date())}|${sanitizeText(params.estimateNumber)}|EUR|1|`);
  records.push(`~C|${rootCode}|${sanitizeText(params.estimateName || params.estimateNumber)}|||`);

  for (const [index, chapter] of Array.from(new Set(params.lines.map((line) => line.chapter))).entries()) {
    const chapterCode = `CH_${String(index + 1).padStart(2, '0')}_${sanitizeCode(chapter)}`;
    chapterCodes.set(chapter, chapterCode);
    records.push(`~C|${chapterCode}|${sanitizeText(chapter)}|||`);
    records.push(`~D|${rootCode}|${chapterCode}|`);
  }

  for (const line of params.lines) {
    const chapterCode = chapterCodes.get(line.chapter) || rootCode;
    const unitPrice =
      typeof line.commercialPrice === 'number' && Number.isFinite(line.commercialPrice) && line.quantity > 0
        ? round(line.commercialPrice / Math.max(line.quantity, 0.0001))
        : 0;
    const lineTotal = typeof line.lineTotal === 'number' ? line.lineTotal : round(line.quantity * unitPrice);

    records.push(`~C|${line.code}|${sanitizeText(line.description)}|${sanitizeText(line.unit)}|${unitPrice}|`);
    records.push(`~D|${chapterCode}|${line.code}|`);
    records.push(`~M|${line.code}|1\\${sanitizeText(line.description)}\\${sanitizeText(line.unit)}\\${round(line.quantity)}\\${unitPrice}\\${lineTotal}|`);

    const measurementLines = line.measurementLineIds
      .map((measurementId) => params.measurementById.get(measurementId))
      .filter((measurement): measurement is MeasurementLine => Boolean(measurement));

    measurementLines.forEach((measurement, index) => {
      records.push(
        `~M|${line.code}|${index + 2}\\${sanitizeText(measurement.description)}\\${measurement.unit}\\${round(measurement.quantity)}\\0\\0|`
      );
    });
  }

  return records.join('\n');
}

export function buildBc3EstimateExport(params: {
  estimateId: string;
  estimateNumber: string;
  estimateName?: string | null;
  issueDate?: string | Date | null;
  projectName?: string | null;
  clientName?: string | null;
  commercialReadModel?: CommercialEstimateReadModel | null;
  measurementResult?: MeasurementResult | null;
  discoveryDerivedInput?: unknown;
  legacyItems?: LegacyEstimateItem[];
}) : Bc3ExportResult {
  const commercial = resolveCommercialExportSource({
    commercialReadModel: params.commercialReadModel,
    legacyItems: params.legacyItems,
  });
  const runtimeOutput = commercial.runtimeOutput;
  const projection = commercial.projection;
  const warnings: string[] = [];
  const omittedSections: string[] = [];

  const directMeasurementResult = params.measurementResult || readMeasurementResultFromDiscovery(params.discoveryDerivedInput);
  const measurementSource: Bc3MeasurementSource = directMeasurementResult ? 'DISCOVERY_SESSION' : 'NONE';
  if (!directMeasurementResult) {
    warnings.push('No existe MeasurementResult persistido/reutilizable para este estimate; se exporta presupuesto sin detalle de medicion asociado.');
    omittedSections.push('MEASUREMENTS');
  }

  if (commercial.sourceOfTruth !== 'RUNTIME_OUTPUT') {
    warnings.push(
      commercial.sourceOfTruth === 'PROJECTION'
        ? 'La exportacion BC3 usa CommercialEstimateProjection como fallback porque no hay CommercialEstimateRuntimeOutput persistido.'
        : 'La exportacion BC3 cae a estimate.items legacy por falta de snapshots comerciales modernas.'
    );
  }

  if (projection?.warnings?.length) {
    warnings.push(...projection.warnings.slice(0, 5));
  }

  const measurementById = buildMeasurementById(directMeasurementResult);
  const exportedMeasurementCount = commercial.lines.reduce((total, line) => {
    return total + line.measurementLineIds.filter((measurementId) => measurementById.has(measurementId)).length;
  }, 0);
  const omittedMeasurementCount = commercial.lines.reduce((total, line) => {
    return total + line.measurementLineIds.filter((measurementId) => !measurementById.has(measurementId)).length;
  }, 0);

  if (omittedMeasurementCount > 0) {
    warnings.push(`Se omiten ${omittedMeasurementCount} mediciones enlazadas porque no estaban disponibles en el snapshot exportable.`);
  }

  if (commercial.lines.some((line) => line.provisional)) {
    warnings.push('El export incluye lineas provisionales o hibridas; no debe interpretarse como interoperabilidad BC3 completa/cerrada.');
  }

  const content = toBc3Content({
    estimateNumber: params.estimateNumber,
    estimateName: params.estimateName || params.projectName || `Estimate ${params.estimateNumber}`,
    issueDate: params.issueDate,
    projectName: params.projectName,
    clientName: params.clientName,
    lines: commercial.lines,
    measurementById,
  });

  return {
    fileName: `${sanitizeCode(params.estimateNumber || params.estimateId)}.bc3`,
    mediaType: 'text/plain; charset=utf-8',
    content,
    summary: {
      sourceOfTruth: commercial.sourceOfTruth,
      measurementSource,
      fallbackUsed: commercial.fallbackUsed || measurementSource === 'NONE',
      exportedChapterCount: new Set(commercial.lines.map((line) => line.chapter)).size,
      exportedLineCount: commercial.lines.length,
      exportedMeasurementCount,
      omittedMeasurementCount,
      warnings: Array.from(new Set(warnings)),
      omittedSections: Array.from(new Set(omittedSections)),
      runtimeSource: runtimeOutput?.source || null,
      projectionSource: projection?.source || null,
    },
  };
}
