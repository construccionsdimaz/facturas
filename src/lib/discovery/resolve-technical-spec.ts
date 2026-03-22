import { ensureTechnicalSpecModel, ensureTechnicalSpecPatch } from './technical-spec-defaults';
import type { ExecutionContext } from './types';
import type {
  ResolvedSpec,
  ResolvedTechnicalSpecSummary,
  ResolvedSpecSourceLevel,
  TechnicalSpecPatch,
  TechnicalSpecSelection,
} from './technical-spec-types';
import type { DiscoverySessionData, ResolvedSpace } from './types';

function mergeSelections(
  ...parts: Array<TechnicalSpecSelection | undefined>
): TechnicalSpecSelection {
  return Object.assign({}, ...parts);
}

function mergePatchChain(
  ...parts: Array<TechnicalSpecPatch | undefined>
): TechnicalSpecPatch {
  const base = ensureTechnicalSpecPatch();
  return {
    selections: mergeSelections(...parts.map((part) => part?.selections)),
    dimensions: Object.assign({}, base.dimensions, ...parts.map((part) => part?.dimensions || {})),
    counts: Object.assign({}, base.counts, ...parts.map((part) => part?.counts || {})),
    options: Object.assign({}, base.options, ...parts.map((part) => part?.options || {})),
  };
}

function determinePrimarySource(space: ResolvedSpace, sessionData: DiscoverySessionData) {
  const model = ensureTechnicalSpecModel(sessionData.technicalSpecModel);

  const subspacePatch =
    space.subspaceKind && model.subspaceSpecs[space.spaceId]
      ? { level: 'SUBSPACE' as const, refId: space.spaceId, patch: model.subspaceSpecs[space.spaceId] }
      : null;
  const instancePatch = model.instanceSpecs[space.spaceId]
    ? { level: 'INSTANCE' as const, refId: space.spaceId, patch: model.instanceSpecs[space.spaceId] }
    : null;
  const groupPatch =
    space.sourceGroupId && model.groupSpecs[space.sourceGroupId]
      ? { level: 'GROUP' as const, refId: space.sourceGroupId, patch: model.groupSpecs[space.sourceGroupId] }
      : null;
  const floorPatch =
    space.floorId && model.floorSpecs[space.floorId]
      ? { level: 'FLOOR' as const, refId: space.floorId, patch: model.floorSpecs[space.floorId] }
      : null;
  const projectPatch = model.projectSpecs
    ? { level: 'PROJECT' as const, refId: undefined, patch: model.projectSpecs }
    : null;

  return subspacePatch || instancePatch || groupPatch || floorPatch || projectPatch;
}

function buildTrace(space: ResolvedSpace, sessionData: DiscoverySessionData) {
  const model = ensureTechnicalSpecModel(sessionData.technicalSpecModel);
  const trace: Array<{ level: ResolvedSpecSourceLevel; refId?: string }> = [];

  trace.push({ level: 'PROJECT' });
  if (space.floorId && model.floorSpecs[space.floorId]) {
    trace.push({ level: 'FLOOR', refId: space.floorId });
  }
  if (space.sourceGroupId && model.groupSpecs[space.sourceGroupId]) {
    trace.push({ level: 'GROUP', refId: space.sourceGroupId });
  }
  if (model.instanceSpecs[space.spaceId]) {
    trace.push({ level: 'INSTANCE', refId: space.spaceId });
  }
  if (space.subspaceKind && model.subspaceSpecs[space.spaceId]) {
    trace.push({ level: 'SUBSPACE', refId: space.spaceId });
  }

  return trace;
}

function inferAssumedFields(space: ResolvedSpace, merged: TechnicalSpecPatch): string[] {
  const assumedFields: string[] = [];

  if (space.unitKind === 'HABITACION' && !merged.selections.roomSolution) {
    assumedFields.push('selections.roomSolution');
  }

  if ((space.subspaceKind === 'BANO_ASOCIADO' || space.areaType === 'BANO' || space.features.hasBathroom) && !merged.selections.bathSolution) {
    assumedFields.push('selections.bathSolution');
  }

  if ((space.subspaceKind === 'KITCHENETTE' || space.areaType === 'COCINA' || space.features.hasKitchenette) && !merged.selections.kitchenetteSolution) {
    assumedFields.push('selections.kitchenetteSolution');
  }

  if (space.features.requiresLeveling && !merged.selections.levelingSolution) {
    assumedFields.push('selections.levelingSolution');
  }

  if (
    ['ZONA_COMUN', 'PASILLO', 'PORTAL', 'ESCALERA'].includes(space.areaType) &&
    !merged.selections.commonAreaSolution
  ) {
    assumedFields.push('selections.commonAreaSolution');
  }

  if ((space.unitKind === 'HABITACION' || space.areaType === 'HABITACION') && !merged.dimensions?.roomAreaM2 && !space.measurementDrivers.areaM2) {
    assumedFields.push('dimensions.roomAreaM2');
  }

  return assumedFields;
}

function resolveSpecForSpace(space: ResolvedSpace, sessionData: DiscoverySessionData): ResolvedSpec {
  const model = ensureTechnicalSpecModel(sessionData.technicalSpecModel);
  const merged = mergePatchChain(
    model.projectSpecs,
    space.floorId ? model.floorSpecs[space.floorId] : undefined,
    space.sourceGroupId ? model.groupSpecs[space.sourceGroupId] : undefined,
    model.instanceSpecs[space.spaceId],
    space.subspaceKind ? model.subspaceSpecs[space.spaceId] : undefined
  );
  const primarySource = determinePrimarySource(space, sessionData);
  const trace = buildTrace(space, sessionData);
  const assumedFields = inferAssumedFields(space, merged);

  return {
    selections: merged.selections,
    dimensions: merged.dimensions || ensureTechnicalSpecPatch().dimensions!,
    counts: merged.counts || ensureTechnicalSpecPatch().counts!,
    options: merged.options || ensureTechnicalSpecPatch().options!,
    sourceLevel: primarySource?.level || 'PROJECT',
    sourceRefId: primarySource?.refId,
    assumedFields,
    trace,
  };
}

function isScopeSatisfied(space: ResolvedSpace, spec: ResolvedSpec) {
  const applicable: string[] = [];
  const missing: string[] = [];

  if (space.unitKind === 'HABITACION' || space.areaType === 'HABITACION') {
    applicable.push('room');
    if (!spec.selections.roomSolution) missing.push('room');
  }
  if (space.subspaceKind === 'BANO_ASOCIADO' || space.areaType === 'BANO' || space.features.hasBathroom) {
    applicable.push('bath');
    if (!spec.selections.bathSolution) missing.push('bath');
  }
  if (space.subspaceKind === 'KITCHENETTE' || space.areaType === 'COCINA' || space.features.hasKitchenette) {
    applicable.push('kitchenette');
    if (!spec.selections.kitchenetteSolution) missing.push('kitchenette');
  }
  if (space.features.requiresLeveling) {
    applicable.push('leveling');
    if (!spec.selections.levelingSolution) missing.push('leveling');
  }
  if (['ZONA_COMUN', 'PASILLO', 'PORTAL', 'ESCALERA'].includes(space.areaType)) {
    applicable.push('commonArea');
    if (!spec.selections.commonAreaSolution) missing.push('commonArea');
  }

  return {
    applicable,
    missing,
  };
}

export function resolveTechnicalSpecToExecutionContext(
  sessionData: DiscoverySessionData,
  executionContext: ExecutionContext
): ResolvedTechnicalSpecSummary {
  const bySpaceId: Record<string, ResolvedSpec> = {};
  const missingScopes = new Set<string>();
  let applicableScopes = 0;
  let satisfiedScopes = 0;

  for (const space of executionContext.resolvedSpaces) {
    const resolvedSpec = resolveSpecForSpace(space, sessionData);
    bySpaceId[space.spaceId] = resolvedSpec;

    const scopeCheck = isScopeSatisfied(space, resolvedSpec);
    applicableScopes += scopeCheck.applicable.length;
    satisfiedScopes += scopeCheck.applicable.length - scopeCheck.missing.length;
    scopeCheck.missing.forEach((scope) => missingScopes.add(`${space.label}: ${scope}`));
  }

  const specifiedScopePercent =
    applicableScopes === 0
      ? 0
      : Math.round((satisfiedScopes / applicableScopes) * 100);

  return {
    bySpaceId,
    completeness: {
      level:
        specifiedScopePercent >= 80
          ? 'HIGH'
          : specifiedScopePercent >= 40
            ? 'MEDIUM'
            : 'LOW',
      specifiedScopePercent,
      missingScopes: Array.from(missingScopes),
    },
  };
}
