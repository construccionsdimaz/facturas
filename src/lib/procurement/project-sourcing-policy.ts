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
