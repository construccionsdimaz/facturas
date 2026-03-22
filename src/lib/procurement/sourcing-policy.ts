import type { ExecutionContext } from '@/lib/discovery/types';

export type SourcingStrategy =
  | 'CHEAPEST'
  | 'FASTEST'
  | 'PREFERRED'
  | 'BALANCED';

export type SourcingFamily =
  | 'CERAMICS'
  | 'PAINT'
  | 'WATERPROOFING'
  | 'PLASTERBOARD'
  | 'ELECTRICAL'
  | 'PLUMBING'
  | 'DRAINAGE'
  | 'CARPENTRY'
  | 'KITCHEN'
  | 'BATH'
  | 'GENERAL';

export type ProjectSourcingPolicy = {
  strategy: SourcingStrategy;
  allowedSupplierIds?: string[];
  allowedSupplierNames?: string[];
  preferredSuppliersByFamily?: Partial<Record<SourcingFamily, string[]>>;
  useOnlyPreferredSuppliers?: boolean;
  useOnlyPreferredByFamily?: Partial<Record<SourcingFamily, boolean>>;
  zoneHint?: string | null;
  maxLeadTimeDays?: number | null;
};

export function sourcingFamilyFromMaterialCode(
  procurementMaterialCode?: string | null,
): SourcingFamily {
  const code = (procurementMaterialCode || '').toUpperCase();
  if (code.startsWith('ACA-PORC') || code.startsWith('ACA-WALL')) return 'CERAMICS';
  if (code.startsWith('PIN-PLA')) return 'PAINT';
  if (code.startsWith('IMP-LIQ')) return 'WATERPROOFING';
  if (
    code.startsWith('PLA-') ||
    code.startsWith('PER-') ||
    code.startsWith('PLADUR-') ||
    code.startsWith('CEIL-')
  ) {
    return 'PLASTERBOARD';
  }
  if (code.startsWith('ELE-')) return 'ELECTRICAL';
  if (code.startsWith('FON-')) return 'PLUMBING';
  if (code.startsWith('SAN-WET')) return 'DRAINAGE';
  if (code.startsWith('CARP-') || code.startsWith('WIN-')) return 'CARPENTRY';
  if (code.startsWith('KIT-')) return 'KITCHEN';
  if (code.startsWith('SAN-') || code.startsWith('INS-SAN')) return 'BATH';
  return 'GENERAL';
}

export function createDefaultProjectSourcingPolicy(
  executionContext?: ExecutionContext | null,
): ProjectSourcingPolicy {
  const finishLevel = executionContext?.project.finishLevel;
  const accessLevel = executionContext?.project.accessLevel;

  let strategy: SourcingStrategy = 'BALANCED';
  if (accessLevel === 'MUY_COMPLICADO') strategy = 'FASTEST';
  if (finishLevel === 'ALTO') strategy = 'PREFERRED';

  return {
    strategy,
    preferredSuppliersByFamily: {
      CERAMICS: ['Acabats Mediterrani'],
      PAINT: ['Acabats Mediterrani'],
      WATERPROOFING: ['Acabats Mediterrani'],
      PLASTERBOARD: ['Suministros Dimaz Base'],
      ELECTRICAL: ['Electro BCN'],
      PLUMBING: ['Electro BCN'],
      DRAINAGE: ['Electro BCN'],
      CARPENTRY: ['Puertas y Obras BCN'],
      KITCHEN: ['Puertas y Obras BCN', 'Acabats Mediterrani'],
      BATH: ['Acabats Mediterrani'],
    },
    zoneHint: null,
    maxLeadTimeDays: null,
    useOnlyPreferredSuppliers: false,
  };
}

export function mergeProjectSourcingPolicy(
  base: ProjectSourcingPolicy,
  override?: Partial<ProjectSourcingPolicy> | null,
): ProjectSourcingPolicy {
  if (!override) return base;
  return {
    ...base,
    ...override,
    preferredSuppliersByFamily: {
      ...(base.preferredSuppliersByFamily || {}),
      ...(override.preferredSuppliersByFamily || {}),
    },
    useOnlyPreferredByFamily: {
      ...(base.useOnlyPreferredByFamily || {}),
      ...(override.useOnlyPreferredByFamily || {}),
    },
    allowedSupplierIds: override.allowedSupplierIds || base.allowedSupplierIds,
    allowedSupplierNames: override.allowedSupplierNames || base.allowedSupplierNames,
  };
}
