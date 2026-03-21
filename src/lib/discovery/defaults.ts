import { AREA_CATALOG, AREA_LABELS, DISCOVERY_SCHEMA_VERSION, DISCOVERY_SUMMARY_VERSION, DERIVED_INPUT_VERSION, INCLUSION_FAMILIES } from './catalogs';
import { DiscoveryArea, DiscoveryAssetType, DiscoverySessionData, InclusionMode } from './types';

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

export function createEmptyDiscoverySessionData(assetType: DiscoveryAssetType = 'PISO'): DiscoverySessionData {
  return {
    classification: {
      freeTextBrief: '',
      interventionType: 'REFORMA',
      assetType,
      globalScope: 'PARCIAL',
      certainty: 'PENDIENTE',
    },
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
