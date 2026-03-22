import { ACTION_TO_WORK_CODES } from './catalogs';
import { resolveTechnicalSpecToExecutionContext } from './resolve-technical-spec';
import type {
  AccessLevel,
  FinishLevel,
  ScopeType,
  SiteType,
  WorkType,
} from '@/lib/automation/types';
import type {
  AreaActionCode,
  CertaintyLevel,
  DiscoveryAreaActions,
  DiscoveryAssetType,
  DiscoverySessionData,
  DiscoverySubtypeCode,
  ExecutionContext,
  InclusionFamily,
  InclusionMode,
  MeasurementDrivers,
  ModelingStrategy,
  ResolvedSpace,
  SpaceFeatures,
  SpaceGroup,
  SpaceInstance,
  SpaceTechnicalScope,
  SystemCode,
  TechnicalAction,
  WorkCode,
} from './types';

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

export function mapSystemToWorkCode(system: SystemCode): WorkCode {
  const mapping: Record<SystemCode, WorkCode> = {
    DEMOLICION: 'DEMOLICION',
    REDISTRIBUCION: 'REDISTRIBUCION_INTERIOR',
    ALBANILERIA: 'ALBANILERIA',
    PLADUR: 'PLADUR',
    ELECTRICIDAD: 'ELECTRICIDAD',
    FONTANERIA: 'FONTANERIA',
    SANEAMIENTO: 'SANEAMIENTO',
    CLIMATIZACION: 'CLIMATIZACION',
    VENTILACION: 'VENTILACION',
    ILUMINACION: 'ILUMINACION',
    CARPINTERIA_INTERIOR: 'CARPINTERIA_INTERIOR',
    CARPINTERIA_EXTERIOR: 'CARPINTERIA_EXTERIOR',
    REVESTIMIENTOS: 'REVESTIMIENTOS',
    PINTURA: 'PINTURA',
    FALSO_TECHO: 'FALSO_TECHO',
    COCINA: 'COCINA',
    BANOS: 'BANOS',
    ESTRUCTURA: 'ESTRUCTURA',
    FACHADA: 'FACHADA',
    CUBIERTA: 'CUBIERTA',
    IMPERMEABILIZACION: 'IMPERMEABILIZACION',
    AISLAMIENTO: 'AISLAMIENTO',
    EXTERIOR_URBANIZACION: 'EXTERIOR_URBANIZACION',
  };

  return mapping[system];
}

export function mapWorkCodeToSystem(workCode: WorkCode): SystemCode {
  const mapping: Record<WorkCode, SystemCode> = {
    DEMOLICION: 'DEMOLICION',
    REDISTRIBUCION_INTERIOR: 'REDISTRIBUCION',
    ALBANILERIA: 'ALBANILERIA',
    PLADUR: 'PLADUR',
    ELECTRICIDAD: 'ELECTRICIDAD',
    FONTANERIA: 'FONTANERIA',
    SANEAMIENTO: 'SANEAMIENTO',
    CLIMATIZACION: 'CLIMATIZACION',
    CARPINTERIA_INTERIOR: 'CARPINTERIA_INTERIOR',
    CARPINTERIA_EXTERIOR: 'CARPINTERIA_EXTERIOR',
    REVESTIMIENTOS: 'REVESTIMIENTOS',
    PINTURA: 'PINTURA',
    COCINA: 'COCINA',
    BANOS: 'BANOS',
    ESTRUCTURA: 'ESTRUCTURA',
    FACHADA: 'FACHADA',
    CUBIERTA: 'CUBIERTA',
    EXTERIOR_URBANIZACION: 'EXTERIOR_URBANIZACION',
    ILUMINACION: 'ILUMINACION',
    FALSO_TECHO: 'FALSO_TECHO',
    VENTILACION: 'VENTILACION',
    IMPERMEABILIZACION: 'IMPERMEABILIZACION',
    AISLAMIENTO: 'AISLAMIENTO',
    LIMPIEZA_FINAL: 'DEMOLICION',
    MEDIOS_AUXILIARES: 'ALBANILERIA',
  };

  return mapping[workCode];
}

export function mapActionCodeToWorkCodes(actionCode: AreaActionCode): WorkCode[] {
  return ACTION_TO_WORK_CODES[actionCode] || [];
}

function mergeFeatures(...parts: Array<Partial<SpaceFeatures> | undefined>): SpaceFeatures {
  return Object.assign({}, ...parts);
}

function mergeMeasurementDrivers(...parts: Array<Partial<MeasurementDrivers> | undefined>): MeasurementDrivers {
  return Object.assign({}, ...parts);
}

function mergeInclusions(
  ...parts: Array<Partial<Record<InclusionFamily, InclusionMode>> | undefined>
): Partial<Record<InclusionFamily, InclusionMode>> {
  return Object.assign({}, ...parts);
}

function mergeTechnicalScope(
  parent: SpaceTechnicalScope | undefined,
  patch: Partial<SpaceTechnicalScope> | undefined
): SpaceTechnicalScope {
  if (!parent && !patch) {
    return {
      mergeMode: 'INHERIT',
      activeSystems: [],
      actions: [],
      finishes: {},
      inclusions: {},
      notes: null,
    };
  }

  if (!parent) {
    return {
      mergeMode: patch?.mergeMode || 'INHERIT',
      activeSystems: patch?.activeSystems || [],
      actions: patch?.actions || [],
      finishes: patch?.finishes || {},
      inclusions: patch?.inclusions || {},
      notes: patch?.notes || null,
    };
  }

  if (!patch) return parent;

  if (patch.mergeMode === 'REPLACE') {
    return {
      mergeMode: 'REPLACE',
      activeSystems: patch.activeSystems || [],
      actions: patch.actions || [],
      finishes: patch.finishes || {},
      inclusions: patch.inclusions || {},
      notes: patch.notes || null,
    };
  }

  const activeSystems = new Map(parent.activeSystems.map((item) => [item.system, item]));
  for (const item of patch.activeSystems || []) {
    activeSystems.set(item.system, item);
  }

  const actions = new Map(parent.actions.map((item) => [item.actionCode, item]));
  for (const item of patch.actions || []) {
    actions.set(item.actionCode, item);
  }

  return {
    mergeMode: patch.mergeMode || parent.mergeMode || 'INHERIT',
    activeSystems: Array.from(activeSystems.values()),
    actions: Array.from(actions.values()),
    finishes: { ...(parent.finishes || {}), ...(patch.finishes || {}) },
    inclusions: mergeInclusions(parent.inclusions, patch.inclusions),
    notes: patch.notes ?? parent.notes ?? null,
  };
}

function deriveActionQuantity(action: TechnicalAction, measurementDrivers: MeasurementDrivers): number | null {
  if (typeof action.quantityHint?.value === 'number') return action.quantityHint.value;

  switch (action.quantityHint?.unit) {
    case 'M2':
      return measurementDrivers.floorSurfaceM2 ?? measurementDrivers.areaM2 ?? null;
    case 'ML':
      return measurementDrivers.linearMeters ?? measurementDrivers.perimeterMl ?? null;
    case 'UD':
      return (
        measurementDrivers.doorsCount ??
        measurementDrivers.windowsCount ??
        measurementDrivers.sanitaryFixturesCount ??
        1
      );
    default:
      return null;
  }
}

export function resolveQuantityHint(params: {
  quantityHint?: TechnicalAction['quantityHint'] | null;
  measurementDrivers: MeasurementDrivers;
  fallbackValue?: number | null;
}) {
  const { quantityHint, measurementDrivers, fallbackValue = null } = params;
  if (typeof quantityHint?.value === 'number') {
    return {
      source: 'quantityHint' as const,
      value: quantityHint.value,
    };
  }

  const derived = quantityHint
    ? deriveActionQuantity(
        {
          actionCode: 'DEMOLER',
          system: 'DEMOLICION',
          enabled: true,
          interventionMode: 'PARCIAL',
          quantityHint,
          certainty: quantityHint.certainty,
        },
        measurementDrivers
      )
    : null;

  if (typeof derived === 'number') {
    return {
      source: 'measurementDrivers' as const,
      value: derived,
    };
  }

  return {
    source: 'fallback' as const,
    value: fallbackValue,
  };
}

function getTemplateFromGroup(group: SpaceGroup | undefined) {
  return group?.template;
}

function createResolvedSpace(params: {
  sessionData: DiscoverySessionData;
  instance: SpaceInstance;
  group?: SpaceGroup;
  parentResolved?: ResolvedSpace;
}): ResolvedSpace {
  const { sessionData, instance, group, parentResolved } = params;
  const template = getTemplateFromGroup(group);
  const overrides = sessionData.spatialModel.overrides;
  const projectOverride = overrides.project;
  const floorOverride = instance.floorId ? overrides.floors?.[instance.floorId] : undefined;
  const groupOverride = group ? overrides.groups?.[group.groupId] : undefined;
  const instanceOverride = overrides.instances?.[instance.instanceId];

  const features = mergeFeatures(
    template?.features,
    group?.features,
    instance.features,
    projectOverride?.features,
    floorOverride?.features,
    groupOverride?.features,
    instanceOverride?.features
  );

  const measurementDrivers = mergeMeasurementDrivers(
    template?.measurementDrivers,
    group?.measurementDrivers,
    instance.measurementDrivers,
    projectOverride?.measurementDrivers,
    floorOverride?.measurementDrivers,
    groupOverride?.measurementDrivers,
    instanceOverride?.measurementDrivers
  );

  const technicalScope = mergeTechnicalScope(
    mergeTechnicalScope(
      mergeTechnicalScope(
        mergeTechnicalScope(
          mergeTechnicalScope(template?.technicalScope, group?.technicalScope),
          instance.technicalScope
        ),
        projectOverride?.technicalScope
      ),
      floorOverride?.technicalScope
    ),
    mergeTechnicalScope(groupOverride?.technicalScope as SpaceTechnicalScope | undefined, instanceOverride?.technicalScope)
  );

  const derivedWorkCodes = unique([
    ...technicalScope.activeSystems.filter((item) => item.enabled).map((item) => mapSystemToWorkCode(item.system)),
    ...technicalScope.actions
      .filter((item) => item.enabled)
      .flatMap((item) => mapActionCodeToWorkCodes(item.actionCode as AreaActionCode)),
  ]);

  const quantityHints = Object.fromEntries(
    technicalScope.actions.map((action) => [
      action.actionCode,
      deriveActionQuantity(action, measurementDrivers),
    ])
  );

  return {
    spaceId: instance.instanceId,
    floorId: instance.floorId || null,
    parentSpaceId: instance.parentInstanceId || parentResolved?.spaceId || null,
    sourceTemplateId: template?.templateId || null,
    sourceGroupId: group?.groupId || null,
    areaType: instance.areaType,
    unitKind: instance.unitKind || template?.unitKind || null,
    spaceKind: instance.spaceKind,
    subspaceKind: instance.subspaceKind || template?.subspaceKind || null,
    label: instance.label,
    features,
    measurementDrivers,
    technicalScope,
    derivedWorkCodes,
    quantityHints,
    certainty: instance.certainty,
    overrideTrace: [
      projectOverride ? 'project' : '',
      floorOverride ? 'floor' : '',
      groupOverride ? 'group' : '',
      instanceOverride ? 'instance' : '',
    ].filter(Boolean),
  };
}

function shouldCountAsArea(space: ResolvedSpace) {
  if (space.features.countAsArea === false) return false;
  if (space.features.areaIncludedInParent) return false;
  return typeof space.measurementDrivers.areaM2 === 'number' && space.measurementDrivers.areaM2 > 0;
}

function shouldCountAsRoom(space: ResolvedSpace) {
  if (typeof space.features.countAsRoom === 'boolean') return space.features.countAsRoom;
  return space.unitKind === 'HABITACION' || (space.areaType === 'HABITACION' && !space.parentSpaceId);
}

function shouldCountAsBathroom(space: ResolvedSpace) {
  if (typeof space.features.countAsBathroom === 'boolean') return space.features.countAsBathroom;
  return space.subspaceKind === 'BANO_ASOCIADO' || space.subspaceKind === 'ASEO_ASOCIADO' || space.areaType === 'BANO' || space.areaType === 'ASEO';
}

function shouldCountAsKitchen(space: ResolvedSpace) {
  if (typeof space.features.countAsKitchen === 'boolean') return space.features.countAsKitchen;
  return space.subspaceKind === 'KITCHENETTE' || space.subspaceKind === 'COCINA_ASOCIADA' || space.areaType === 'COCINA' || Boolean(space.features.hasKitchenette);
}

function shouldCountAsUnit(space: ResolvedSpace) {
  if (typeof space.features.countAsUnit === 'boolean') return space.features.countAsUnit;
  return ['VIVIENDA', 'HABITACION', 'ESTUDIO', 'APARTAMENTO', 'SUITE', 'LOCAL', 'OFICINA', 'NAVE'].includes(space.unitKind || '');
}

function resolveSimpleMode(sessionData: DiscoverySessionData): ResolvedSpace[] {
  const actionLookup = new Map<string, DiscoveryAreaActions>(
    sessionData.actionsByArea.map((item) => [item.areaId, item])
  );

  return sessionData.areas
    .filter((area) => area.selected)
    .map((area) => {
      const actions = actionLookup.get(area.areaId)?.actions || [];
      const activeSystemsMap = new Map<SystemCode, ResolvedSpace['technicalScope']['activeSystems'][number]>();
      for (const action of actions) {
        for (const workCode of mapActionCodeToWorkCodes(action.actionCode)) {
          const system = mapWorkCodeToSystem(workCode);
          activeSystemsMap.set(system, {
            system,
            enabled: true,
            interventionMode:
              action.replaceMode === 'CONSERVAR'
                ? 'CONSERVACION'
                : action.coverage === 'PARCIAL'
                  ? 'PARCIAL'
                  : 'COMPLETO',
            coverage: action.coverage === 'PARCIAL' ? 'PARCIAL' : 'TOTAL',
            certainty: action.certainty,
          });
        }
      }
      const activeSystems = Array.from(activeSystemsMap.values());

      return {
        spaceId: area.areaId,
        floorId: null,
        parentSpaceId: null,
        sourceTemplateId: null,
        sourceGroupId: null,
        areaType: area.areaType,
        unitKind: area.areaType === 'HABITACION' ? 'HABITACION' : area.areaType === 'VIVIENDA' ? 'VIVIENDA' : null,
        spaceKind: area.areaType === 'VIVIENDA' ? 'UNIDAD_PRINCIPAL' : 'ESTANCIA',
        subspaceKind: area.areaType === 'BANO' ? 'BANO_ASOCIADO' : area.areaType === 'COCINA' ? 'COCINA_ASOCIADA' : null,
        label: area.label,
        features: {
          countAsArea: true,
          areaIncludedInParent: false,
          countAsRoom: area.areaType === 'HABITACION',
          countAsBathroom: area.areaType === 'BANO' || area.areaType === 'ASEO',
          countAsKitchen: area.areaType === 'COCINA',
          countAsUnit: area.areaType === 'VIVIENDA',
          hasBathroom: area.areaType === 'BANO',
          hasKitchenette: area.areaType === 'COCINA',
          finishLevel: sessionData.finishProfile.globalLevel,
        },
        measurementDrivers: {
          areaM2: area.approxSizeM2 ?? null,
          floorSurfaceM2: area.approxSizeM2 ?? null,
        },
        technicalScope: {
          mergeMode: 'REPLACE',
          activeSystems,
          actions: actions.map((action) => ({
            actionCode: action.actionCode as unknown as any,
            system: mapWorkCodeToSystem(mapActionCodeToWorkCodes(action.actionCode)[0] || 'ALBANILERIA'),
            enabled: true,
            interventionMode:
              action.replaceMode === 'CONSERVAR'
                ? 'CONSERVACION'
                : action.coverage === 'PARCIAL'
                  ? 'PARCIAL'
                  : 'COMPLETO',
            coverage: action.coverage === 'PARCIAL' ? 'PARCIAL' : 'TOTAL',
            quantityHint: action.quantityHint,
            notes: action.notes || null,
            certainty: action.certainty,
          })),
          finishes: { GLOBAL: sessionData.finishProfile.globalLevel },
          inclusions: sessionData.inclusions,
          notes: null,
        },
        derivedWorkCodes: unique([
          ...sessionData.macroScope.workCodes,
          ...actions.flatMap((action) => mapActionCodeToWorkCodes(action.actionCode)),
        ]),
        quantityHints: Object.fromEntries(
          actions.map((action) => [action.actionCode, action.quantityHint?.value ?? area.approxSizeM2 ?? null])
        ),
        certainty: area.certainty,
        overrideTrace: [],
      } satisfies ResolvedSpace;
    });
}

function resolveStructuredMode(sessionData: DiscoverySessionData): ResolvedSpace[] {
  const resolved: ResolvedSpace[] = [];
  const groupsById = new Map(sessionData.spatialModel.groups.map((group) => [group.groupId, group]));

  const rootInstances = sessionData.spatialModel.instances.filter((instance) => !instance.parentInstanceId);

  const visitInstance = (instance: SpaceInstance, parentResolved?: ResolvedSpace) => {
    const group = instance.groupId ? groupsById.get(instance.groupId) : undefined;
    const resolvedSpace = createResolvedSpace({
      sessionData,
      instance,
      group,
      parentResolved,
    });
    resolved.push(resolvedSpace);

    const children = sessionData.spatialModel.instances.filter((child) => child.parentInstanceId === instance.instanceId);
    for (const child of children) {
      visitInstance(child, resolvedSpace);
    }
  };

  for (const instance of rootInstances) {
    visitInstance(instance);
  }

  return resolved;
}

function buildCompatibilityAreas(resolvedSpaces: ResolvedSpace[]) {
  return resolvedSpaces.map((space, index) => ({
    areaId: space.spaceId,
    areaType: space.areaType,
    label: space.label,
    index: index + 1,
    approxSizeM2: space.measurementDrivers.areaM2 ?? null,
    currentState: null,
    targetState: null,
    certainty: space.certainty,
  }));
}

function buildCompatibilityActions(resolvedSpaces: ResolvedSpace[]): DiscoveryAreaActions[] {
  return resolvedSpaces.map((space) => ({
    areaId: space.spaceId,
    actions: space.technicalScope.actions.map((action) => ({
      actionCode: action.actionCode as AreaActionCode,
      coverage: action.coverage || 'TOTAL',
      replaceMode:
        action.interventionMode === 'CONSERVACION'
          ? 'CONSERVAR'
          : action.interventionMode === 'PARCIAL'
            ? 'MEZCLA'
            : action.interventionMode === 'SUSTITUCION'
              ? 'SUSTITUIR'
              : 'SUSTITUIR',
      quantityHint: action.quantityHint || null,
      notes: action.notes || null,
      certainty: action.certainty,
    })),
  }));
}

function buildTotals(resolvedSpaces: ResolvedSpace[]) {
  const areaM2 = resolvedSpaces.reduce((sum, space) => sum + (shouldCountAsArea(space) ? space.measurementDrivers.areaM2 || 0 : 0), 0);
  const bathrooms = resolvedSpaces.filter(shouldCountAsBathroom).length;
  const kitchens = resolvedSpaces.filter(shouldCountAsKitchen).length;
  const rooms = resolvedSpaces.filter(shouldCountAsRoom).length;
  const units = resolvedSpaces.filter(shouldCountAsUnit).length;
  const floors = unique(resolvedSpaces.map((space) => space.floorId).filter(Boolean)).length;

  return {
    areaM2: Number(areaM2.toFixed(2)),
    bathrooms,
    kitchens,
    rooms,
    units,
    floors,
  };
}

export function shouldUseStructuredMode(sessionData: DiscoverySessionData) {
  if (sessionData.modelingStrategy === 'STRUCTURED_REPETITIVE') return true;
  if (['EDIFICIO', 'COLIVING', 'HOTEL'].includes(sessionData.classification.assetType)) return true;
  if ((sessionData.assetContext.floors || 0) > 1) return true;
  if ((sessionData.assetContext.unitsCurrent || 0) > 1) return true;
  if (sessionData.spatialModel.groups.length > 0 || sessionData.spatialModel.instances.length > 0) return true;
  return false;
}

export function shouldSuggestStructuredMode(sessionData: DiscoverySessionData) {
  const assetType = sessionData.classification.assetType;
  return (
    assetType === 'EDIFICIO' ||
    assetType === 'COLIVING' ||
    assetType === 'HOTEL' ||
    (sessionData.assetContext.floors || 0) > 1 ||
    (sessionData.assetContext.unitsCurrent || 0) > 1 ||
    sessionData.currentVsTarget.bathrooms?.target === null
  );
}

export function createSuggestedStructuredSeed(assetType: DiscoveryAssetType) {
  const baseAreaType: 'HABITACION' | 'VIVIENDA' =
    assetType === 'HOTEL' || assetType === 'COLIVING' ? 'HABITACION' : 'VIVIENDA';
  const baseUnitKind: 'HABITACION' | 'VIVIENDA' =
    assetType === 'HOTEL' || assetType === 'COLIVING' ? 'HABITACION' : 'VIVIENDA';
  return {
    baseAreaType,
    baseUnitKind,
  };
}

export function resolveSpatialModelToExecutionContext(
  sessionData: DiscoverySessionData,
  input: {
    workType: WorkType;
    siteType: SiteType;
    scopeType: ScopeType;
    finishLevel: FinishLevel;
    accessLevel: AccessLevel;
    conditions: string;
    structuralWorks: boolean;
    complexityProfile?: DiscoverySessionData['discoveryProfile']['complexityProfile'];
    subtypes?: DiscoverySubtypeCode[];
    confidenceLevel?: 'BAJA' | 'MEDIA' | 'ALTA';
    warnings?: string[];
    assumptions?: string[];
  }
): ExecutionContext {
  const mode: ModelingStrategy = shouldUseStructuredMode(sessionData)
    ? 'STRUCTURED_REPETITIVE'
    : 'SIMPLE_AREA_BASED';

  const resolvedSpaces =
    mode === 'STRUCTURED_REPETITIVE'
      ? resolveStructuredMode(sessionData)
      : resolveSimpleMode(sessionData);

  const totals = buildTotals(resolvedSpaces);
  const workCodes = unique([
    ...sessionData.macroScope.workCodes,
    ...resolvedSpaces.flatMap((space) => space.derivedWorkCodes),
  ]);
  const baseContext: ExecutionContext = {
    mode,
    project: {
      workType: input.workType,
      siteType: input.siteType,
      scopeType: input.scopeType,
      finishLevel: input.finishLevel,
      accessLevel: input.accessLevel,
      conditions: input.conditions,
      structuralWorks: input.structuralWorks,
      technicalSpecStatus: sessionData.technicalSpecModel?.status || 'INCOMPLETE',
      complexityProfile: input.complexityProfile,
    },
    totals,
    workCodes,
    subtypes: input.subtypes || [],
    resolvedSpaces,
    resolvedSpecs: {
      bySpaceId: {},
      completeness: {
        level: 'LOW',
        specifiedScopePercent: 0,
        missingScopes: [],
      },
    },
    inclusions: sessionData.inclusions,
    currentVsTarget: sessionData.currentVsTarget as unknown as Record<string, unknown>,
    executionConstraints: sessionData.executionConstraints as unknown as Record<string, unknown>,
    certainty: {
      confidenceLevel: input.confidenceLevel || 'MEDIA',
      byBlock: sessionData.certainty.byBlock,
    },
    warnings: input.warnings || [],
    assumptions: input.assumptions || [],
  };

  return {
    ...baseContext,
    resolvedSpecs: resolveTechnicalSpecToExecutionContext(sessionData, baseContext),
  };
}

export function buildCompatibilityFromExecutionContext(executionContext: ExecutionContext) {
  return {
    areas: buildCompatibilityAreas(executionContext.resolvedSpaces),
    actionsByArea: buildCompatibilityActions(executionContext.resolvedSpaces),
    works: executionContext.workCodes,
    worksText: executionContext.workCodes.join(', '),
    totals: executionContext.totals,
  };
}
