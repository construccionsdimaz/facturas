import type { IntegratedEstimateCostBucket } from './estimate-integration';

export type TechnicalSpecStatus = 'INCOMPLETE' | 'READY_FOR_MEASUREMENT';

export type EstimateMode =
  | 'PARAMETRIC_PRELIMINARY'
  | 'MIXED'
  | 'RECIPE_PRICED';

export type EstimateReadiness =
  | 'DRAFT'
  | 'PARAMETRIC_PRELIMINARY'
  | 'PROVISIONAL_REVIEW_REQUIRED'
  | 'COMMERCIAL_READY'
  | 'TECHNICALLY_CLOSED';

export type EstimateIssuanceStatus =
  | 'NOT_ISSUED'
  | 'ISSUED_PROVISIONAL'
  | 'ISSUED_FINAL';

export type EstimateLineEconomicStatus =
  | 'PARAMETRIC_PRELIMINARY'
  | 'PRICE_PENDING_VALIDATION'
  | 'RECIPE_PRICED';

export type EstimatePriceSource =
  | 'SUPPLIER_OFFER'
  | 'PREFERRED_SUPPLIER'
  | 'CATALOG_REFERENCE'
  | 'PARAMETRIC_REFERENCE'
  | 'MANUAL_OVERRIDE'
  | 'MISSING';

export type InternalCostSource =
  | 'RECIPE_PRICED'
  | 'PARAMETRIC_MASTER'
  | 'HYBRID';

export type EstimateReadinessOverride = {
  applied: boolean;
  reason: string;
  actor: string;
  timestamp: string;
  warningsAtOverride: string[];
  previousReadiness: EstimateReadiness;
};

export type EstimateReadinessCapabilities = {
  canEmitAsFinal: boolean;
  canEmitAsProvisional: boolean;
  canPrintAsPreliminary: boolean;
  requiresManualReview: boolean;
  isTechnicallyClosed: boolean;
};

export type EstimateIssuanceCapabilities = {
  canIssueProvisional: boolean;
  canIssueFinal: boolean;
  requiresOverrideForProvisional: boolean;
  requiresOverrideForFinal: boolean;
  canRevokeIssuance: boolean;
};

export type EstimateIssuanceRecord = {
  status: EstimateIssuanceStatus;
  issuedAt?: string | null;
  issuedBy?: string | null;
  issuanceReason?: string | null;
  readinessAtIssuance?: EstimateReadiness | null;
  estimateModeAtIssuance?: EstimateMode | null;
  warningsAtIssuance?: string[];
  manualOverrideUsed?: boolean;
};

export type EstimateIssuanceHistoryEntry = {
  action: 'ISSUED' | 'REVOKED';
  status: EstimateIssuanceStatus;
  timestamp: string;
  actor: string;
  reason: string;
  readinessAtAction: EstimateReadiness;
  estimateModeAtAction: EstimateMode;
  warningsAtAction: string[];
  manualOverrideUsed: boolean;
};

export type EstimateStatusSnapshot = {
  technicalSpecStatus: TechnicalSpecStatus;
  estimateMode: EstimateMode;
  technicalCoveragePercent: number;
  recipeCoveragePercent: number;
  priceCoveragePercent: number;
  pendingValidationCount: number;
  hasHybridBuckets: boolean;
  readiness: EstimateReadiness;
  readinessReasons: string[];
  capabilities: EstimateReadinessCapabilities;
  manualOverride: EstimateReadinessOverride | null;
  issuance: EstimateIssuanceRecord;
  issuanceHistory: EstimateIssuanceHistoryEntry[];
  issuanceCapabilities: EstimateIssuanceCapabilities;
};

export type EstimateLineEconomicSnapshot = {
  economicStatus: EstimateLineEconomicStatus;
  priceSource: EstimatePriceSource;
  pendingValidation: boolean;
  costSource: InternalCostSource;
  commercialPriceProvisional?: boolean;
  priceStatus?: 'PRICE_CONFIRMED' | 'PRICE_INFERRED' | 'PRICE_PENDING_VALIDATION';
  recipeCoverage?: number;
  priceCoverage?: number;
  bucketCode?: string | null;
};

type GenerationNotesPayload = {
  notes: string[];
  estimateStatus: EstimateStatusSnapshot | null;
  integratedCostBuckets?: IntegratedEstimateCostBucket[];
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function defaultCapabilities(): EstimateReadinessCapabilities {
  return {
    canEmitAsFinal: false,
    canEmitAsProvisional: false,
    canPrintAsPreliminary: true,
    requiresManualReview: true,
    isTechnicallyClosed: false,
  };
}

function defaultIssuance(): EstimateIssuanceRecord {
  return {
    status: 'NOT_ISSUED',
    issuedAt: null,
    issuedBy: null,
    issuanceReason: null,
    readinessAtIssuance: null,
    estimateModeAtIssuance: null,
    warningsAtIssuance: [],
    manualOverrideUsed: false,
  };
}

function defaultIssuanceCapabilities(): EstimateIssuanceCapabilities {
  return {
    canIssueProvisional: false,
    canIssueFinal: false,
    requiresOverrideForProvisional: false,
    requiresOverrideForFinal: false,
    canRevokeIssuance: false,
  };
}

export function deriveEstimateMode({
  technicalSpecStatus,
  recipeCoveragePercent,
  priceCoveragePercent,
  pendingValidationCount,
}: EstimateStatusSnapshot): EstimateMode {
  if (technicalSpecStatus !== 'READY_FOR_MEASUREMENT') {
    return 'PARAMETRIC_PRELIMINARY';
  }

  if (
    recipeCoveragePercent >= 100 &&
    priceCoveragePercent >= 100 &&
    pendingValidationCount === 0
  ) {
    return 'RECIPE_PRICED';
  }

  return 'MIXED';
}

export function deriveEstimateModeFromPricing(params: {
  technicalSpecStatus: TechnicalSpecStatus;
  recipeCoveragePercent: number;
  priceCoveragePercent: number;
  pendingValidationCount: number;
}): EstimateMode {
  if (params.technicalSpecStatus !== 'READY_FOR_MEASUREMENT') {
    return 'PARAMETRIC_PRELIMINARY';
  }

  if (
    params.recipeCoveragePercent >= 100 &&
    params.priceCoveragePercent >= 100 &&
    params.pendingValidationCount === 0
  ) {
    return 'RECIPE_PRICED';
  }

  if (params.recipeCoveragePercent <= 0 || params.priceCoveragePercent < 50) {
    return 'PARAMETRIC_PRELIMINARY';
  }

  return 'MIXED';
}

export function deriveEstimateReadiness(params: {
  estimateMode: EstimateMode;
  technicalSpecStatus: TechnicalSpecStatus;
  technicalCoveragePercent: number;
  recipeCoveragePercent: number;
  priceCoveragePercent: number;
  pendingValidationCount: number;
  hasHybridBuckets: boolean;
  manualOverride?: EstimateReadinessOverride | null;
}): {
  readiness: EstimateReadiness;
  reasons: string[];
  capabilities: EstimateReadinessCapabilities;
} {
  const reasons: string[] = [];
  let readiness: EstimateReadiness = 'DRAFT';

  if (
    params.estimateMode === 'PARAMETRIC_PRELIMINARY' ||
    params.technicalSpecStatus !== 'READY_FOR_MEASUREMENT' ||
    params.technicalCoveragePercent < 50 ||
    params.recipeCoveragePercent < 50 ||
    params.priceCoveragePercent < 50
  ) {
    readiness = 'PARAMETRIC_PRELIMINARY';
    if (params.estimateMode === 'PARAMETRIC_PRELIMINARY') {
      reasons.push('El estimate sigue en modo parametrico preliminar.');
    }
    if (params.technicalSpecStatus !== 'READY_FOR_MEASUREMENT') {
      reasons.push('La especificacion tecnica aun no esta lista para medicion completa.');
    }
    if (params.recipeCoveragePercent < 50 || params.priceCoveragePercent < 50) {
      reasons.push('La cobertura de receta o precio aun es demasiado baja para cierre comercial.');
    }
  } else if (
    params.technicalCoveragePercent === 100 &&
    params.recipeCoveragePercent === 100 &&
    params.priceCoveragePercent === 100 &&
    params.pendingValidationCount === 0 &&
    !params.hasHybridBuckets
  ) {
    readiness = 'TECHNICALLY_CLOSED';
    reasons.push('El presupuesto esta tecnicamente cerrado sin pendientes de validacion.');
  } else if (
    params.pendingValidationCount === 0 &&
    !params.hasHybridBuckets &&
    params.technicalCoveragePercent >= 80 &&
    params.recipeCoveragePercent >= 80 &&
    params.priceCoveragePercent >= 90
  ) {
    readiness = 'COMMERCIAL_READY';
    reasons.push('La cobertura actual permite emitir el presupuesto comercialmente.');
  } else {
    readiness = 'PROVISIONAL_REVIEW_REQUIRED';
    if (params.hasHybridBuckets) {
      reasons.push('Existen buckets HYBRID con mezcla tecnica y fallback parametrico.');
    }
    if (params.pendingValidationCount > 0) {
      reasons.push('Hay lineas o buckets pendientes de validacion economica.');
    }
    if (params.priceCoveragePercent < 90 || params.recipeCoveragePercent < 80) {
      reasons.push('La cobertura tecnica o economica aun requiere revision interna.');
    }
  }

  if (reasons.length === 0) {
    reasons.push('El presupuesto esta en revision.');
  }

  const capabilities: EstimateReadinessCapabilities = {
    canEmitAsFinal:
      readiness === 'COMMERCIAL_READY' || readiness === 'TECHNICALLY_CLOSED',
    canEmitAsProvisional:
      readiness === 'PROVISIONAL_REVIEW_REQUIRED' ||
      readiness === 'COMMERCIAL_READY' ||
      readiness === 'TECHNICALLY_CLOSED',
    canPrintAsPreliminary: true,
    requiresManualReview:
      readiness === 'PARAMETRIC_PRELIMINARY' ||
      readiness === 'PROVISIONAL_REVIEW_REQUIRED',
    isTechnicallyClosed: readiness === 'TECHNICALLY_CLOSED',
  };

  if (params.manualOverride?.applied) {
    reasons.push(
      `Override manual aplicado por ${params.manualOverride.actor} el ${params.manualOverride.timestamp}.`
    );
    capabilities.canEmitAsFinal = true;
    capabilities.canEmitAsProvisional = true;
  }

  return { readiness, reasons, capabilities };
}

export function deriveEstimateIssuanceCapabilities(params: {
  readiness: EstimateReadiness;
  issuanceStatus: EstimateIssuanceStatus;
  manualOverride: EstimateReadinessOverride | null;
}): EstimateIssuanceCapabilities {
  const hasOverride = Boolean(params.manualOverride?.applied);

  const capabilities: EstimateIssuanceCapabilities = {
    canIssueProvisional: false,
    canIssueFinal: false,
    requiresOverrideForProvisional: false,
    requiresOverrideForFinal: false,
    canRevokeIssuance: params.issuanceStatus !== 'NOT_ISSUED',
  };

  switch (params.readiness) {
    case 'DRAFT':
      break;
    case 'PARAMETRIC_PRELIMINARY':
      capabilities.canIssueProvisional = true;
      capabilities.requiresOverrideForProvisional = true;
      break;
    case 'PROVISIONAL_REVIEW_REQUIRED':
      capabilities.canIssueProvisional = true;
      capabilities.canIssueFinal = true;
      capabilities.requiresOverrideForFinal = true;
      break;
    case 'COMMERCIAL_READY':
      capabilities.canIssueProvisional = true;
      capabilities.canIssueFinal = true;
      break;
    case 'TECHNICALLY_CLOSED':
      capabilities.canIssueProvisional = true;
      capabilities.canIssueFinal = true;
      break;
  }

  if (hasOverride && params.readiness !== 'PARAMETRIC_PRELIMINARY') {
    capabilities.requiresOverrideForFinal = false;
  }

  return capabilities;
}

export function buildEstimateStatusFromPipeline(params: {
  technicalSpecStatus: TechnicalSpecStatus;
  technicalCoveragePercent: number;
  recipeCoveragePercent: number;
  priceCoveragePercent: number;
  pendingValidationCount: number;
  hasHybridBuckets?: boolean;
  manualOverride?: EstimateReadinessOverride | null;
  issuance?: EstimateIssuanceRecord | null;
  issuanceHistory?: EstimateIssuanceHistoryEntry[] | null;
}): EstimateStatusSnapshot {
  const snapshot: EstimateStatusSnapshot = {
    technicalSpecStatus: params.technicalSpecStatus,
    estimateMode: 'PARAMETRIC_PRELIMINARY',
    technicalCoveragePercent: clampPercent(params.technicalCoveragePercent),
    recipeCoveragePercent: clampPercent(params.recipeCoveragePercent),
    priceCoveragePercent: clampPercent(params.priceCoveragePercent),
    pendingValidationCount: Math.max(0, Math.round(params.pendingValidationCount || 0)),
    hasHybridBuckets: Boolean(params.hasHybridBuckets),
    readiness: 'DRAFT',
    readinessReasons: [],
    capabilities: defaultCapabilities(),
    manualOverride: params.manualOverride ?? null,
    issuance: params.issuance ?? defaultIssuance(),
    issuanceHistory: Array.isArray(params.issuanceHistory) ? params.issuanceHistory : [],
    issuanceCapabilities: defaultIssuanceCapabilities(),
  };

  snapshot.estimateMode = deriveEstimateModeFromPricing(snapshot);
  const readiness = deriveEstimateReadiness(snapshot);
  snapshot.readiness = readiness.readiness;
  snapshot.readinessReasons = readiness.reasons;
  snapshot.capabilities = readiness.capabilities;
  snapshot.issuanceCapabilities = deriveEstimateIssuanceCapabilities({
    readiness: snapshot.readiness,
    issuanceStatus: snapshot.issuance.status,
    manualOverride: snapshot.manualOverride,
  });
  return snapshot;
}

export function buildSprintOneEstimateStatus(params: {
  lineCount: number;
  technicalSpecStatus?: TechnicalSpecStatus;
}): EstimateStatusSnapshot {
  return buildEstimateStatusFromPipeline({
    technicalSpecStatus: params.technicalSpecStatus ?? 'INCOMPLETE',
    technicalCoveragePercent:
      params.technicalSpecStatus === 'READY_FOR_MEASUREMENT' ? 100 : 0,
    recipeCoveragePercent: 0,
    priceCoveragePercent: 0,
    pendingValidationCount: Math.max(0, params.lineCount),
    hasHybridBuckets: false,
    manualOverride: null,
    issuance: defaultIssuance(),
    issuanceHistory: [],
  });
}

export function applyEstimateReadinessOverride(
  snapshot: EstimateStatusSnapshot,
  params: {
    reason: string;
    actor: string;
    timestamp?: string;
  }
): EstimateStatusSnapshot {
  const reason = params.reason.trim();
  if (!reason) {
    throw new Error('El motivo del override es obligatorio.');
  }

  return buildEstimateStatusFromPipeline({
    technicalSpecStatus: snapshot.technicalSpecStatus,
    technicalCoveragePercent: snapshot.technicalCoveragePercent,
    recipeCoveragePercent: snapshot.recipeCoveragePercent,
    priceCoveragePercent: snapshot.priceCoveragePercent,
    pendingValidationCount: snapshot.pendingValidationCount,
    hasHybridBuckets: snapshot.hasHybridBuckets,
    issuance: snapshot.issuance,
    issuanceHistory: snapshot.issuanceHistory,
    manualOverride: {
      applied: true,
      reason,
      actor: params.actor,
      timestamp: params.timestamp || new Date().toISOString(),
      warningsAtOverride: snapshot.readinessReasons,
      previousReadiness: snapshot.readiness,
    },
  });
}

export function issueEstimate(
  snapshot: EstimateStatusSnapshot,
  params: {
    mode: 'PROVISIONAL' | 'FINAL';
    actor: string;
    reason?: string;
    useOverride?: boolean;
    timestamp?: string;
  }
): EstimateStatusSnapshot {
  const timestamp = params.timestamp || new Date().toISOString();
  const reason = params.reason?.trim() || '';
  const useOverride = Boolean(params.useOverride);
  const capabilities = snapshot.issuanceCapabilities;

  if (params.mode === 'PROVISIONAL') {
    if (!capabilities.canIssueProvisional) {
      throw new Error('Este estimate no puede emitirse como provisional.');
    }
    if (capabilities.requiresOverrideForProvisional && !useOverride) {
      throw new Error('La emision provisional requiere override explicito.');
    }
  }

  if (params.mode === 'FINAL') {
    if (!capabilities.canIssueFinal) {
      throw new Error('Este estimate no puede emitirse como final.');
    }
    if (capabilities.requiresOverrideForFinal && !useOverride) {
      throw new Error('La emision final requiere override explicito.');
    }
  }

  if (useOverride && !reason) {
    throw new Error('El motivo del override de emision es obligatorio.');
  }

  const nextIssuance: EstimateIssuanceRecord = {
    status: params.mode === 'FINAL' ? 'ISSUED_FINAL' : 'ISSUED_PROVISIONAL',
    issuedAt: timestamp,
    issuedBy: params.actor,
    issuanceReason: reason || null,
    readinessAtIssuance: snapshot.readiness,
    estimateModeAtIssuance: snapshot.estimateMode,
    warningsAtIssuance: snapshot.readinessReasons,
    manualOverrideUsed: useOverride,
  };

  const nextHistory: EstimateIssuanceHistoryEntry[] = [
    ...snapshot.issuanceHistory,
    {
      action: 'ISSUED',
      status: nextIssuance.status,
      timestamp,
      actor: params.actor,
      reason: reason || `Emision ${params.mode === 'FINAL' ? 'final' : 'provisional'}`,
      readinessAtAction: snapshot.readiness,
      estimateModeAtAction: snapshot.estimateMode,
      warningsAtAction: snapshot.readinessReasons,
      manualOverrideUsed: useOverride,
    },
  ];

  return buildEstimateStatusFromPipeline({
    technicalSpecStatus: snapshot.technicalSpecStatus,
    technicalCoveragePercent: snapshot.technicalCoveragePercent,
    recipeCoveragePercent: snapshot.recipeCoveragePercent,
    priceCoveragePercent: snapshot.priceCoveragePercent,
    pendingValidationCount: snapshot.pendingValidationCount,
    hasHybridBuckets: snapshot.hasHybridBuckets,
    manualOverride: snapshot.manualOverride,
    issuance: nextIssuance,
    issuanceHistory: nextHistory,
  });
}

export function revokeEstimateIssuance(
  snapshot: EstimateStatusSnapshot,
  params: {
    actor: string;
    reason: string;
    timestamp?: string;
  }
): EstimateStatusSnapshot {
  if (snapshot.issuance.status === 'NOT_ISSUED') {
    throw new Error('El estimate no esta emitido.');
  }

  const reason = params.reason.trim();
  if (!reason) {
    throw new Error('El motivo de revocacion es obligatorio.');
  }

  const timestamp = params.timestamp || new Date().toISOString();
  const nextHistory: EstimateIssuanceHistoryEntry[] = [
    ...snapshot.issuanceHistory,
    {
      action: 'REVOKED',
      status: snapshot.issuance.status,
      timestamp,
      actor: params.actor,
      reason,
      readinessAtAction: snapshot.readiness,
      estimateModeAtAction: snapshot.estimateMode,
      warningsAtAction: snapshot.readinessReasons,
      manualOverrideUsed: Boolean(snapshot.issuance.manualOverrideUsed),
    },
  ];

  return buildEstimateStatusFromPipeline({
    technicalSpecStatus: snapshot.technicalSpecStatus,
    technicalCoveragePercent: snapshot.technicalCoveragePercent,
    recipeCoveragePercent: snapshot.recipeCoveragePercent,
    priceCoveragePercent: snapshot.priceCoveragePercent,
    pendingValidationCount: snapshot.pendingValidationCount,
    hasHybridBuckets: snapshot.hasHybridBuckets,
    manualOverride: snapshot.manualOverride,
    issuance: defaultIssuance(),
    issuanceHistory: nextHistory,
  });
}

export function buildSprintOneLineEconomicStatus(): EstimateLineEconomicSnapshot {
  return {
    economicStatus: 'PARAMETRIC_PRELIMINARY',
    priceSource: 'PARAMETRIC_REFERENCE',
    pendingValidation: true,
    costSource: 'PARAMETRIC_MASTER',
    commercialPriceProvisional: false,
    priceStatus: 'PRICE_PENDING_VALIDATION',
    recipeCoverage: 0,
    priceCoverage: 0,
    bucketCode: null,
  };
}

export function serializeGenerationNotes(
  notes: string[] | null | undefined,
  estimateStatus: EstimateStatusSnapshot | null | undefined,
  integratedCostBuckets?: IntegratedEstimateCostBucket[] | null | undefined
): GenerationNotesPayload {
  return {
    notes: Array.isArray(notes)
      ? notes.filter((note): note is string => typeof note === 'string')
      : [],
    estimateStatus: estimateStatus ?? null,
    integratedCostBuckets: Array.isArray(integratedCostBuckets)
      ? integratedCostBuckets
      : [],
  };
}

function coerceReadiness(value: unknown): EstimateReadiness {
  switch (value) {
    case 'PARAMETRIC_PRELIMINARY':
    case 'PROVISIONAL_REVIEW_REQUIRED':
    case 'COMMERCIAL_READY':
    case 'TECHNICALLY_CLOSED':
    case 'DRAFT':
      return value;
    default:
      return 'DRAFT';
  }
}

function coerceIssuanceStatus(value: unknown): EstimateIssuanceStatus {
  switch (value) {
    case 'ISSUED_PROVISIONAL':
    case 'ISSUED_FINAL':
    case 'NOT_ISSUED':
      return value;
    default:
      return 'NOT_ISSUED';
  }
}

export function parseGenerationNotes(value: unknown): GenerationNotesPayload {
  if (Array.isArray(value)) {
    return {
      notes: value.filter((note): note is string => typeof note === 'string'),
      estimateStatus: null,
    };
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const notes = Array.isArray(record.notes)
      ? record.notes.filter((note): note is string => typeof note === 'string')
      : [];
    const integratedCostBuckets = Array.isArray(record.integratedCostBuckets)
      ? (record.integratedCostBuckets as IntegratedEstimateCostBucket[])
      : [];
    const rawStatus = record.estimateStatus;
    if (rawStatus && typeof rawStatus === 'object') {
      const statusRecord = rawStatus as Record<string, unknown>;
      const manualOverrideRecord =
        statusRecord.manualOverride && typeof statusRecord.manualOverride === 'object'
          ? (statusRecord.manualOverride as Record<string, unknown>)
          : null;
      const manualOverride: EstimateReadinessOverride | null = manualOverrideRecord
        ? {
            applied: Boolean(manualOverrideRecord.applied),
            reason:
              typeof manualOverrideRecord.reason === 'string'
                ? manualOverrideRecord.reason
                : '',
            actor:
              typeof manualOverrideRecord.actor === 'string'
                ? manualOverrideRecord.actor
                : 'Usuario actual',
            timestamp:
              typeof manualOverrideRecord.timestamp === 'string'
                ? manualOverrideRecord.timestamp
                : new Date(0).toISOString(),
            warningsAtOverride: Array.isArray(manualOverrideRecord.warningsAtOverride)
              ? manualOverrideRecord.warningsAtOverride.filter(
                  (item): item is string => typeof item === 'string'
                )
              : [],
            previousReadiness: coerceReadiness(
              manualOverrideRecord.previousReadiness
            ),
          }
        : null;

      const issuanceRecord =
        statusRecord.issuance && typeof statusRecord.issuance === 'object'
          ? (statusRecord.issuance as Record<string, unknown>)
          : null;
      const issuance: EstimateIssuanceRecord = issuanceRecord
        ? {
            status: coerceIssuanceStatus(issuanceRecord.status),
            issuedAt:
              typeof issuanceRecord.issuedAt === 'string'
                ? issuanceRecord.issuedAt
                : null,
            issuedBy:
              typeof issuanceRecord.issuedBy === 'string'
                ? issuanceRecord.issuedBy
                : null,
            issuanceReason:
              typeof issuanceRecord.issuanceReason === 'string'
                ? issuanceRecord.issuanceReason
                : null,
            readinessAtIssuance: coerceReadiness(
              issuanceRecord.readinessAtIssuance
            ),
            estimateModeAtIssuance:
              issuanceRecord.estimateModeAtIssuance === 'RECIPE_PRICED'
                ? 'RECIPE_PRICED'
                : issuanceRecord.estimateModeAtIssuance === 'MIXED'
                  ? 'MIXED'
                  : issuanceRecord.estimateModeAtIssuance === 'PARAMETRIC_PRELIMINARY'
                    ? 'PARAMETRIC_PRELIMINARY'
                    : null,
            warningsAtIssuance: Array.isArray(issuanceRecord.warningsAtIssuance)
              ? issuanceRecord.warningsAtIssuance.filter(
                  (item): item is string => typeof item === 'string'
                )
              : [],
            manualOverrideUsed: Boolean(issuanceRecord.manualOverrideUsed),
          }
        : defaultIssuance();

      const issuanceHistory = Array.isArray(statusRecord.issuanceHistory)
        ? statusRecord.issuanceHistory
            .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
            .map((entry): EstimateIssuanceHistoryEntry => ({
              action: entry.action === 'REVOKED' ? 'REVOKED' : 'ISSUED',
              status: coerceIssuanceStatus(entry.status),
              timestamp:
                typeof entry.timestamp === 'string' ? entry.timestamp : new Date(0).toISOString(),
              actor: typeof entry.actor === 'string' ? entry.actor : 'Usuario actual',
              reason: typeof entry.reason === 'string' ? entry.reason : '',
              readinessAtAction: coerceReadiness(entry.readinessAtAction),
              estimateModeAtAction:
                entry.estimateModeAtAction === 'RECIPE_PRICED'
                  ? 'RECIPE_PRICED'
                  : entry.estimateModeAtAction === 'MIXED'
                    ? 'MIXED'
                    : 'PARAMETRIC_PRELIMINARY',
              warningsAtAction: Array.isArray(entry.warningsAtAction)
                ? entry.warningsAtAction.filter(
                    (item): item is string => typeof item === 'string'
                  )
                : [],
              manualOverrideUsed: Boolean(entry.manualOverrideUsed),
            }))
        : [];

      const snapshot = buildEstimateStatusFromPipeline({
        technicalSpecStatus:
          statusRecord.technicalSpecStatus === 'READY_FOR_MEASUREMENT'
            ? 'READY_FOR_MEASUREMENT'
            : 'INCOMPLETE',
        technicalCoveragePercent: clampPercent(
          Number(statusRecord.technicalCoveragePercent)
        ),
        recipeCoveragePercent: clampPercent(
          Number(statusRecord.recipeCoveragePercent)
        ),
        priceCoveragePercent: clampPercent(
          Number(statusRecord.priceCoveragePercent)
        ),
        pendingValidationCount: Math.max(
          0,
          Math.round(Number(statusRecord.pendingValidationCount) || 0)
        ),
        hasHybridBuckets:
          typeof statusRecord.hasHybridBuckets === 'boolean'
            ? statusRecord.hasHybridBuckets
            : integratedCostBuckets.some((bucket) => bucket.source === 'HYBRID'),
        manualOverride,
        issuance,
        issuanceHistory,
      });

      snapshot.estimateMode =
        statusRecord.estimateMode === 'RECIPE_PRICED'
          ? 'RECIPE_PRICED'
          : statusRecord.estimateMode === 'MIXED'
            ? 'MIXED'
            : snapshot.estimateMode;

      return {
        notes,
        estimateStatus: snapshot,
        integratedCostBuckets,
      };
    }

    return {
      notes,
      estimateStatus: null,
      integratedCostBuckets,
    };
  }

  return {
    notes: [],
    estimateStatus: null,
    integratedCostBuckets: [],
  };
}

export function mergeLineEconomicStatus(
  appliedAssumptions: Record<string, unknown> | null | undefined,
  economic: EstimateLineEconomicSnapshot
) {
  return {
    ...(appliedAssumptions || {}),
    __economicStatus: economic,
  };
}

export function parseLineEconomicStatus(
  appliedAssumptions: unknown
): EstimateLineEconomicSnapshot | null {
  if (!appliedAssumptions || typeof appliedAssumptions !== 'object') return null;
  const record = appliedAssumptions as Record<string, unknown>;
  const rawEconomic = record.__economicStatus;
  if (!rawEconomic || typeof rawEconomic !== 'object') return null;
  const economic = rawEconomic as Record<string, unknown>;

  return {
    economicStatus:
      economic.economicStatus === 'PRICE_PENDING_VALIDATION'
        ? 'PRICE_PENDING_VALIDATION'
        : economic.economicStatus === 'RECIPE_PRICED'
          ? 'RECIPE_PRICED'
          : 'PARAMETRIC_PRELIMINARY',
    priceSource:
      economic.priceSource === 'SUPPLIER_OFFER' ||
      economic.priceSource === 'PREFERRED_SUPPLIER' ||
      economic.priceSource === 'CATALOG_REFERENCE' ||
      economic.priceSource === 'MANUAL_OVERRIDE' ||
      economic.priceSource === 'MISSING'
        ? (economic.priceSource as EstimatePriceSource)
        : 'PARAMETRIC_REFERENCE',
    pendingValidation: Boolean(economic.pendingValidation),
    costSource:
      economic.costSource === 'RECIPE_PRICED' || economic.costSource === 'HYBRID'
        ? (economic.costSource as InternalCostSource)
        : 'PARAMETRIC_MASTER',
    commercialPriceProvisional: Boolean(economic.commercialPriceProvisional),
    priceStatus:
      economic.priceStatus === 'PRICE_CONFIRMED' ||
      economic.priceStatus === 'PRICE_INFERRED' ||
      economic.priceStatus === 'PRICE_PENDING_VALIDATION'
        ? economic.priceStatus
        : 'PRICE_PENDING_VALIDATION',
    recipeCoverage: clampPercent(Number(economic.recipeCoverage)),
    priceCoverage: clampPercent(Number(economic.priceCoverage)),
    bucketCode: typeof economic.bucketCode === 'string' ? economic.bucketCode : null,
  };
}
