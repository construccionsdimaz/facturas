import type {
  AccessLevel,
  FinishLevel,
  ScopeType,
  SiteType,
  WorkType,
} from '@/lib/automation/types';
import {
  ACTION_TO_WORK_CODES,
  DERIVED_INPUT_VERSION,
  DISCOVERY_SUMMARY_VERSION,
  DISCOVERY_SCHEMA_VERSION,
  WORK_CODE_LABELS,
} from './catalogs';
import {
  BudgetGoal,
  ComplexityProfile,
  DerivedInput,
  DiscoveryAssetType,
  DiscoveryAssumption,
  DiscoverySessionData,
  DiscoverySubtypeCode,
  DiscoveryWarning,
  PrecisionMode,
  WorkCode,
} from './types';

function normalizeWorkType(data: DiscoverySessionData): WorkType {
  const { interventionType, assetType, globalScope } = data.classification;

  if (interventionType === 'ADECUACION' && assetType === 'LOCAL') return 'ADECUACION_LOCAL';
  if (assetType === 'COLIVING') return 'COLIVING';
  if (interventionType === 'REHABILITACION' || assetType === 'EDIFICIO') return 'REHABILITACION_LIGERA';
  if (interventionType === 'REFORMA' && globalScope === 'TOTAL' && (assetType === 'PISO' || assetType === 'CASA')) return 'REFORMA_INTEGRAL_VIVIENDA';
  if (interventionType === 'REFORMA' && globalScope !== 'TOTAL') return 'REFORMA_PARCIAL';
  if (data.currentVsTarget.bathrooms?.target || data.currentVsTarget.kitchens?.target) {
    const targetBathrooms = data.currentVsTarget.bathrooms?.target || 0;
    const targetKitchens = data.currentVsTarget.kitchens?.target || 0;
    if (targetBathrooms > 0 && targetKitchens > 0) return 'REFORMA_COCINA_BANO';
  }
  return 'REFORMA_PARCIAL';
}

function normalizeSiteType(assetType: DiscoveryAssetType): SiteType {
  switch (assetType) {
    case 'CASA':
      return 'VIVIENDA_UNIFAMILIAR';
    case 'EDIFICIO':
      return 'EDIFICIO';
    case 'LOCAL':
      return 'LOCAL';
    case 'OFICINA':
      return 'OFICINA';
    case 'NAVE':
      return 'NAVE';
    case 'HOTEL':
    case 'COLIVING':
      return 'EDIFICIO';
    case 'EXTERIOR':
      return 'EDIFICIO';
    default:
      return assetType as Exclude<SiteType, 'VIVIENDA_UNIFAMILIAR' | 'CAMBIO_USO'>;
  }
}

function normalizeScopeType(data: DiscoverySessionData): ScopeType {
  const { interventionType, globalScope } = data.classification;
  if (interventionType === 'OBRA_NUEVA') return 'OBRA_NUEVA';
  if (interventionType === 'REHABILITACION') return 'REHABILITACION';
  if (interventionType === 'ADECUACION') return 'ADECUACION';
  if (data.currentVsTarget.changeOfUse?.value) return 'CAMBIO_USO';
  if (data.currentVsTarget.redistribution?.value && globalScope === 'TOTAL') return 'REESTRUCTURACION';
  if (globalScope === 'TOTAL') return 'REFORMA_INTEGRAL';
  return 'REFORMA_PARCIAL';
}

function normalizeAccessLevel(level?: string | null): AccessLevel {
  if (level === 'FACIL' || level === 'COMPLICADO' || level === 'MUY_COMPLICADO') return level;
  return 'NORMAL';
}

function deriveSubtypes(data: DiscoverySessionData, workCodes: WorkCode[]): DiscoverySubtypeCode[] {
  const subtypes = new Set<DiscoverySubtypeCode>();
  if (data.classification.globalScope === 'TOTAL') subtypes.add('REFORMA_INTEGRAL');
  if (data.classification.globalScope !== 'TOTAL') subtypes.add('REFORMA_PARCIAL');
  if (data.currentVsTarget.redistribution?.value) subtypes.add('REDISTRIBUCION_INTERIOR');
  if (data.currentVsTarget.structureAffected?.value) subtypes.add('INTERVENCION_ESTRUCTURAL');
  if ((data.currentVsTarget.installationReplacement?.electricity === 'COMPLETA') || (data.currentVsTarget.installationReplacement?.plumbing === 'COMPLETA')) subtypes.add('INSTALACIONES_COMPLETAS');
  if ((data.currentVsTarget.installationReplacement?.electricity === 'PARCIAL') || (data.currentVsTarget.installationReplacement?.plumbing === 'PARCIAL')) subtypes.add('INSTALACIONES_PARCIALES');
  if (workCodes.includes('COCINA')) subtypes.add('COCINA_RENOVACION');
  if (workCodes.includes('BANOS')) subtypes.add('BANO_RENOVACION');
  if (data.currentVsTarget.changeOfUse?.value) subtypes.add('CAMBIO_USO');
  if (workCodes.includes('FACHADA')) subtypes.add('FACHADA');
  if (workCodes.includes('CUBIERTA')) subtypes.add('CUBIERTA');
  if (workCodes.includes('EXTERIOR_URBANIZACION')) subtypes.add('EXTERIOR');
  if ((data.assetContext.unitsCurrent || 1) > 1 || data.classification.assetType === 'EDIFICIO') subtypes.add('MULTIUNIDAD');
  if (data.classification.assetType === 'LOCAL') subtypes.add('LOCAL_COMERCIAL');
  if (data.classification.assetType === 'COLIVING') subtypes.add('COLIVING');
  if (data.classification.interventionType === 'OBRA_NUEVA') subtypes.add('OBRA_NUEVA_RESIDENCIAL');
  if (data.classification.interventionType === 'REHABILITACION' && data.classification.assetType === 'EDIFICIO') subtypes.add('REHABILITACION_EDIFICIO');
  if (data.finishProfile.globalLevel === 'ALTO') subtypes.add('MEJORA_ACABADOS');
  return Array.from(subtypes);
}

function deriveComplexityProfile(data: DiscoverySessionData): ComplexityProfile {
  let score = 0;
  const drivers: string[] = [];
  if (data.assetContext.occupancyState === 'OCUPADO' || data.executionConstraints.occupied) {
    score += 2;
    drivers.push('ocupado');
  }
  if (data.assetContext.hasElevator === false) {
    score += 2;
    drivers.push('sin_ascensor');
  }
  if (data.assetContext.accessLevel === 'COMPLICADO' || data.assetContext.accessLevel === 'MUY_COMPLICADO') {
    score += 2;
    drivers.push('acceso_dificil');
  }
  if (data.executionConstraints.communityRestrictions) {
    score += 1;
    drivers.push('comunidad');
  }
  if (data.executionConstraints.worksInPhases) {
    score += 2;
    drivers.push('fases');
  }
  if (data.executionConstraints.urgent) {
    score += 2;
    drivers.push('urgencia');
  }
  if (data.currentVsTarget.structureAffected?.value) {
    score += 3;
    drivers.push('estructura');
  }
  if (data.currentVsTarget.changeOfUse?.value) {
    score += 3;
    drivers.push('cambio_uso');
  }
  if ((data.assetContext.unitsCurrent || 1) > 1 || data.classification.assetType === 'EDIFICIO') {
    score += 2;
    drivers.push('multiunidad');
  }

  const riskLevel = score >= 9 ? 'ALTA' : score >= 6 ? 'MEDIA_ALTA' : score >= 3 ? 'MEDIA' : 'BAJA';
  const sensitivity = riskLevel === 'ALTA' ? 'ALTA' : riskLevel === 'MEDIA_ALTA' ? 'ALTA' : riskLevel === 'MEDIA' ? 'MEDIA' : 'BAJA';

  return {
    riskLevel,
    drivers,
    costSensitivity: sensitivity,
    scheduleSensitivity: sensitivity,
    procurementSensitivity: riskLevel === 'ALTA' ? 'ALTA' : 'MEDIA',
  };
}

function buildConditions(data: DiscoverySessionData, warnings: DiscoveryWarning[], assumptions: DiscoveryAssumption[]) {
  const parts: string[] = [];
  if (data.assetContext.occupancyState) parts.push(`Estado inmueble: ${data.assetContext.occupancyState.toLowerCase()}`);
  if (typeof data.assetContext.floorNumber === 'number') parts.push(`Planta ${data.assetContext.floorNumber}`);
  if (data.assetContext.hasElevator === false) parts.push('Sin ascensor');
  if (data.assetContext.accessLevel && data.assetContext.accessLevel !== 'NO_LO_SE') parts.push(`Acceso ${data.assetContext.accessLevel.toLowerCase()}`);
  if (data.executionConstraints.communityRestrictions) parts.push('Comunidad con restricciones');
  if (data.executionConstraints.timeRestrictions) parts.push('Restricciones horarias');
  if (data.executionConstraints.worksInPhases) parts.push('Obra por fases');
  if (data.executionConstraints.urgent) parts.push('Urgencia alta');
  if (data.currentVsTarget.redistribution?.value) parts.push('Redistribucion interior');

  const inclusionNotes = Object.entries(data.inclusions)
    .filter(([, mode]) => mode !== 'INCLUIDO')
    .map(([family, mode]) => `${family.toLowerCase()}: ${mode.toLowerCase()}`);
  parts.push(...inclusionNotes);

  warnings.forEach((warning) => parts.push(`Aviso: ${warning.message}`));
  assumptions.forEach((assumption) => parts.push(`Supuesto: ${assumption.message}`));

  return parts.join('. ');
}

function deriveWorks(data: DiscoverySessionData): WorkCode[] {
  const workSet = new Set<WorkCode>(data.macroScope.workCodes);
  for (const areaActions of data.actionsByArea) {
    for (const action of areaActions.actions) {
      const mapped = ACTION_TO_WORK_CODES[action.actionCode] || [];
      mapped.forEach((workCode) => workSet.add(workCode));
    }
  }
  return Array.from(workSet);
}

export function deriveInputFromSession(
  data: DiscoverySessionData,
  budgetGoal: BudgetGoal,
  precisionMode: PrecisionMode,
  warnings: DiscoveryWarning[],
  assumptions: DiscoveryAssumption[],
  confidenceLevel: 'BAJA' | 'MEDIA' | 'ALTA'
): DerivedInput {
  const works = deriveWorks(data);
  const siteType = normalizeSiteType(data.classification.assetType);
  const workType = normalizeWorkType(data);
  const scopeType = normalizeScopeType(data);
  const complexityProfile = deriveComplexityProfile(data);
  const subtypes = deriveSubtypes(data, works);
  const area = data.assetContext.areaM2 || 0;

  return {
    discoverySchemaVersion: DISCOVERY_SCHEMA_VERSION,
    derivedInputVersion: DERIVED_INPUT_VERSION,
    summaryVersion: DISCOVERY_SUMMARY_VERSION,
    workType,
    siteType,
    scopeType,
    finishLevel: data.finishProfile.globalLevel as FinishLevel,
    accessLevel: normalizeAccessLevel(data.assetContext.accessLevel),
    conditions: buildConditions(data, warnings, assumptions),
    area,
    bathrooms: data.currentVsTarget.bathrooms?.target ?? data.assetContext.bathroomsCurrent ?? 0,
    kitchens: data.currentVsTarget.kitchens?.target ?? data.assetContext.kitchensCurrent ?? 0,
    rooms: data.currentVsTarget.rooms?.target ?? data.assetContext.roomsCurrent ?? 0,
    units: data.assetContext.unitsCurrent ?? 1,
    floors: data.assetContext.floors ?? 1,
    hasElevator: data.assetContext.hasElevator ?? null,
    structuralWorks: Boolean(data.currentVsTarget.structureAffected?.value || works.includes('ESTRUCTURA')),
    works,
    worksText: works.map((code) => WORK_CODE_LABELS[code]).join(', '),
    areas: data.areas
      .filter((areaItem) => areaItem.selected)
      .map((areaItem) => ({
        areaId: areaItem.areaId,
        areaType: areaItem.areaType,
        label: areaItem.label,
        index: areaItem.index ?? null,
        approxSizeM2: areaItem.approxSizeM2 ?? null,
        currentState: areaItem.currentState?.summary || null,
        targetState: areaItem.targetState?.summary || null,
        certainty: areaItem.certainty,
      })),
    actionsByArea: data.actionsByArea,
    discoveryProfile: {
      workType,
      subtypes,
      complexityProfile,
    },
    precisionMode,
    budgetGoal,
    inclusions: data.inclusions,
    currentVsTarget: data.currentVsTarget,
    executionConstraints: data.executionConstraints,
    certainty: {
      byBlock: data.certainty.byBlock,
      confidenceLevel,
    },
    assumptions,
    warnings,
  };
}
