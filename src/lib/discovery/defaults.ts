import {
  AREA_CATALOG,
  AREA_LABELS,
  DISCOVERY_SCHEMA_VERSION,
  DISCOVERY_SUMMARY_VERSION,
  DERIVED_INPUT_VERSION,
  INCLUSION_FAMILIES,
} from './catalogs';
import type {
  AreaType,
  DiscoveryArea,
  DiscoveryAssetType,
  DiscoverySessionData,
  FloorNode,
  InclusionMode,
  SpaceTemplate,
  SpaceTechnicalScope,
} from './types';

function createDefaultAreas(assetType: DiscoveryAssetType): DiscoveryArea[] {
  return AREA_CATALOG[assetType].map((areaType, index) => ({
    areaId: `${areaType.toLowerCase()}-${index + 1}`,
    areaType,
    label: AREA_LABELS[areaType],
    index: ['BANO', 'HABITACION', 'VIVIENDA'].includes(areaType) ? index + 1 : null,
    selected: false,
    approxSizeM2: null,
    currentState: { summary: '', exists: null, certainty: 'PENDIENTE' },
    targetState: { summary: '', exists: null, certainty: 'PENDIENTE' },
    certainty: 'PENDIENTE',
  }));
}

function createDefaultInclusions(): Record<string, InclusionMode> {
  return INCLUSION_FAMILIES.reduce<Record<string, InclusionMode>>((acc, family) => {
    acc[family] = 'PENDIENTE';
    return acc;
  }, {});
}

export function createDefaultTechnicalScope(): SpaceTechnicalScope {
  return {
    mergeMode: 'INHERIT',
    activeSystems: [],
    actions: [],
    finishes: {},
    inclusions: {},
    notes: null,
  };
}

export function createDefaultTemplate(areaType: AreaType, label: string): SpaceTemplate {
  return {
    templateId: `${areaType.toLowerCase()}-template`,
    areaType,
    unitKind: areaType === 'HABITACION' ? 'HABITACION' : areaType === 'VIVIENDA' ? 'VIVIENDA' : null,
    spaceKind: areaType === 'VIVIENDA' ? 'UNIDAD_PRINCIPAL' : 'ESTANCIA',
    subspaceKind: areaType === 'BANO' ? 'BANO_ASOCIADO' : areaType === 'COCINA' ? 'COCINA_ASOCIADA' : null,
    label,
    features: {
      countAsArea: true,
      areaIncludedInParent: false,
      countAsRoom: areaType === 'HABITACION',
      countAsBathroom: areaType === 'BANO' || areaType === 'ASEO',
      countAsKitchen: areaType === 'COCINA',
      countAsUnit: areaType === 'VIVIENDA',
      hasBathroom: areaType === 'BANO',
      hasKitchenette: areaType === 'COCINA',
      finishLevel: 'MEDIO',
    },
    measurementDrivers: {
      areaM2: null,
      floorSurfaceM2: null,
    },
    technicalScope: createDefaultTechnicalScope(),
    subspaces: [],
  };
}

function createDefaultFloors(): FloorNode[] {
  return [
    {
      floorId: 'floor-1',
      label: 'Planta principal',
      index: 1,
      type: 'BAJA',
      selected: true,
      features: {},
      measurementDrivers: {},
      technicalScope: {},
      notes: '',
    },
  ];
}

export function createEmptyDiscoverySessionData(assetType: DiscoveryAssetType = 'PISO'): DiscoverySessionData {
  return {
    classification: {
      freeTextBrief: '',
      interventionType: 'REFORMA',
      assetType,
      globalScope: 'PARCIAL',
      certainty: 'PENDIENTE',
    },
    budgetGoal: 'COMERCIAL',
    precisionMode: 'MEDIO',
    modelingStrategy: 'SIMPLE_AREA_BASED',
    assetContext: {
      areaM2: null,
      magnitudeLabel: '',
      floors: null,
      floorNumber: null,
      roomsCurrent: null,
      bathroomsCurrent: null,
      kitchensCurrent: null,
      unitsCurrent: null,
      hasElevator: null,
      occupancyState: 'NO_LO_SE',
      accessLevel: 'NO_LO_SE',
      certainty: {},
    },
    currentVsTarget: {
      rooms: { current: null, target: null, certainty: 'PENDIENTE' },
      bathrooms: { current: null, target: null, certainty: 'PENDIENTE' },
      kitchens: { current: null, target: null, certainty: 'PENDIENTE' },
      kitchenStateChange: { current: '', target: '', certainty: 'PENDIENTE' },
      redistribution: { value: null, certainty: 'PENDIENTE' },
      structureAffected: { value: null, certainty: 'PENDIENTE' },
      changeOfUse: { value: null, certainty: 'PENDIENTE' },
      installationReplacement: {
        electricity: 'PENDIENTE',
        plumbing: 'PENDIENTE',
        hvac: 'PENDIENTE',
        certainty: 'PENDIENTE',
      },
    },
    macroScope: {
      workCodes: [],
      certainty: 'PENDIENTE',
    },
    spatialModel: {
      mode: 'SIMPLE_AREA_BASED',
      floors: createDefaultFloors(),
      groups: [],
      instances: [],
      overrides: {
        project: {},
        floors: {},
        groups: {},
        instances: {},
      },
    },
    areas: createDefaultAreas(assetType),
    actionsByArea: [],
    interventionProfile: {
      globalIntensity: 'PARCIAL',
      certainty: 'PENDIENTE',
    },
    finishProfile: {
      globalLevel: 'MEDIO',
      tradeOverrides: {},
      certainty: 'PENDIENTE',
    },
    executionConstraints: {
      occupied: null,
      communityRestrictions: null,
      timeRestrictions: null,
      worksInPhases: null,
      urgent: null,
      licensePending: null,
      logisticsDifficulty: 'PENDIENTE',
      specialProtections: null,
      partialInstallationsReuse: null,
      notes: '',
      certainty: {},
    },
    inclusions: createDefaultInclusions() as DiscoverySessionData['inclusions'],
    certainty: {
      byBlock: {
        classification: 'PENDIENTE',
        assetContext: 'PENDIENTE',
        currentVsTarget: 'PENDIENTE',
        macroScope: 'PENDIENTE',
        areas: 'PENDIENTE',
        actions: 'PENDIENTE',
        finishes: 'PENDIENTE',
        constraints: 'PENDIENTE',
        inclusions: 'PENDIENTE',
        spatialModel: 'PENDIENTE',
      },
      unknowns: [],
      useSystemCriteria: true,
    },
    discoveryProfile: {
      workType: 'REFORMA_PARCIAL',
      subtypes: [],
      complexityProfile: {
        riskLevel: 'MEDIA',
        drivers: [],
        costSensitivity: 'MEDIA',
        scheduleSensitivity: 'MEDIA',
        procurementSensitivity: 'MEDIA',
      },
    },
  };
}

export const DISCOVERY_VERSION_DEFAULTS = {
  discoverySchemaVersion: DISCOVERY_SCHEMA_VERSION,
  derivedInputVersion: DERIVED_INPUT_VERSION,
  summaryVersion: DISCOVERY_SUMMARY_VERSION,
};
