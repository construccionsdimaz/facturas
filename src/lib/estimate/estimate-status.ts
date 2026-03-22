export type TechnicalSpecStatus = 'INCOMPLETE' | 'READY_FOR_MEASUREMENT';

export type EstimateMode =
  | 'PARAMETRIC_PRELIMINARY'
  | 'MIXED'
  | 'RECIPE_PRICED';

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

export type EstimateStatusSnapshot = {
  technicalSpecStatus: TechnicalSpecStatus;
  estimateMode: EstimateMode;
  technicalCoveragePercent: number;
  recipeCoveragePercent: number;
  priceCoveragePercent: number;
  pendingValidationCount: number;
};

export type EstimateLineEconomicSnapshot = {
  economicStatus: EstimateLineEconomicStatus;
  priceSource: EstimatePriceSource;
  pendingValidation: boolean;
};

type GenerationNotesPayload = {
  notes: string[];
  estimateStatus: EstimateStatusSnapshot | null;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
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

  if (
    params.recipeCoveragePercent <= 0 ||
    params.priceCoveragePercent < 50
  ) {
    return 'PARAMETRIC_PRELIMINARY';
  }

  return 'MIXED';
}

export function buildEstimateStatusFromPipeline(params: {
  technicalSpecStatus: TechnicalSpecStatus;
  technicalCoveragePercent: number;
  recipeCoveragePercent: number;
  priceCoveragePercent: number;
  pendingValidationCount: number;
}): EstimateStatusSnapshot {
  const snapshot: EstimateStatusSnapshot = {
    technicalSpecStatus: params.technicalSpecStatus,
    estimateMode: 'PARAMETRIC_PRELIMINARY',
    technicalCoveragePercent: clampPercent(params.technicalCoveragePercent),
    recipeCoveragePercent: clampPercent(params.recipeCoveragePercent),
    priceCoveragePercent: clampPercent(params.priceCoveragePercent),
    pendingValidationCount: Math.max(0, Math.round(params.pendingValidationCount || 0)),
  };

  snapshot.estimateMode = deriveEstimateModeFromPricing(snapshot);
  return snapshot;
}

export function buildSprintOneEstimateStatus(params: {
  lineCount: number;
  technicalSpecStatus?: TechnicalSpecStatus;
}): EstimateStatusSnapshot {
  const technicalSpecStatus = params.technicalSpecStatus ?? 'INCOMPLETE';
  const snapshot: EstimateStatusSnapshot = {
    technicalSpecStatus,
    estimateMode: 'PARAMETRIC_PRELIMINARY',
    technicalCoveragePercent:
      technicalSpecStatus === 'READY_FOR_MEASUREMENT' ? 100 : 0,
    recipeCoveragePercent: 0,
    priceCoveragePercent: 0,
    pendingValidationCount: Math.max(0, params.lineCount),
  };

  snapshot.estimateMode = deriveEstimateMode(snapshot);
  return snapshot;
}

export function buildSprintOneLineEconomicStatus(): EstimateLineEconomicSnapshot {
  return {
    economicStatus: 'PARAMETRIC_PRELIMINARY',
    priceSource: 'PARAMETRIC_REFERENCE',
    pendingValidation: true,
  };
}

export function serializeGenerationNotes(
  notes: string[] | null | undefined,
  estimateStatus: EstimateStatusSnapshot | null | undefined
): GenerationNotesPayload {
  return {
    notes: Array.isArray(notes)
      ? notes.filter((note): note is string => typeof note === 'string')
      : [],
    estimateStatus: estimateStatus ?? null,
  };
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
    const rawStatus = record.estimateStatus;
    if (rawStatus && typeof rawStatus === 'object') {
      const statusRecord = rawStatus as Record<string, unknown>;
      const snapshot: EstimateStatusSnapshot = {
        technicalSpecStatus:
          statusRecord.technicalSpecStatus === 'READY_FOR_MEASUREMENT'
            ? 'READY_FOR_MEASUREMENT'
            : 'INCOMPLETE',
        estimateMode:
          statusRecord.estimateMode === 'RECIPE_PRICED'
            ? 'RECIPE_PRICED'
            : statusRecord.estimateMode === 'MIXED'
              ? 'MIXED'
              : 'PARAMETRIC_PRELIMINARY',
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
      };

      return {
        notes,
        estimateStatus: snapshot,
      };
    }

    return {
      notes,
      estimateStatus: null,
    };
  }

  return {
    notes: [],
    estimateStatus: null,
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
  };
}
