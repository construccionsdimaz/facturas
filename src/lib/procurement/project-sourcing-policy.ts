import type { ExecutionContext } from '@/lib/discovery/types';
import {
  createDefaultProjectSourcingPolicy,
  mergeProjectSourcingPolicy,
  SOURCING_FAMILIES,
  SOURCING_STRATEGIES,
  type ProjectSourcingPolicy,
  type SourcingFamily,
} from './sourcing-policy';

export type ProjectSourcingPolicyRecord = ProjectSourcingPolicy & {
  updatedAt?: string | null;
};

export type ResolvedProjectSourcingPolicy = {
  policy: ProjectSourcingPolicyRecord;
  defaultPolicy: ProjectSourcingPolicy;
  hasProjectOverride: boolean;
  source: 'PROJECT_OVERRIDE' | 'DEFAULT';
};

export type ProjectSourcingPolicyHistoryEntry = {
  id: string;
  changedAt: string;
  changedBy?: string | null;
  previousPolicy: ProjectSourcingPolicy | null;
  newPolicy: ProjectSourcingPolicy;
  summaryOfChanges: string;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function normalizeStringArray(value: unknown) {
  if (!isStringArray(value)) return undefined;
  const normalized = Array.from(
    new Set(
      value
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
  return normalized;
}

function normalizeFamilyStringMap(
  value: unknown,
): Partial<Record<SourcingFamily, string[]>> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = SOURCING_FAMILIES.flatMap((family) => {
    const raw = (value as Record<string, unknown>)[family];
    if (!Array.isArray(raw)) return [];
    const normalized = normalizeStringArray(raw);
    return [[family, normalized || []] as const];
  });
  return entries.length > 0 ? (Object.fromEntries(entries) as Partial<Record<SourcingFamily, string[]>>) : undefined;
}

function normalizeFamilyBooleanMap(
  value: unknown,
): Partial<Record<SourcingFamily, boolean>> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = SOURCING_FAMILIES.flatMap((family) => {
    const raw = (value as Record<string, unknown>)[family];
    return typeof raw === 'boolean' ? [[family, raw] as const] : [];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function parseProjectSourcingPolicy(
  value: unknown,
): ProjectSourcingPolicyRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const strategy = SOURCING_STRATEGIES.includes(input.strategy as any)
    ? (input.strategy as ProjectSourcingPolicy['strategy'])
    : undefined;

  if (!strategy) return null;

  return {
    strategy,
    allowedSupplierIds: normalizeStringArray(input.allowedSupplierIds),
    allowedSupplierNames: normalizeStringArray(input.allowedSupplierNames),
    preferredSuppliersByFamily: normalizeFamilyStringMap(input.preferredSuppliersByFamily),
    useOnlyPreferredSuppliers:
      typeof input.useOnlyPreferredSuppliers === 'boolean'
        ? input.useOnlyPreferredSuppliers
        : false,
    useOnlyPreferredByFamily: normalizeFamilyBooleanMap(input.useOnlyPreferredByFamily),
    zoneHint:
      typeof input.zoneHint === 'string' && input.zoneHint.trim().length > 0
        ? input.zoneHint.trim()
        : null,
    maxLeadTimeDays:
      typeof input.maxLeadTimeDays === 'number' && Number.isFinite(input.maxLeadTimeDays)
        ? input.maxLeadTimeDays
        : null,
    updatedAt:
      typeof input.updatedAt === 'string' && input.updatedAt.trim().length > 0
        ? input.updatedAt
        : null,
  };
}

export function serializeProjectSourcingPolicy(
  value: Partial<ProjectSourcingPolicy> | null | undefined,
): ProjectSourcingPolicy | null {
  if (!value) return null;
  const parsed = parseProjectSourcingPolicy({
    strategy: value.strategy,
    allowedSupplierIds: value.allowedSupplierIds,
    allowedSupplierNames: value.allowedSupplierNames,
    preferredSuppliersByFamily: value.preferredSuppliersByFamily,
    useOnlyPreferredSuppliers: value.useOnlyPreferredSuppliers,
    useOnlyPreferredByFamily: value.useOnlyPreferredByFamily,
    zoneHint: value.zoneHint,
    maxLeadTimeDays: value.maxLeadTimeDays,
  });

  if (!parsed) return null;

  return {
    strategy: parsed.strategy,
    allowedSupplierIds: parsed.allowedSupplierIds,
    allowedSupplierNames: parsed.allowedSupplierNames,
    preferredSuppliersByFamily: parsed.preferredSuppliersByFamily,
    useOnlyPreferredSuppliers: parsed.useOnlyPreferredSuppliers,
    useOnlyPreferredByFamily: parsed.useOnlyPreferredByFamily,
    zoneHint: parsed.zoneHint,
    maxLeadTimeDays: parsed.maxLeadTimeDays,
  };
}

export function resolveProjectSourcingPolicy(params: {
  executionContext?: ExecutionContext | null;
  projectPolicy?: unknown;
}): ResolvedProjectSourcingPolicy {
  const defaultPolicy = createDefaultProjectSourcingPolicy(params.executionContext);
  const parsedOverride = parseProjectSourcingPolicy(params.projectPolicy);
  const merged = mergeProjectSourcingPolicy(defaultPolicy, parsedOverride);

  return {
    policy: {
      ...merged,
      updatedAt: parsedOverride?.updatedAt || null,
    },
    defaultPolicy,
    hasProjectOverride: Boolean(parsedOverride),
    source: parsedOverride ? 'PROJECT_OVERRIDE' : 'DEFAULT',
  };
}

function equalStringArrays(left?: string[], right?: string[]) {
  return JSON.stringify(left || []) === JSON.stringify(right || []);
}

function equalBooleanMaps(
  left?: Partial<Record<SourcingFamily, boolean>>,
  right?: Partial<Record<SourcingFamily, boolean>>,
) {
  return JSON.stringify(left || {}) === JSON.stringify(right || {});
}

function equalStringMaps(
  left?: Partial<Record<SourcingFamily, string[]>>,
  right?: Partial<Record<SourcingFamily, string[]>>,
) {
  return JSON.stringify(left || {}) === JSON.stringify(right || {});
}

export function summarizeProjectSourcingPolicyChange(params: {
  previousPolicy?: ProjectSourcingPolicy | null;
  newPolicy: ProjectSourcingPolicy;
}) {
  const previous = params.previousPolicy || null;
  const next = params.newPolicy;
  if (!previous) {
    return 'Se crea un override de sourcing para la obra.';
  }

  const changes: string[] = [];
  if (previous.strategy !== next.strategy) {
    changes.push(`estrategia ${previous.strategy} -> ${next.strategy}`);
  }
  if (!equalStringArrays(previous.allowedSupplierNames, next.allowedSupplierNames)) {
    changes.push('proveedores permitidos actualizados');
  }
  if (!equalStringArrays(previous.allowedSupplierIds, next.allowedSupplierIds)) {
    changes.push('IDs de proveedores permitidos actualizados');
  }
  if (!equalStringMaps(previous.preferredSuppliersByFamily, next.preferredSuppliersByFamily)) {
    changes.push('preferidos por familia actualizados');
  }
  if (previous.useOnlyPreferredSuppliers !== next.useOnlyPreferredSuppliers) {
    changes.push(
      next.useOnlyPreferredSuppliers
        ? 'solo preferidos global activado'
        : 'solo preferidos global desactivado',
    );
  }
  if (!equalBooleanMaps(previous.useOnlyPreferredByFamily, next.useOnlyPreferredByFamily)) {
    changes.push('solo preferidos por familia actualizado');
  }
  if ((previous.zoneHint || null) !== (next.zoneHint || null)) {
    changes.push(`zoneHint ${previous.zoneHint || 'sin zona'} -> ${next.zoneHint || 'sin zona'}`);
  }
  if ((previous.maxLeadTimeDays || null) !== (next.maxLeadTimeDays || null)) {
    changes.push(
      `lead time max ${previous.maxLeadTimeDays ?? 'sin limite'} -> ${next.maxLeadTimeDays ?? 'sin limite'}`,
    );
  }

  return changes.length > 0
    ? `Policy actualizada: ${changes.join(', ')}.`
    : 'Policy guardada sin diferencias materiales respecto al estado previo.';
}
