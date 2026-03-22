import type { VerticalSolutionCode } from '@/lib/discovery/technical-spec-types';
import type { CrewCode } from './labor-productivity';

// ─── Family codes ────────────────────────────────────────────────────────────

export const PRODUCTIVITY_FAMILY_CODES = [
  'PARTITIONS',
  'CEILINGS',
  'FLOORING',
  'WALL_FINISHES',
  'BATHROOMS_WET',
  'KITCHENETTES',
  'ELECTRICAL',
  'PLUMBING',
  'DRAINAGE',
  'COMMON_AREAS',
  'ROOMS',
  'CARPENTRY',
] as const;

export type ProductivityFamilyCode = (typeof PRODUCTIVITY_FAMILY_CODES)[number];

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProductivityFamilyOverride = {
  productivityMultiplier?: number | null;
  forceCrewCode?: string | null;
  forceProductivityProfileCode?: string | null;
  remarks?: string | null;
};

export type ProjectProductivityPolicy = {
  globalProductivityMultiplier: number;
  overridesByFamily?: Partial<Record<ProductivityFamilyCode, ProductivityFamilyOverride>> | null;
  preferredCrewByFamily?: Partial<Record<ProductivityFamilyCode, string>> | null;
  notes?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
};

export type ResolvedProjectProductivityPolicy = {
  policy: ProjectProductivityPolicy;
  defaultPolicy: ProjectProductivityPolicy;
  hasProjectOverride: boolean;
  source: 'PROJECT_OVERRIDE' | 'DEFAULT';
};

// ─── Defaults ────────────────────────────────────────────────────────────────

export function createDefaultProjectProductivityPolicy(): ProjectProductivityPolicy {
  return {
    globalProductivityMultiplier: 1.0,
    overridesByFamily: null,
    preferredCrewByFamily: null,
    notes: null,
    updatedAt: null,
    updatedBy: null,
  };
}

// ─── Mapping solution → family ───────────────────────────────────────────────

export function mapSolutionCodeToProductivityFamily(
  solutionCode: VerticalSolutionCode,
): ProductivityFamilyCode {
  if (solutionCode.startsWith('PARTITION_')) return 'PARTITIONS';
  if (solutionCode.startsWith('CEILING_')) return 'CEILINGS';
  if (solutionCode.startsWith('FLOOR_') || solutionCode === 'SKIRTING_STD') return 'FLOORING';
  if (
    solutionCode.startsWith('WALL_TILE_') ||
    solutionCode.startsWith('PAINT_') ||
    solutionCode.startsWith('WET_AREA_')
  )
    return 'WALL_FINISHES';
  if (solutionCode.startsWith('BATH_')) return 'BATHROOMS_WET';
  if (solutionCode.startsWith('KITCHENETTE_')) return 'KITCHENETTES';
  if (solutionCode.startsWith('ELECTRICAL_') || solutionCode.startsWith('LIGHTING_'))
    return 'ELECTRICAL';
  if (solutionCode.startsWith('PLUMBING_')) return 'PLUMBING';
  if (solutionCode.startsWith('DRAINAGE_')) return 'DRAINAGE';
  if (solutionCode.startsWith('COMMON_AREA_')) return 'COMMON_AREAS';
  if (solutionCode.startsWith('ROOM_')) return 'ROOMS';
  if (
    solutionCode.startsWith('DOOR_') ||
    solutionCode.startsWith('WINDOW_') ||
    solutionCode.startsWith('SHUTTER_')
  )
    return 'CARPENTRY';
  if (solutionCode.startsWith('LEVELING_')) return 'COMMON_AREAS';
  return 'ROOMS';
}

// ─── Parse / serialize ───────────────────────────────────────────────────────

function clampMultiplier(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1.0;
  return Math.max(0.3, Math.min(3.0, value));
}

function parseFamilyOverrides(
  value: unknown,
): Partial<Record<ProductivityFamilyCode, ProductivityFamilyOverride>> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const result: Partial<Record<ProductivityFamilyCode, ProductivityFamilyOverride>> = {};
  let hasEntry = false;
  for (const family of PRODUCTIVITY_FAMILY_CODES) {
    const raw = (value as Record<string, unknown>)[family];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const entry = raw as Record<string, unknown>;
    const override: ProductivityFamilyOverride = {};
    if (typeof entry.productivityMultiplier === 'number' && Number.isFinite(entry.productivityMultiplier)) {
      override.productivityMultiplier = clampMultiplier(entry.productivityMultiplier);
    }
    if (typeof entry.forceCrewCode === 'string' && entry.forceCrewCode.trim().length > 0) {
      override.forceCrewCode = entry.forceCrewCode.trim();
    }
    if (typeof entry.forceProductivityProfileCode === 'string' && entry.forceProductivityProfileCode.trim().length > 0) {
      override.forceProductivityProfileCode = entry.forceProductivityProfileCode.trim();
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

function parsePreferredCrews(
  value: unknown,
): Partial<Record<ProductivityFamilyCode, string>> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const result: Partial<Record<ProductivityFamilyCode, string>> = {};
  let hasEntry = false;
  for (const family of PRODUCTIVITY_FAMILY_CODES) {
    const raw = (value as Record<string, unknown>)[family];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      result[family] = raw.trim();
      hasEntry = true;
    }
  }
  return hasEntry ? result : null;
}

export function parseProjectProductivityPolicy(
  value: unknown,
): ProjectProductivityPolicy | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const globalMultiplier = clampMultiplier(input.globalProductivityMultiplier);
  return {
    globalProductivityMultiplier: globalMultiplier,
    overridesByFamily: parseFamilyOverrides(input.overridesByFamily),
    preferredCrewByFamily: parsePreferredCrews(input.preferredCrewByFamily),
    notes:
      typeof input.notes === 'string' && input.notes.trim().length > 0
        ? input.notes.trim()
        : null,
    updatedAt:
      typeof input.updatedAt === 'string' && input.updatedAt.trim().length > 0
        ? input.updatedAt
        : null,
    updatedBy:
      typeof input.updatedBy === 'string' && input.updatedBy.trim().length > 0
        ? input.updatedBy.trim()
        : null,
  };
}

export function serializeProjectProductivityPolicy(
  value: Partial<ProjectProductivityPolicy> | null | undefined,
): ProjectProductivityPolicy | null {
  if (!value) return null;
  const parsed = parseProjectProductivityPolicy({
    globalProductivityMultiplier: value.globalProductivityMultiplier,
    overridesByFamily: value.overridesByFamily,
    preferredCrewByFamily: value.preferredCrewByFamily,
    notes: value.notes,
  });
  if (!parsed) return null;
  return {
    globalProductivityMultiplier: parsed.globalProductivityMultiplier,
    overridesByFamily: parsed.overridesByFamily,
    preferredCrewByFamily: parsed.preferredCrewByFamily,
    notes: parsed.notes,
    updatedAt: null,
    updatedBy: null,
  };
}

// ─── Resolve ─────────────────────────────────────────────────────────────────

export function resolveProjectProductivityPolicy(params: {
  projectPolicy?: unknown;
}): ResolvedProjectProductivityPolicy {
  const defaultPolicy = createDefaultProjectProductivityPolicy();
  const parsedOverride = parseProjectProductivityPolicy(params.projectPolicy);

  if (!parsedOverride) {
    return {
      policy: defaultPolicy,
      defaultPolicy,
      hasProjectOverride: false,
      source: 'DEFAULT',
    };
  }

  return {
    policy: parsedOverride,
    defaultPolicy,
    hasProjectOverride: true,
    source: 'PROJECT_OVERRIDE',
  };
}

// ─── Apply to labor resolution ───────────────────────────────────────────────

export type ProductivityPolicyApplication = {
  policySource: 'DEFAULT' | 'PROJECT_OVERRIDE';
  globalMultiplierApplied: number;
  familyMultiplierApplied: number | null;
  familyCode: ProductivityFamilyCode;
  forcedCrewCode: string | null;
  forcedProfileCode: string | null;
  combinedPolicyMultiplier: number;
  appliedPolicyOverrides: string[];
};

export function resolveProductivityPolicyForSolution(
  solutionCode: VerticalSolutionCode,
  policy: ProjectProductivityPolicy | null | undefined,
): ProductivityPolicyApplication {
  const familyCode = mapSolutionCodeToProductivityFamily(solutionCode);

  if (!policy || policy.globalProductivityMultiplier === 1.0) {
    const familyOverride = policy?.overridesByFamily?.[familyCode];
    if (!familyOverride && !policy?.preferredCrewByFamily?.[familyCode]) {
      return {
        policySource: policy ? 'PROJECT_OVERRIDE' : 'DEFAULT',
        globalMultiplierApplied: 1.0,
        familyMultiplierApplied: null,
        familyCode,
        forcedCrewCode: null,
        forcedProfileCode: null,
        combinedPolicyMultiplier: 1.0,
        appliedPolicyOverrides: [],
      };
    }
  }

  const globalMultiplier = policy?.globalProductivityMultiplier ?? 1.0;
  const familyOverride = policy?.overridesByFamily?.[familyCode] ?? null;
  const familyMultiplier = familyOverride?.productivityMultiplier ?? null;
  const preferredCrew = policy?.preferredCrewByFamily?.[familyCode] ?? null;
  const forcedCrewCode = familyOverride?.forceCrewCode ?? preferredCrew ?? null;
  const forcedProfileCode = familyOverride?.forceProductivityProfileCode ?? null;
  const combined = globalMultiplier * (familyMultiplier ?? 1.0);

  const overrides: string[] = [];
  if (globalMultiplier !== 1.0) {
    overrides.push(`Multiplicador global de productividad: x${globalMultiplier.toFixed(2)}`);
  }
  if (familyMultiplier != null && familyMultiplier !== 1.0) {
    overrides.push(`Multiplicador familia ${familyCode}: x${familyMultiplier.toFixed(2)}`);
  }
  if (forcedCrewCode) {
    overrides.push(`Crew forzada por policy: ${forcedCrewCode}`);
  }
  if (forcedProfileCode) {
    overrides.push(`Perfil productivo forzado por policy: ${forcedProfileCode}`);
  }
  if (familyOverride?.remarks) {
    overrides.push(`Nota familia ${familyCode}: ${familyOverride.remarks}`);
  }

  return {
    policySource: 'PROJECT_OVERRIDE',
    globalMultiplierApplied: globalMultiplier,
    familyMultiplierApplied: familyMultiplier,
    familyCode,
    forcedCrewCode,
    forcedProfileCode,
    combinedPolicyMultiplier: Number(combined.toFixed(4)),
    appliedPolicyOverrides: overrides,
  };
}

// ─── Summary of changes ─────────────────────────────────────────────────────

export function summarizeProjectProductivityPolicyChange(params: {
  previousPolicy?: ProjectProductivityPolicy | null;
  newPolicy: ProjectProductivityPolicy;
}): string {
  const previous = params.previousPolicy || null;
  const next = params.newPolicy;

  if (!previous) {
    return 'Se crea un override de productividad para la obra.';
  }

  const changes: string[] = [];

  if (previous.globalProductivityMultiplier !== next.globalProductivityMultiplier) {
    changes.push(
      `multiplicador global ${previous.globalProductivityMultiplier} -> ${next.globalProductivityMultiplier}`,
    );
  }

  const prevFamilies = Object.keys(previous.overridesByFamily || {});
  const nextFamilies = Object.keys(next.overridesByFamily || {});
  const allFamilies = Array.from(new Set([...prevFamilies, ...nextFamilies]));
  for (const family of allFamilies) {
    const prevOverride = (previous.overridesByFamily as any)?.[family];
    const nextOverride = (next.overridesByFamily as any)?.[family];
    if (JSON.stringify(prevOverride || null) !== JSON.stringify(nextOverride || null)) {
      changes.push(`override familia ${family} actualizado`);
    }
  }

  if (JSON.stringify(previous.preferredCrewByFamily || {}) !== JSON.stringify(next.preferredCrewByFamily || {})) {
    changes.push('crews preferidas por familia actualizadas');
  }

  return changes.length > 0
    ? `Policy productividad actualizada: ${changes.join(', ')}.`
    : 'Policy productividad guardada sin diferencias materiales respecto al estado previo.';
}
