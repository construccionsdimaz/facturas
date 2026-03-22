import type { VerticalSolutionCode } from '@/lib/discovery/technical-spec-types';
import type { CrewCode, LaborTradeCode } from './labor-productivity';
import {
  PRODUCTIVITY_FAMILY_CODES,
  mapSolutionCodeToProductivityFamily,
  type ProductivityFamilyCode,
} from './project-productivity-policy';

export type LaborRateSource =
  | 'DEFAULT_RATE'
  | 'PROJECT_OVERRIDE'
  | 'PARAMETRIC_REFERENCE'
  | 'MANUAL_OVERRIDE'
  | 'MISSING';

export type LaborRateFamilyCode = ProductivityFamilyCode | 'GENERAL';

export type LaborRateCatalogEntry = {
  tradeCode: LaborTradeCode;
  crewCode?: CrewCode | null;
  familyCode?: LaborRateFamilyCode | null;
  hourlyRate: number;
  detail: string;
  active: boolean;
  isDefault: boolean;
};

export type LaborRateFamilyOverride = {
  hourlyRate?: number | null;
  rateMultiplier?: number | null;
  remarks?: string | null;
};

export type LaborRateTradeOverride = {
  hourlyRate?: number | null;
  remarks?: string | null;
};

export type ProjectLaborRatePolicy = {
  globalLaborMultiplier: number;
  overridesByFamily?: Partial<Record<LaborRateFamilyCode, LaborRateFamilyOverride>> | null;
  tradeOverrides?: Partial<Record<LaborTradeCode, LaborRateTradeOverride>> | null;
  crewMultipliers?: Partial<Record<CrewCode, number>> | null;
  notes?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
};

export type ResolvedProjectLaborRatePolicy = {
  policy: ProjectLaborRatePolicy;
  defaultPolicy: ProjectLaborRatePolicy;
  hasProjectOverride: boolean;
  source: 'PROJECT_OVERRIDE' | 'DEFAULT';
};

export type LaborRateResolution = {
  rateSource: LaborRateSource;
  hourlyRate: number | null;
  familyCode: LaborRateFamilyCode;
  defaultCatalogEntry: LaborRateCatalogEntry | null;
  overridesApplied: string[];
  detail: string;
};

export const DEFAULT_LABOR_RATE_CATALOG: LaborRateCatalogEntry[] = [
  {
    tradeCode: 'OFICIO_ALBANIL',
    familyCode: null,
    hourlyRate: 29.5,
    detail: 'Referencia base de albañilería interior',
    active: true,
    isDefault: true,
  },
  {
    tradeCode: 'OFICIO_PLADUR',
    familyCode: null,
    hourlyRate: 28.8,
    detail: 'Referencia base de sistemas de yeso laminado',
    active: true,
    isDefault: true,
  },
  {
    tradeCode: 'OFICIO_PINTOR',
    familyCode: null,
    hourlyRate: 24.8,
    detail: 'Referencia base de pintura interior',
    active: true,
    isDefault: true,
  },
  {
    tradeCode: 'OFICIO_ELECTRICISTA',
    familyCode: null,
    hourlyRate: 31.5,
    detail: 'Referencia base de electricidad interior',
    active: true,
    isDefault: true,
  },
  {
    tradeCode: 'OFICIO_FONTANERO',
    familyCode: null,
    hourlyRate: 32.2,
    detail: 'Referencia base de fontanería y saneamiento',
    active: true,
    isDefault: true,
  },
  {
    tradeCode: 'OFICIO_CARPINTERO',
    familyCode: null,
    hourlyRate: 30.4,
    detail: 'Referencia base de carpintería interior y montaje',
    active: true,
    isDefault: true,
  },
  {
    tradeCode: 'OFICIO_SOLADOR',
    familyCode: null,
    hourlyRate: 29.9,
    detail: 'Referencia base de colocación de pavimentos y revestimientos',
    active: true,
    isDefault: true,
  },
  {
    tradeCode: 'OFICIO_TECNICO_MULTI',
    familyCode: null,
    hourlyRate: 28.4,
    detail: 'Referencia base de operario multi-interiores',
    active: true,
    isDefault: true,
  },
];

export const DEFAULT_CREW_RATE_MULTIPLIERS: Partial<Record<CrewCode, number>> = {
  CREW_PARTITIONS_STD: 1.02,
  CREW_CEILINGS_STD: 1.01,
  CREW_FLOORING_STD: 1.02,
  CREW_TILING_WET_STD: 1.04,
  CREW_PAINT_STD: 0.99,
  CREW_CARPENTRY_STD: 1.03,
  CREW_ELECTRICAL_BASIC: 1.02,
  CREW_PLUMBING_WET: 1.04,
  CREW_KITCHENETTE_INSTALL: 1.05,
  CREW_GENERAL_INTERIORS: 1,
};

function clampMultiplier(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  return Math.max(0.4, Math.min(3, value));
}

function clampHourlyRate(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value <= 0) return null;
  return Number(value.toFixed(2));
}

export function createDefaultProjectLaborRatePolicy(): ProjectLaborRatePolicy {
  return {
    globalLaborMultiplier: 1,
    overridesByFamily: null,
    tradeOverrides: null,
    crewMultipliers: null,
    notes: null,
    updatedAt: null,
    updatedBy: null,
  };
}

function parseFamilyOverrides(
  value: unknown,
): Partial<Record<LaborRateFamilyCode, LaborRateFamilyOverride>> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const familyCodes: LaborRateFamilyCode[] = [...PRODUCTIVITY_FAMILY_CODES, 'GENERAL'];
  const result: Partial<Record<LaborRateFamilyCode, LaborRateFamilyOverride>> = {};
  let hasEntry = false;
  for (const family of familyCodes) {
    const raw = (value as Record<string, unknown>)[family];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const entry = raw as Record<string, unknown>;
    const override: LaborRateFamilyOverride = {};
    const hourlyRate = clampHourlyRate(entry.hourlyRate);
    if (hourlyRate != null) override.hourlyRate = hourlyRate;
    if (typeof entry.rateMultiplier === 'number' && Number.isFinite(entry.rateMultiplier)) {
      override.rateMultiplier = clampMultiplier(entry.rateMultiplier);
    }
    if (typeof entry.remarks === 'string' && entry.remarks.trim().length > 0) {
      override.remarks = entry.remarks.trim();
    }
    if (Object.keys(override).length > 0) {
      result[family] = override;
      hasEntry = true;
    }
  }
  return hasEntry ? result : null;
}

function parseTradeOverrides(
  value: unknown,
): Partial<Record<LaborTradeCode, LaborRateTradeOverride>> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const result: Partial<Record<LaborTradeCode, LaborRateTradeOverride>> = {};
  let hasEntry = false;
  const tradeCodes = [
    'OFICIO_ALBANIL',
    'OFICIO_PLADUR',
    'OFICIO_PINTOR',
    'OFICIO_ELECTRICISTA',
    'OFICIO_FONTANERO',
    'OFICIO_CARPINTERO',
    'OFICIO_SOLADOR',
    'OFICIO_TECNICO_MULTI',
  ] as const;
  for (const tradeCode of tradeCodes) {
    const raw = (value as Record<string, unknown>)[tradeCode];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const entry = raw as Record<string, unknown>;
    const override: LaborRateTradeOverride = {};
    const hourlyRate = clampHourlyRate(entry.hourlyRate);
    if (hourlyRate != null) override.hourlyRate = hourlyRate;
    if (typeof entry.remarks === 'string' && entry.remarks.trim().length > 0) {
      override.remarks = entry.remarks.trim();
    }
    if (Object.keys(override).length > 0) {
      result[tradeCode] = override;
      hasEntry = true;
    }
  }
  return hasEntry ? result : null;
}

function parseCrewMultipliers(
  value: unknown,
): Partial<Record<CrewCode, number>> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const result: Partial<Record<CrewCode, number>> = {};
  let hasEntry = false;
  const crewCodes = [
    'CREW_PARTITIONS_STD',
    'CREW_CEILINGS_STD',
    'CREW_FLOORING_STD',
    'CREW_TILING_WET_STD',
    'CREW_PAINT_STD',
    'CREW_CARPENTRY_STD',
    'CREW_ELECTRICAL_BASIC',
    'CREW_PLUMBING_WET',
    'CREW_KITCHENETTE_INSTALL',
    'CREW_GENERAL_INTERIORS',
  ] as const;
  for (const crewCode of crewCodes) {
    const raw = (value as Record<string, unknown>)[crewCode];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      result[crewCode] = clampMultiplier(raw);
      hasEntry = true;
    }
  }
  return hasEntry ? result : null;
}

export function parseProjectLaborRatePolicy(value: unknown): ProjectLaborRatePolicy | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  return {
    globalLaborMultiplier: clampMultiplier(input.globalLaborMultiplier),
    overridesByFamily: parseFamilyOverrides(input.overridesByFamily),
    tradeOverrides: parseTradeOverrides(input.tradeOverrides),
    crewMultipliers: parseCrewMultipliers(input.crewMultipliers),
    notes:
      typeof input.notes === 'string' && input.notes.trim().length > 0
        ? input.notes.trim()
        : null,
    updatedAt:
      typeof input.updatedAt === 'string' && input.updatedAt.trim().length > 0
        ? input.updatedAt.trim()
        : null,
    updatedBy:
      typeof input.updatedBy === 'string' && input.updatedBy.trim().length > 0
        ? input.updatedBy.trim()
        : null,
  };
}

export function serializeProjectLaborRatePolicy(
  value: Partial<ProjectLaborRatePolicy> | null | undefined,
): ProjectLaborRatePolicy | null {
  if (!value) return null;
  const parsed = parseProjectLaborRatePolicy({
    globalLaborMultiplier: value.globalLaborMultiplier,
    overridesByFamily: value.overridesByFamily,
    tradeOverrides: value.tradeOverrides,
    crewMultipliers: value.crewMultipliers,
    notes: value.notes,
  });
  if (!parsed) return null;
  return {
    globalLaborMultiplier: parsed.globalLaborMultiplier,
    overridesByFamily: parsed.overridesByFamily,
    tradeOverrides: parsed.tradeOverrides,
    crewMultipliers: parsed.crewMultipliers,
    notes: parsed.notes,
    updatedAt: null,
    updatedBy: null,
  };
}

export function resolveProjectLaborRatePolicy(params: {
  projectPolicy?: unknown;
}): ResolvedProjectLaborRatePolicy {
  const defaultPolicy = createDefaultProjectLaborRatePolicy();
  const parsedOverride = parseProjectLaborRatePolicy(params.projectPolicy);

  if (!parsedOverride) {
    return {
      policy: defaultPolicy,
      defaultPolicy,
      hasProjectOverride: false,
      source: 'DEFAULT',
    };
  }

  const hasProjectOverride =
    parsedOverride.globalLaborMultiplier !== 1 ||
    Object.keys(parsedOverride.overridesByFamily || {}).length > 0 ||
    Object.keys(parsedOverride.tradeOverrides || {}).length > 0 ||
    Object.keys(parsedOverride.crewMultipliers || {}).length > 0 ||
    Boolean(parsedOverride.notes);

  return {
    policy: parsedOverride,
    defaultPolicy,
    hasProjectOverride,
    source: hasProjectOverride ? 'PROJECT_OVERRIDE' : 'DEFAULT',
  };
}

export function mapSolutionCodeToLaborRateFamily(
  solutionCode?: VerticalSolutionCode | string | null,
): LaborRateFamilyCode {
  if (!solutionCode) return 'GENERAL';
  return mapSolutionCodeToProductivityFamily(solutionCode as VerticalSolutionCode) || 'GENERAL';
}

function findDefaultCatalogEntry(params: {
  tradeCode?: string | null;
  crewCode?: string | null;
  familyCode: LaborRateFamilyCode;
}): LaborRateCatalogEntry | null {
  if (!params.tradeCode) return null;
  const exact = DEFAULT_LABOR_RATE_CATALOG.find(
    (entry) =>
      entry.active &&
      entry.tradeCode === params.tradeCode &&
      entry.crewCode === params.crewCode &&
      entry.familyCode === params.familyCode,
  );
  if (exact) return exact;
  const familyEntry = DEFAULT_LABOR_RATE_CATALOG.find(
    (entry) =>
      entry.active &&
      entry.tradeCode === params.tradeCode &&
      entry.familyCode === params.familyCode &&
      !entry.crewCode,
  );
  if (familyEntry) return familyEntry;
  const generic = DEFAULT_LABOR_RATE_CATALOG.find(
    (entry) =>
      entry.active &&
      entry.tradeCode === params.tradeCode &&
      !entry.crewCode &&
      !entry.familyCode,
  );
  return generic || null;
}

function roundRate(value: number) {
  return Number(value.toFixed(2));
}

export function resolveLaborRate(params: {
  tradeCode?: string | null;
  crewCode?: string | null;
  solutionCode?: VerticalSolutionCode | string | null;
  projectPolicy?: ProjectLaborRatePolicy | null;
}): LaborRateResolution {
  const familyCode = mapSolutionCodeToLaborRateFamily(params.solutionCode);
  const defaultCatalogEntry = findDefaultCatalogEntry({
    tradeCode: params.tradeCode,
    crewCode: params.crewCode,
    familyCode,
  });
  const overridesApplied: string[] = [];

  const policy = params.projectPolicy || createDefaultProjectLaborRatePolicy();
  const familyOverride = policy.overridesByFamily?.[familyCode] || null;
  const tradeOverride =
    params.tradeCode && policy.tradeOverrides
      ? policy.tradeOverrides[params.tradeCode as LaborTradeCode] || null
      : null;
  const projectCrewMultiplier =
    params.crewCode && policy.crewMultipliers
      ? policy.crewMultipliers[params.crewCode as CrewCode] || null
      : null;
  const defaultCrewMultiplier =
    params.crewCode
      ? DEFAULT_CREW_RATE_MULTIPLIERS[params.crewCode as CrewCode] || 1
      : 1;

  if (familyOverride?.hourlyRate != null) {
    overridesApplied.push(`Rate fija por familia ${familyCode}: ${familyOverride.hourlyRate} €/h`);
    if (familyOverride.remarks) {
      overridesApplied.push(`Nota familia ${familyCode}: ${familyOverride.remarks}`);
    }
    return {
      rateSource: 'PROJECT_OVERRIDE',
      hourlyRate: roundRate(familyOverride.hourlyRate),
      familyCode,
      defaultCatalogEntry,
      overridesApplied,
      detail: `Override de rate por familia ${familyCode}.`,
    };
  }

  if (tradeOverride?.hourlyRate != null) {
    let resolvedRate = tradeOverride.hourlyRate;
    overridesApplied.push(`Rate fija por oficio ${params.tradeCode}: ${tradeOverride.hourlyRate} €/h`);
    if (policy.globalLaborMultiplier !== 1) {
      resolvedRate *= policy.globalLaborMultiplier;
      overridesApplied.push(`Multiplicador global labor x${policy.globalLaborMultiplier.toFixed(2)}`);
    }
    if (familyOverride?.rateMultiplier != null) {
      resolvedRate *= familyOverride.rateMultiplier;
      overridesApplied.push(`Multiplicador labor familia ${familyCode} x${familyOverride.rateMultiplier.toFixed(2)}`);
    }
    if (projectCrewMultiplier != null) {
      resolvedRate *= projectCrewMultiplier;
      overridesApplied.push(`Multiplicador crew ${params.crewCode} x${projectCrewMultiplier.toFixed(2)}`);
    } else if (defaultCrewMultiplier !== 1) {
      resolvedRate *= defaultCrewMultiplier;
      overridesApplied.push(`Ajuste default crew ${params.crewCode} x${defaultCrewMultiplier.toFixed(2)}`);
    }
    if (tradeOverride.remarks) {
      overridesApplied.push(`Nota oficio ${params.tradeCode}: ${tradeOverride.remarks}`);
    }
    return {
      rateSource: 'PROJECT_OVERRIDE',
      hourlyRate: roundRate(resolvedRate),
      familyCode,
      defaultCatalogEntry,
      overridesApplied,
      detail: `Override de rate por oficio ${params.tradeCode}.`,
    };
  }

  if (defaultCatalogEntry) {
    let resolvedRate = defaultCatalogEntry.hourlyRate;
    let overridden = false;
    if (policy.globalLaborMultiplier !== 1) {
      overridden = true;
      resolvedRate *= policy.globalLaborMultiplier;
      overridesApplied.push(`Multiplicador global labor x${policy.globalLaborMultiplier.toFixed(2)}`);
    }
    if (familyOverride?.rateMultiplier != null) {
      overridden = true;
      resolvedRate *= familyOverride.rateMultiplier;
      overridesApplied.push(`Multiplicador labor familia ${familyCode} x${familyOverride.rateMultiplier.toFixed(2)}`);
    }
    if (projectCrewMultiplier != null) {
      overridden = true;
      resolvedRate *= projectCrewMultiplier;
      overridesApplied.push(`Multiplicador crew ${params.crewCode} x${projectCrewMultiplier.toFixed(2)}`);
    } else if (defaultCrewMultiplier !== 1) {
      resolvedRate *= defaultCrewMultiplier;
      overridesApplied.push(`Ajuste default crew ${params.crewCode} x${defaultCrewMultiplier.toFixed(2)}`);
    }
    if (familyOverride?.remarks) {
      overridesApplied.push(`Nota familia ${familyCode}: ${familyOverride.remarks}`);
    }
    return {
      rateSource: overridden ? 'PROJECT_OVERRIDE' : 'DEFAULT_RATE',
      hourlyRate: roundRate(resolvedRate),
      familyCode,
      defaultCatalogEntry,
      overridesApplied,
      detail: overridden
        ? `Rate default ajustada por policy de proyecto para ${familyCode}.`
        : defaultCatalogEntry.detail,
    };
  }

  return {
    rateSource: 'MISSING',
    hourlyRate: null,
    familyCode,
    defaultCatalogEntry: null,
    overridesApplied,
    detail: 'No existe base de rate laboral suficiente.',
  };
}

export function summarizeProjectLaborRatePolicyChange(params: {
  previousPolicy?: ProjectLaborRatePolicy | null;
  newPolicy: ProjectLaborRatePolicy;
}): string {
  const previous = params.previousPolicy || null;
  const next = params.newPolicy;
  if (!previous) {
    return 'Se crea un override de rates laborales para la obra.';
  }

  const changes: string[] = [];
  if (previous.globalLaborMultiplier !== next.globalLaborMultiplier) {
    changes.push(
      `multiplicador global labor ${previous.globalLaborMultiplier} -> ${next.globalLaborMultiplier}`,
    );
  }
  if (JSON.stringify(previous.overridesByFamily || {}) !== JSON.stringify(next.overridesByFamily || {})) {
    changes.push('overrides de rate por familia actualizados');
  }
  if (JSON.stringify(previous.tradeOverrides || {}) !== JSON.stringify(next.tradeOverrides || {})) {
    changes.push('overrides de rate por oficio actualizados');
  }
  if (JSON.stringify(previous.crewMultipliers || {}) !== JSON.stringify(next.crewMultipliers || {})) {
    changes.push('multiplicadores de crew actualizados');
  }
  return changes.length > 0
    ? `Policy laboral actualizada: ${changes.join(', ')}.`
    : 'Policy laboral guardada sin diferencias materiales respecto al estado previo.';
}
