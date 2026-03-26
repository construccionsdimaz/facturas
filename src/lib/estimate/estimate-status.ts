import type { Prisma } from '@prisma/client';
import type { IntegratedEstimateCostBucket } from './commercial-estimate-projection';
import type { CommercialEstimateRuntimeOutput } from './commercial-estimate-runtime';

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

export type EstimateCommercialStatus =
  | 'DRAFT'
  | 'ISSUED_PROVISIONAL'
  | 'ISSUED_FINAL'
  | 'CONVERTED'
  | 'CANCELLED';

export type EstimateAcceptanceStatus =
  | 'NOT_ACCEPTED'
  | 'ACCEPTED'
  | 'REJECTED';

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

export type EstimateCommercialCapabilities = {
  canEdit: boolean;
  canIssueProvisional: boolean;
  canIssueFinal: boolean;
  canRevokeIssuance: boolean;
  canConvert: boolean;
  canPrepareAcceptance: boolean;
  requiresFinalIssuanceBeforeConversion: boolean;
};

export type EstimateAcceptanceCapabilities = {
  canAccept: boolean;
  canReject: boolean;
  requiresOverrideForAcceptance: boolean;
  canRevokeAcceptance: boolean;
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

export type EstimateAcceptanceRecord = {
  status: EstimateAcceptanceStatus;
  acceptedAt?: string | null;
  acceptedBy?: string | null;
  acceptanceReason?: string | null;
  readinessAtAcceptance?: EstimateReadiness | null;
  estimateModeAtAcceptance?: EstimateMode | null;
  commercialStatusAtAcceptance?: EstimateCommercialStatus | null;
  warningsAtAcceptance?: string[];
  manualOverrideUsed?: boolean;
};

export type EstimateAcceptanceHistoryEntry = {
  action: 'ACCEPTED' | 'REJECTED' | 'REVOKED';
  status: EstimateAcceptanceStatus;
  timestamp: string;
  actor: string;
  reason: string;
  readinessAtAction: EstimateReadiness;
  estimateModeAtAction: EstimateMode;
  commercialStatusAtAction: EstimateCommercialStatus;
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
  acceptance: EstimateAcceptanceRecord;
  acceptanceHistory: EstimateAcceptanceHistoryEntry[];
  acceptanceCapabilities: EstimateAcceptanceCapabilities;
  commercialStatus: EstimateCommercialStatus;
  commercialReasons: string[];
  commercialCapabilities: EstimateCommercialCapabilities;
  nextCommercialAction: string | null;
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
  commercialEstimateProjection?: Prisma.InputJsonValue | null;
  commercialRuntimeOutput?: Prisma.InputJsonValue | null;
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

function defaultAcceptance(): EstimateAcceptanceRecord {
  return {
    status: 'NOT_ACCEPTED',
    acceptedAt: null,
    acceptedBy: null,
    acceptanceReason: null,
    readinessAtAcceptance: null,
    estimateModeAtAcceptance: null,
    commercialStatusAtAcceptance: null,
    warningsAtAcceptance: [],
    manualOverrideUsed: false,
  };
}

function defaultAcceptanceCapabilities(): EstimateAcceptanceCapabilities {
  return {
    canAccept: false,
    canReject: false,
    requiresOverrideForAcceptance: false,
    canRevokeAcceptance: false,
  };
}

function defaultCommercialCapabilities(): EstimateCommercialCapabilities {
  return {
    canEdit: true,
    canIssueProvisional: false,
    canIssueFinal: false,
    canRevokeIssuance: false,
    canConvert: false,
    canPrepareAcceptance: false,
    requiresFinalIssuanceBeforeConversion: true,
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

function coerceCommercialStatus(value: unknown): EstimateCommercialStatus | null {
  switch (value) {
    case 'DRAFT':
    case 'ISSUED_PROVISIONAL':
    case 'ISSUED_FINAL':
    case 'CONVERTED':
    case 'CANCELLED':
      return value;
    default:
      return null;
  }
}

function coerceAcceptanceStatus(value: unknown): EstimateAcceptanceStatus {
  switch (value) {
    case 'ACCEPTED':
    case 'REJECTED':
    case 'NOT_ACCEPTED':
      return value;
    default:
      return 'NOT_ACCEPTED';
  }
}

export function deriveEstimateAcceptanceCapabilities(params: {
  commercialStatus: EstimateCommercialStatus;
  acceptanceStatus: EstimateAcceptanceStatus;
}): EstimateAcceptanceCapabilities {
  const capabilities = defaultAcceptanceCapabilities();

  if (
    params.commercialStatus === 'CONVERTED' ||
    params.commercialStatus === 'CANCELLED' ||
    params.commercialStatus === 'DRAFT'
  ) {
    return capabilities;
  }

  if (params.commercialStatus === 'ISSUED_PROVISIONAL') {
    return {
      ...capabilities,
      canReject: params.acceptanceStatus === 'NOT_ACCEPTED',
    };
  }

  if (params.commercialStatus === 'ISSUED_FINAL') {
    if (params.acceptanceStatus === 'NOT_ACCEPTED') {
      return {
        canAccept: true,
        canReject: true,
        requiresOverrideForAcceptance: false,
        canRevokeAcceptance: false,
      };
    }

    if (params.acceptanceStatus === 'ACCEPTED' || params.acceptanceStatus === 'REJECTED') {
      return {
        canAccept: false,
        canReject: false,
        requiresOverrideForAcceptance: false,
        canRevokeAcceptance: true,
      };
    }
  }

  return capabilities;
}

export function deriveEstimateCommercialStatus(params: {
  readiness: EstimateReadiness;
  issuance: EstimateIssuanceRecord;
  issuanceCapabilities: EstimateIssuanceCapabilities;
  acceptance: EstimateAcceptanceRecord;
  lockedStatus?: EstimateCommercialStatus | null;
}): {
  commercialStatus: EstimateCommercialStatus;
  reasons: string[];
  capabilities: EstimateCommercialCapabilities;
  nextAction: string | null;
} {
  const reasons: string[] = [];
  const capabilities = defaultCommercialCapabilities();
  let commercialStatus: EstimateCommercialStatus = 'DRAFT';
  let nextAction: string | null = null;

  if (params.lockedStatus === 'CONVERTED') {
    commercialStatus = 'CONVERTED';
    reasons.push('El presupuesto ya se ha convertido y no admite nueva emision, aceptacion ni revocacion.');
    return {
      commercialStatus,
      reasons,
      capabilities: {
        ...capabilities,
        canEdit: false,
      },
      nextAction: 'El flujo comercial posterior debe continuar desde la factura generada.',
    };
  }

  if (params.lockedStatus === 'CANCELLED') {
    commercialStatus = 'CANCELLED';
    reasons.push('El presupuesto esta cancelado comercialmente y requiere reapertura explicita.');
    return {
      commercialStatus,
      reasons,
      capabilities: {
        ...capabilities,
        canEdit: false,
      },
      nextAction: 'Reabrir el presupuesto antes de cualquier nueva emision.',
    };
  }

  if (params.issuance.status === 'ISSUED_FINAL') {
    commercialStatus = 'ISSUED_FINAL';
    if (params.acceptance.status === 'ACCEPTED') {
      reasons.push('El presupuesto fue emitido final y ya esta aceptado.');
    } else if (params.acceptance.status === 'REJECTED') {
      reasons.push('El presupuesto fue emitido final, pero ha sido rechazado.');
    } else {
      reasons.push('El presupuesto se considera emitido final y esta pendiente de aceptacion antes de la conversion.');
    }
    return {
      commercialStatus,
      reasons,
      capabilities: {
        ...capabilities,
        canEdit: false,
        canRevokeIssuance: params.acceptance.status !== 'ACCEPTED',
        canConvert: params.acceptance.status === 'ACCEPTED',
        canPrepareAcceptance: params.acceptance.status === 'NOT_ACCEPTED',
        requiresFinalIssuanceBeforeConversion: false,
      },
      nextAction:
        params.acceptance.status === 'ACCEPTED'
          ? 'Aceptado: listo para conversion.'
          : params.acceptance.status === 'REJECTED'
            ? 'Revisar, reemitir o revocar antes de cualquier conversion.'
            : 'Emitido final: pendiente de aceptacion antes de convertir.',
    };
  }

  if (params.issuance.status === 'ISSUED_PROVISIONAL') {
    commercialStatus = 'ISSUED_PROVISIONAL';
    reasons.push('El presupuesto ya fue enviado, pero solo como provisional.');
    if (params.issuanceCapabilities.canIssueFinal) {
      reasons.push('Requiere emision final antes de permitir la conversion.');
    }
    return {
      commercialStatus,
      reasons,
      capabilities: {
        ...capabilities,
        canEdit: false,
        canIssueFinal: params.issuanceCapabilities.canIssueFinal,
        canRevokeIssuance: true,
      },
      nextAction: 'Emitir como final antes de aceptacion o conversion.',
    };
  }

  commercialStatus = 'DRAFT';
  reasons.push('El presupuesto aun no se considera enviado al cliente.');
  if (params.issuanceCapabilities.canIssueFinal) {
    nextAction = 'Emitir como final para habilitar aceptacion y conversion.';
  } else if (params.issuanceCapabilities.canIssueProvisional) {
    nextAction = params.issuanceCapabilities.requiresOverrideForProvisional
      ? 'Solo puede emitirse provisionalmente con override explicito.'
      : 'Emitir como provisional para compartirlo internamente o con el cliente.';
  } else {
    nextAction = 'Completar readiness suficiente antes de cualquier emision comercial.';
  }

  return {
    commercialStatus,
    reasons,
    capabilities: {
      ...capabilities,
      canEdit: true,
      canIssueProvisional: params.issuanceCapabilities.canIssueProvisional,
      canIssueFinal: params.issuanceCapabilities.canIssueFinal,
      canRevokeIssuance: false,
    },
    nextAction,
  };
}

export function assertEstimateCanConvert(snapshot: EstimateStatusSnapshot) {
  if (snapshot.commercialStatus === 'CONVERTED') {
    throw new Error('El estimate ya esta convertido.');
  }

  if (snapshot.commercialStatus === 'CANCELLED') {
    throw new Error('El estimate esta cancelado y no puede convertirse.');
  }

  // Permitimos convertir en cualquier momento para mayor flexibilidad
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
  acceptance?: EstimateAcceptanceRecord | null;
  acceptanceHistory?: EstimateAcceptanceHistoryEntry[] | null;
  commercialStatusOverride?: EstimateCommercialStatus | null;
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
    acceptance: params.acceptance ?? defaultAcceptance(),
    acceptanceHistory: Array.isArray(params.acceptanceHistory) ? params.acceptanceHistory : [],
    acceptanceCapabilities: defaultAcceptanceCapabilities(),
    commercialStatus: 'DRAFT',
    commercialReasons: [],
    commercialCapabilities: defaultCommercialCapabilities(),
    nextCommercialAction: null,
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
  const commercial = deriveEstimateCommercialStatus({
    readiness: snapshot.readiness,
    issuance: snapshot.issuance,
    issuanceCapabilities: snapshot.issuanceCapabilities,
    acceptance: snapshot.acceptance,
    lockedStatus: params.commercialStatusOverride ?? null,
  });
  snapshot.commercialStatus = commercial.commercialStatus;
  snapshot.commercialReasons = commercial.reasons;
  snapshot.commercialCapabilities = commercial.capabilities;
  snapshot.nextCommercialAction = commercial.nextAction;
  snapshot.acceptanceCapabilities = deriveEstimateAcceptanceCapabilities({
    commercialStatus: snapshot.commercialStatus,
    acceptanceStatus: snapshot.acceptance.status,
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
    acceptance: defaultAcceptance(),
    acceptanceHistory: [],
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
    acceptance: snapshot.acceptance,
    acceptanceHistory: snapshot.acceptanceHistory,
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

  if (snapshot.acceptance.status === 'ACCEPTED') {
    throw new Error('No se puede reemitir un estimate ya aceptado sin revocar antes la aceptacion.');
  }

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
    acceptance: snapshot.acceptance,
    acceptanceHistory: snapshot.acceptanceHistory,
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

  if (snapshot.acceptance.status === 'ACCEPTED') {
    throw new Error('No se puede revocar la emision de un estimate ya aceptado sin revisar antes su aceptacion.');
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
    acceptance: snapshot.acceptance,
    acceptanceHistory: snapshot.acceptanceHistory,
  });
}

export function acceptEstimate(
  snapshot: EstimateStatusSnapshot,
  params: {
    actor: string;
    reason?: string;
    useOverride?: boolean;
    timestamp?: string;
  }
): EstimateStatusSnapshot {
  if (snapshot.commercialStatus === 'CONVERTED' || snapshot.commercialStatus === 'CANCELLED') {
    throw new Error('Este estimate no admite aceptacion en su estado actual.');
  }

  if (!snapshot.acceptanceCapabilities.canAccept) {
    throw new Error('Este estimate no puede aceptarse en su estado actual.');
  }

  const timestamp = params.timestamp || new Date().toISOString();
  const reason = params.reason?.trim() || '';
  const useOverride = Boolean(params.useOverride);

  if (snapshot.acceptanceCapabilities.requiresOverrideForAcceptance && !useOverride) {
    throw new Error('La aceptacion requiere override explicito.');
  }

  if (useOverride && !reason) {
    throw new Error('El motivo del override de aceptacion es obligatorio.');
  }

  const nextAcceptance: EstimateAcceptanceRecord = {
    status: 'ACCEPTED',
    acceptedAt: timestamp,
    acceptedBy: params.actor,
    acceptanceReason: reason || null,
    readinessAtAcceptance: snapshot.readiness,
    estimateModeAtAcceptance: snapshot.estimateMode,
    commercialStatusAtAcceptance: snapshot.commercialStatus,
    warningsAtAcceptance: snapshot.readinessReasons,
    manualOverrideUsed: useOverride,
  };

  const nextHistory: EstimateAcceptanceHistoryEntry[] = [
    ...snapshot.acceptanceHistory,
    {
      action: 'ACCEPTED',
      status: 'ACCEPTED',
      timestamp,
      actor: params.actor,
      reason: reason || 'Aceptacion registrada',
      readinessAtAction: snapshot.readiness,
      estimateModeAtAction: snapshot.estimateMode,
      commercialStatusAtAction: snapshot.commercialStatus,
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
    issuance: snapshot.issuance,
    issuanceHistory: snapshot.issuanceHistory,
    acceptance: nextAcceptance,
    acceptanceHistory: nextHistory,
  });
}

export function rejectEstimate(
  snapshot: EstimateStatusSnapshot,
  params: {
    actor: string;
    reason: string;
    timestamp?: string;
  }
): EstimateStatusSnapshot {
  if (snapshot.commercialStatus === 'CONVERTED' || snapshot.commercialStatus === 'CANCELLED') {
    throw new Error('Este estimate no admite rechazo en su estado actual.');
  }

  if (!snapshot.acceptanceCapabilities.canReject) {
    throw new Error('Este estimate no puede rechazarse en su estado actual.');
  }

  const reason = params.reason.trim();
  if (!reason) {
    throw new Error('El motivo del rechazo es obligatorio.');
  }

  const timestamp = params.timestamp || new Date().toISOString();
  const nextAcceptance: EstimateAcceptanceRecord = {
    status: 'REJECTED',
    acceptedAt: timestamp,
    acceptedBy: params.actor,
    acceptanceReason: reason,
    readinessAtAcceptance: snapshot.readiness,
    estimateModeAtAcceptance: snapshot.estimateMode,
    commercialStatusAtAcceptance: snapshot.commercialStatus,
    warningsAtAcceptance: snapshot.readinessReasons,
    manualOverrideUsed: false,
  };

  const nextHistory: EstimateAcceptanceHistoryEntry[] = [
    ...snapshot.acceptanceHistory,
    {
      action: 'REJECTED',
      status: 'REJECTED',
      timestamp,
      actor: params.actor,
      reason,
      readinessAtAction: snapshot.readiness,
      estimateModeAtAction: snapshot.estimateMode,
      commercialStatusAtAction: snapshot.commercialStatus,
      warningsAtAction: snapshot.readinessReasons,
      manualOverrideUsed: false,
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
    issuance: snapshot.issuance,
    issuanceHistory: snapshot.issuanceHistory,
    acceptance: nextAcceptance,
    acceptanceHistory: nextHistory,
  });
}

export function revokeEstimateAcceptance(
  snapshot: EstimateStatusSnapshot,
  params: {
    actor: string;
    reason: string;
    timestamp?: string;
  }
): EstimateStatusSnapshot {
  if (snapshot.acceptance.status === 'NOT_ACCEPTED') {
    throw new Error('El estimate no tiene aceptacion registrada.');
  }

  if (snapshot.commercialStatus === 'CONVERTED' || snapshot.commercialStatus === 'CANCELLED') {
    throw new Error('No se puede revocar la aceptacion en el estado actual.');
  }

  if (!snapshot.acceptanceCapabilities.canRevokeAcceptance) {
    throw new Error('La aceptacion no puede revocarse en el estado actual.');
  }

  const reason = params.reason.trim();
  if (!reason) {
    throw new Error('El motivo de revocacion de la aceptacion es obligatorio.');
  }

  const timestamp = params.timestamp || new Date().toISOString();
  const nextHistory: EstimateAcceptanceHistoryEntry[] = [
    ...snapshot.acceptanceHistory,
    {
      action: 'REVOKED',
      status: snapshot.acceptance.status,
      timestamp,
      actor: params.actor,
      reason,
      readinessAtAction: snapshot.readiness,
      estimateModeAtAction: snapshot.estimateMode,
      commercialStatusAtAction: snapshot.commercialStatus,
      warningsAtAction: snapshot.readinessReasons,
      manualOverrideUsed: Boolean(snapshot.acceptance.manualOverrideUsed),
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
    issuance: snapshot.issuance,
    issuanceHistory: snapshot.issuanceHistory,
    acceptance: defaultAcceptance(),
    acceptanceHistory: nextHistory,
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
  integratedCostBuckets?: IntegratedEstimateCostBucket[] | null | undefined,
  commercialEstimateProjection?: Prisma.InputJsonValue | null | undefined,
  commercialRuntimeOutput?: Prisma.InputJsonValue | null | undefined
): GenerationNotesPayload {
  return {
    notes: Array.isArray(notes)
      ? notes.filter((note): note is string => typeof note === 'string')
      : [],
    estimateStatus: estimateStatus ?? null,
    integratedCostBuckets: Array.isArray(integratedCostBuckets)
      ? integratedCostBuckets
      : [],
    commercialEstimateProjection:
      commercialEstimateProjection && typeof commercialEstimateProjection === 'object'
        ? commercialEstimateProjection
        : null,
    commercialRuntimeOutput:
      commercialRuntimeOutput && typeof commercialRuntimeOutput === 'object'
        ? commercialRuntimeOutput
        : null,
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
      commercialEstimateProjection: null,
      commercialRuntimeOutput: null,
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
    const commercialEstimateProjection =
      record.commercialEstimateProjection &&
      (typeof record.commercialEstimateProjection === 'object' ||
        Array.isArray(record.commercialEstimateProjection))
        ? (record.commercialEstimateProjection as Prisma.InputJsonValue)
        : null;
    const commercialRuntimeOutput =
      record.commercialRuntimeOutput &&
      (typeof record.commercialRuntimeOutput === 'object' ||
        Array.isArray(record.commercialRuntimeOutput))
        ? (record.commercialRuntimeOutput as Prisma.InputJsonValue)
        : null;
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

      const acceptanceRecord =
        statusRecord.acceptance && typeof statusRecord.acceptance === 'object'
          ? (statusRecord.acceptance as Record<string, unknown>)
          : null;
      const acceptance: EstimateAcceptanceRecord = acceptanceRecord
        ? {
            status: coerceAcceptanceStatus(acceptanceRecord.status),
            acceptedAt:
              typeof acceptanceRecord.acceptedAt === 'string'
                ? acceptanceRecord.acceptedAt
                : null,
            acceptedBy:
              typeof acceptanceRecord.acceptedBy === 'string'
                ? acceptanceRecord.acceptedBy
                : null,
            acceptanceReason:
              typeof acceptanceRecord.acceptanceReason === 'string'
                ? acceptanceRecord.acceptanceReason
                : null,
            readinessAtAcceptance: coerceReadiness(
              acceptanceRecord.readinessAtAcceptance
            ),
            estimateModeAtAcceptance:
              acceptanceRecord.estimateModeAtAcceptance === 'RECIPE_PRICED'
                ? 'RECIPE_PRICED'
                : acceptanceRecord.estimateModeAtAcceptance === 'MIXED'
                  ? 'MIXED'
                  : acceptanceRecord.estimateModeAtAcceptance === 'PARAMETRIC_PRELIMINARY'
                    ? 'PARAMETRIC_PRELIMINARY'
                    : null,
            commercialStatusAtAcceptance: coerceCommercialStatus(
              acceptanceRecord.commercialStatusAtAcceptance
            ),
            warningsAtAcceptance: Array.isArray(acceptanceRecord.warningsAtAcceptance)
              ? acceptanceRecord.warningsAtAcceptance.filter(
                  (item): item is string => typeof item === 'string'
                )
              : [],
            manualOverrideUsed: Boolean(acceptanceRecord.manualOverrideUsed),
          }
        : defaultAcceptance();

      const acceptanceHistory = Array.isArray(statusRecord.acceptanceHistory)
        ? statusRecord.acceptanceHistory
            .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
            .map((entry): EstimateAcceptanceHistoryEntry => ({
              action:
                entry.action === 'REJECTED'
                  ? 'REJECTED'
                  : entry.action === 'REVOKED'
                    ? 'REVOKED'
                    : 'ACCEPTED',
              status: coerceAcceptanceStatus(entry.status),
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
              commercialStatusAtAction:
                coerceCommercialStatus(entry.commercialStatusAtAction) ?? 'DRAFT',
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
        acceptance,
        acceptanceHistory,
        commercialStatusOverride: coerceCommercialStatus(statusRecord.commercialStatus),
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
        commercialEstimateProjection,
        commercialRuntimeOutput,
      };
    }

    return {
      notes,
      estimateStatus: null,
      integratedCostBuckets,
      commercialEstimateProjection,
      commercialRuntimeOutput,
    };
  }

  return {
    notes: [],
    estimateStatus: null,
    integratedCostBuckets: [],
    commercialEstimateProjection: null,
    commercialRuntimeOutput: null,
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
