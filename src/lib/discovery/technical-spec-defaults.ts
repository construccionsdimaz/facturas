import type {
  TechnicalSpecModel,
  TechnicalSpecPatch,
} from './technical-spec-types';

export function createEmptyTechnicalSpecPatch(): TechnicalSpecPatch {
  return {
    selections: {},
    dimensions: {
      roomAreaM2: null,
      bathAreaM2: null,
      kitchenetteLinearMeters: null,
      levelingAreaM2: null,
      commonAreaM2: null,
      partitionWallAreaM2: null,
      partitionHeightM: null,
      ceilingAreaM2: null,
      flooringAreaM2: null,
      skirtingLengthMl: null,
    },
    counts: {
      bathroomsCount: null,
      kitchenettesCount: null,
      doorCount: null,
      windowCount: null,
      shutterCount: null,
      electricalPointsCount: null,
      lightingPointsCount: null,
      plumbingPointsCount: null,
      drainagePointsCount: null,
    },
    options: {
      hasBathroom: undefined,
      hasKitchenette: undefined,
      isAccessibleBath: undefined,
      includeCommonCorridors: undefined,
      includePortal: undefined,
      includeStaircase: undefined,
      partitionInsulated: undefined,
      partitionBoardsPerFace: null,
      partitionThicknessMm: null,
      acousticRequirementBasic: undefined,
      includeSkirting: undefined,
      includeShutter: undefined,
    },
  };
}

export function createEmptyTechnicalSpecModel(): TechnicalSpecModel {
  return {
    version: 1,
    status: 'INCOMPLETE',
    strategy: 'PARAMETRIC',
    coverage: {
      rooms: false,
      bathrooms: false,
      kitchenettes: false,
      leveling: false,
      commonAreas: false,
      partitions: false,
      ceilings: false,
      flooring: false,
      carpentry: false,
      mep: false,
    },
    projectSpecs: createEmptyTechnicalSpecPatch(),
    floorSpecs: {},
    groupSpecs: {},
    instanceSpecs: {},
    subspaceSpecs: {},
  };
}

export function ensureTechnicalSpecPatch(
  patch?: TechnicalSpecPatch | null
): TechnicalSpecPatch {
  return {
    ...createEmptyTechnicalSpecPatch(),
    ...(patch || {}),
    selections: {
      ...createEmptyTechnicalSpecPatch().selections,
      ...(patch?.selections || {}),
    },
    dimensions: {
      ...createEmptyTechnicalSpecPatch().dimensions,
      ...(patch?.dimensions || {}),
    },
    counts: {
      ...createEmptyTechnicalSpecPatch().counts,
      ...(patch?.counts || {}),
    },
    options: {
      ...createEmptyTechnicalSpecPatch().options,
      ...(patch?.options || {}),
    },
  };
}

export function ensureTechnicalSpecModel(
  model?: TechnicalSpecModel | null
): TechnicalSpecModel {
  const base = createEmptyTechnicalSpecModel();
  return {
    version: 1,
    status:
      model?.status === 'READY_FOR_MEASUREMENT'
        ? 'READY_FOR_MEASUREMENT'
        : 'INCOMPLETE',
    strategy: model?.strategy === 'SPECIFIED' ? 'SPECIFIED' : 'PARAMETRIC',
    coverage: {
      ...base.coverage,
      ...(model?.coverage || {}),
    },
    projectSpecs: ensureTechnicalSpecPatch(model?.projectSpecs),
    floorSpecs: Object.fromEntries(
      Object.entries(model?.floorSpecs || {}).map(([key, value]) => [
        key,
        ensureTechnicalSpecPatch(value),
      ])
    ),
    groupSpecs: Object.fromEntries(
      Object.entries(model?.groupSpecs || {}).map(([key, value]) => [
        key,
        ensureTechnicalSpecPatch(value),
      ])
    ),
    instanceSpecs: Object.fromEntries(
      Object.entries(model?.instanceSpecs || {}).map(([key, value]) => [
        key,
        ensureTechnicalSpecPatch(value),
      ])
    ),
    subspaceSpecs: Object.fromEntries(
      Object.entries(model?.subspaceSpecs || {}).map(([key, value]) => [
        key,
        ensureTechnicalSpecPatch(value),
      ])
    ),
  };
}
