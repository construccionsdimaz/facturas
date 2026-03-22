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

function hasWorkCode(space: ResolvedSpace, code: string) {
  return space.derivedWorkCodes.includes(code as any);
}

function hasAction(space: ResolvedSpace, actionCode: string) {
  return space.technicalScope.actions.some(
    (action) => action.enabled !== false && action.actionCode === actionCode
  );
}

function requiresPartitionSpec(space: ResolvedSpace) {
  return hasWorkCode(space, 'PLADUR') || hasWorkCode(space, 'ALBANILERIA') || hasAction(space, 'LEVANTAR_TABIQUES');
}

function requiresCeilingSpec(space: ResolvedSpace) {
  return hasWorkCode(space, 'FALSO_TECHO') || hasAction(space, 'MONTAR_FALSO_TECHO');
}

function requiresWallFinishSpec(space: ResolvedSpace) {
  return hasWorkCode(space, 'REVESTIMIENTOS') || hasWorkCode(space, 'PINTURA') || hasAction(space, 'ALICATAR') || hasAction(space, 'PINTAR');
}

function requiresFlooringSpec(space: ResolvedSpace) {
  return hasWorkCode(space, 'REVESTIMIENTOS') || hasAction(space, 'COLOCAR_SUELO');
}

function requiresDoorSpec(space: ResolvedSpace) {
  return (space.measurementDrivers.doorsCount || 0) > 0 && (hasWorkCode(space, 'CARPINTERIA_INTERIOR') || hasAction(space, 'CAMBIAR_PUERTAS'));
}

function requiresWindowSpec(space: ResolvedSpace) {
  return (space.measurementDrivers.windowsCount || 0) > 0 && space.features.hasExteriorOpenings && (hasWorkCode(space, 'CARPINTERIA_EXTERIOR') || hasAction(space, 'CAMBIAR_VENTANAS'));
}

function requiresElectricalSpec(space: ResolvedSpace) {
  return ((space.measurementDrivers.electricalPointsCount || 0) > 0 && hasWorkCode(space, 'ELECTRICIDAD')) || hasAction(space, 'RENOVAR_INSTALACION_ELECTRICA');
}

function requiresLightingSpec(space: ResolvedSpace) {
  return ((space.measurementDrivers.lightingPointsCount || 0) > 0 && hasWorkCode(space, 'ILUMINACION')) || hasAction(space, 'RENOVAR_ILUMINACION');
}

function requiresWaterproofingSpec(space: ResolvedSpace) {
  return (space.areaType === 'BANO' || space.areaType === 'COCINA' || space.subspaceKind === 'BANO_ASOCIADO' || space.subspaceKind === 'KITCHENETTE') && hasWorkCode(space, 'IMPERMEABILIZACION');
}

function requiresPlumbingSpec(space: ResolvedSpace) {
  return ((space.measurementDrivers.waterPointsCount || 0) > 0 && hasWorkCode(space, 'FONTANERIA')) || hasAction(space, 'RENOVAR_INSTALACION_FONTANERIA');
}

function requiresDrainageSpec(space: ResolvedSpace) {
  return (((space.measurementDrivers.sanitaryFixturesCount || 0) > 0 || space.areaType === 'BANO' || space.areaType === 'COCINA') && hasWorkCode(space, 'SANEAMIENTO')) || hasAction(space, 'RENOVAR_INSTALACION_SANEAMIENTO');
}

function hasBathScope(space: ResolvedSpace) {
  return space.subspaceKind === 'BANO_ASOCIADO' || space.areaType === 'BANO' || space.features.hasBathroom;
}

function hasKitchenScope(space: ResolvedSpace) {
  return space.subspaceKind === 'KITCHENETTE' || space.areaType === 'COCINA' || space.features.hasKitchenette;
}

function getParentInstance(space: ResolvedSpace, sessionData: DiscoverySessionData) {
  if (!space.parentSpaceId) return null;
  return sessionData.spatialModel.instances.find(
    (instance) => instance.instanceId === space.parentSpaceId
  ) || null;
}

function getParentGroupId(space: ResolvedSpace, sessionData: DiscoverySessionData) {
  const parentInstance = getParentInstance(space, sessionData);
  return parentInstance?.groupId || null;
}

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
  const parentGroupId = getParentGroupId(space, sessionData);
  const parentInstance = getParentInstance(space, sessionData);

  const subspacePatch =
    space.subspaceKind && model.subspaceSpecs[space.spaceId]
      ? { level: 'SUBSPACE' as const, refId: space.spaceId, patch: model.subspaceSpecs[space.spaceId] }
      : null;
  const instancePatch = model.instanceSpecs[space.spaceId]
    ? { level: 'INSTANCE' as const, refId: space.spaceId, patch: model.instanceSpecs[space.spaceId] }
    : null;
  const groupPatch =
    (space.sourceGroupId || parentGroupId) && model.groupSpecs[space.sourceGroupId || parentGroupId || '']
      ? { level: 'GROUP' as const, refId: (space.sourceGroupId || parentGroupId) || undefined, patch: model.groupSpecs[(space.sourceGroupId || parentGroupId)!] }
      : null;
  const parentInstancePatch =
    parentInstance && model.instanceSpecs[parentInstance.instanceId]
      ? { level: 'INSTANCE' as const, refId: parentInstance.instanceId, patch: model.instanceSpecs[parentInstance.instanceId] }
      : null;
  const floorPatch =
    space.floorId && model.floorSpecs[space.floorId]
      ? { level: 'FLOOR' as const, refId: space.floorId, patch: model.floorSpecs[space.floorId] }
      : null;
  const projectPatch = model.projectSpecs
    ? { level: 'PROJECT' as const, refId: undefined, patch: model.projectSpecs }
    : null;

  return subspacePatch || instancePatch || parentInstancePatch || groupPatch || floorPatch || projectPatch;
}

function buildTrace(space: ResolvedSpace, sessionData: DiscoverySessionData) {
  const model = ensureTechnicalSpecModel(sessionData.technicalSpecModel);
  const trace: Array<{ level: ResolvedSpecSourceLevel; refId?: string }> = [];
  const parentGroupId = getParentGroupId(space, sessionData);
  const parentInstance = getParentInstance(space, sessionData);

  trace.push({ level: 'PROJECT' });
  if (space.floorId && model.floorSpecs[space.floorId]) {
    trace.push({ level: 'FLOOR', refId: space.floorId });
  }
  if ((space.sourceGroupId || parentGroupId) && model.groupSpecs[space.sourceGroupId || parentGroupId || '']) {
    trace.push({ level: 'GROUP', refId: (space.sourceGroupId || parentGroupId) || undefined });
  }
  if (parentInstance && model.instanceSpecs[parentInstance.instanceId]) {
    trace.push({ level: 'INSTANCE', refId: parentInstance.instanceId });
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

  if (hasBathScope(space) && !merged.selections.bathSolution) {
    assumedFields.push('selections.bathSolution');
  }

  if (hasKitchenScope(space) && !merged.selections.kitchenetteSolution) {
    assumedFields.push('selections.kitchenetteSolution');
  }

  if (hasBathScope(space) && merged.selections.bathShowerBaseSolution && !merged.counts?.bathShowerBaseCount) {
    assumedFields.push('counts.bathShowerBaseCount');
  }

  if (hasBathScope(space) && merged.selections.bathScreenSolution && !merged.counts?.bathScreenCount) {
    assumedFields.push('counts.bathScreenCount');
  }

  if (hasBathScope(space) && merged.selections.bathVanitySolution && !merged.counts?.bathVanityCount) {
    assumedFields.push('counts.bathVanityCount');
  }

  if (hasBathScope(space) && merged.selections.bathTapwareSolution && !merged.counts?.bathTapwareCount) {
    assumedFields.push('counts.bathTapwareCount');
  }

  if (hasKitchenScope(space) && merged.selections.kitchenetteApplianceSolution && !merged.counts?.kitchenetteAppliancePackCount) {
    assumedFields.push('counts.kitchenetteAppliancePackCount');
  }

  if (hasKitchenScope(space) && merged.selections.kitchenetteSinkSolution && !merged.counts?.kitchenetteSinkCount) {
    assumedFields.push('counts.kitchenetteSinkCount');
  }

  if (hasKitchenScope(space) && merged.selections.kitchenetteTapwareSolution && !merged.counts?.kitchenetteTapwareCount) {
    assumedFields.push('counts.kitchenetteTapwareCount');
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

  if (requiresWallFinishSpec(space) && merged.options?.includeWallTile && !merged.selections.wallTileSolution) {
    assumedFields.push('selections.wallTileSolution');
  }

  if (requiresWallFinishSpec(space) && merged.options?.includeWallPaint && !merged.selections.wallPaintSolution) {
    assumedFields.push('selections.wallPaintSolution');
  }

  if (requiresWallFinishSpec(space) && merged.options?.includeCeilingPaint && !merged.selections.ceilingPaintSolution) {
    assumedFields.push('selections.ceilingPaintSolution');
  }

  if (requiresWaterproofingSpec(space) && merged.options?.includeWaterproofing && !merged.selections.waterproofingSolution) {
    assumedFields.push('selections.waterproofingSolution');
  }

  if (requiresPartitionSpec(space) && !merged.selections.partitionSolution) {
    assumedFields.push('selections.partitionSolution');
  }

  if (requiresPartitionSpec(space) && !merged.selections.liningSolution) {
    assumedFields.push('selections.liningSolution');
  }

  if (requiresCeilingSpec(space) && !merged.selections.ceilingSolution) {
    assumedFields.push('selections.ceilingSolution');
  }

  if (requiresFlooringSpec(space) && !merged.selections.flooringSolution) {
    assumedFields.push('selections.flooringSolution');
  }

  if (requiresFlooringSpec(space) && merged.options?.includeSkirting && !merged.selections.skirtingSolution) {
    assumedFields.push('selections.skirtingSolution');
  }

  if (requiresDoorSpec(space) && !merged.selections.doorSolution) {
    assumedFields.push('selections.doorSolution');
  }

  if (requiresWindowSpec(space) && !merged.selections.windowSolution) {
    assumedFields.push('selections.windowSolution');
  }

  if (requiresWindowSpec(space) && merged.options?.includeShutter && !merged.selections.shutterSolution) {
    assumedFields.push('selections.shutterSolution');
  }

  if (requiresElectricalSpec(space) && !merged.selections.electricalSolution) {
    assumedFields.push('selections.electricalSolution');
  }

  if (requiresElectricalSpec(space) && !merged.selections.electricalMechanismsSolution) {
    assumedFields.push('selections.electricalMechanismsSolution');
  }

  if (requiresElectricalSpec(space) && !merged.selections.electricalPanelSolution) {
    assumedFields.push('selections.electricalPanelSolution');
  }

  if (requiresLightingSpec(space) && !merged.selections.lightingSolution) {
    assumedFields.push('selections.lightingSolution');
  }

  if (requiresPlumbingSpec(space) && !merged.selections.plumbingSolution) {
    assumedFields.push('selections.plumbingSolution');
  }

  if (requiresPlumbingSpec(space) && !merged.selections.plumbingWetSolution) {
    assumedFields.push('selections.plumbingWetSolution');
  }

  if (requiresDrainageSpec(space) && !merged.selections.drainageSolution) {
    assumedFields.push('selections.drainageSolution');
  }

  if (requiresDrainageSpec(space) && !merged.selections.drainageWetSolution) {
    assumedFields.push('selections.drainageWetSolution');
  }

  if ((space.unitKind === 'HABITACION' || space.areaType === 'HABITACION') && !merged.dimensions?.roomAreaM2 && !space.measurementDrivers.areaM2) {
    assumedFields.push('dimensions.roomAreaM2');
  }

  if (hasBathScope(space) && !merged.dimensions?.bathAreaM2 && !space.measurementDrivers.areaM2) {
    assumedFields.push('dimensions.bathAreaM2');
  }

  if (hasKitchenScope(space) && !merged.dimensions?.kitchenetteLinearMeters && !space.measurementDrivers.linearMeters) {
    assumedFields.push('dimensions.kitchenetteLinearMeters');
  }

  if (
    hasKitchenScope(space) &&
    merged.selections.kitchenetteCountertopSolution &&
    !merged.dimensions?.countertopLengthMl &&
    !merged.dimensions?.kitchenetteLinearMeters &&
    !space.measurementDrivers.linearMeters
  ) {
    assumedFields.push('dimensions.countertopLengthMl');
  }

  if (
    space.features.requiresLeveling &&
    !merged.dimensions?.levelingAreaM2 &&
    !space.measurementDrivers.floorSurfaceM2 &&
    !space.measurementDrivers.areaM2
  ) {
    assumedFields.push('dimensions.levelingAreaM2');
  }

  if (
    ['ZONA_COMUN', 'PASILLO', 'PORTAL', 'ESCALERA'].includes(space.areaType) &&
    !merged.dimensions?.commonAreaM2 &&
    !space.measurementDrivers.areaM2
  ) {
    assumedFields.push('dimensions.commonAreaM2');
  }

  if (requiresWallFinishSpec(space) && merged.options?.includeWallTile && !merged.dimensions?.wallTileAreaM2 && !space.measurementDrivers.tilingSurfaceM2 && !space.measurementDrivers.wallSurfaceM2) {
    assumedFields.push('dimensions.wallTileAreaM2');
  }

  if (
    requiresWallFinishSpec(space) &&
    merged.options?.includeWallTile &&
    merged.selections.wallTileSolution &&
    ['WALL_TILE_WET_PARTIAL', 'WALL_TILE_WET_FULL'].includes(merged.selections.wallTileSolution) &&
    !merged.dimensions?.wetWallTileAreaM2 &&
    !merged.dimensions?.wallTileAreaM2 &&
    !space.measurementDrivers.tilingSurfaceM2 &&
    !space.measurementDrivers.wallSurfaceM2
  ) {
    assumedFields.push('dimensions.wetWallTileAreaM2');
  }

  if (
    hasKitchenScope(space) &&
    merged.selections.wallTileSolution === 'WALL_TILE_KITCHEN_SPLASHBACK' &&
    !merged.dimensions?.backsplashAreaM2 &&
    !merged.dimensions?.wallTileAreaM2 &&
    !space.measurementDrivers.tilingSurfaceM2 &&
    !space.measurementDrivers.linearMeters
  ) {
    assumedFields.push('dimensions.backsplashAreaM2');
  }

  if (requiresWallFinishSpec(space) && merged.options?.includeWallPaint && !merged.dimensions?.paintWallAreaM2 && !space.measurementDrivers.wallSurfaceM2) {
    assumedFields.push('dimensions.paintWallAreaM2');
  }

  if (requiresWallFinishSpec(space) && merged.options?.includeCeilingPaint && !merged.dimensions?.paintCeilingAreaM2 && !space.measurementDrivers.ceilingSurfaceM2 && !space.measurementDrivers.areaM2) {
    assumedFields.push('dimensions.paintCeilingAreaM2');
  }

  if (requiresWaterproofingSpec(space) && merged.options?.includeWaterproofing && !merged.dimensions?.waterproofingAreaM2 && !space.measurementDrivers.tilingSurfaceM2 && !space.measurementDrivers.floorSurfaceM2) {
    assumedFields.push('dimensions.waterproofingAreaM2');
  }

  if (
    requiresWaterproofingSpec(space) &&
    merged.options?.includeWaterproofing &&
    merged.selections.waterproofingSolution === 'WET_AREA_WATERPROOFING_PLUS' &&
    !merged.dimensions?.wetWaterproofingAreaM2 &&
    !merged.dimensions?.waterproofingAreaM2 &&
    !space.measurementDrivers.tilingSurfaceM2 &&
    !space.measurementDrivers.floorSurfaceM2
  ) {
    assumedFields.push('dimensions.wetWaterproofingAreaM2');
  }

  if (requiresPartitionSpec(space) && merged.selections.liningSolution && !merged.dimensions?.liningWallAreaM2 && !space.measurementDrivers.wallSurfaceM2) {
    assumedFields.push('dimensions.liningWallAreaM2');
  }

  if (
    requiresPartitionSpec(space) &&
    !merged.dimensions?.partitionWallAreaM2 &&
    !space.measurementDrivers.wallSurfaceM2 &&
    !(space.measurementDrivers.perimeterMl && (merged.dimensions?.partitionHeightM || space.measurementDrivers.heightM))
  ) {
    assumedFields.push('dimensions.partitionWallAreaM2');
  }

  if (
    requiresCeilingSpec(space) &&
    !merged.dimensions?.ceilingAreaM2 &&
    !space.measurementDrivers.ceilingSurfaceM2 &&
    !space.measurementDrivers.areaM2
  ) {
    assumedFields.push('dimensions.ceilingAreaM2');
  }

  if (
    requiresFlooringSpec(space) &&
    !merged.dimensions?.flooringAreaM2 &&
    !space.measurementDrivers.floorSurfaceM2 &&
    !space.measurementDrivers.areaM2
  ) {
    assumedFields.push('dimensions.flooringAreaM2');
  }

  if (
    requiresFlooringSpec(space) &&
    merged.options?.includeSkirting &&
    !merged.dimensions?.skirtingLengthMl &&
    !space.measurementDrivers.perimeterMl
  ) {
    assumedFields.push('dimensions.skirtingLengthMl');
  }

  if (requiresDoorSpec(space) && !merged.counts?.doorCount && !space.measurementDrivers.doorsCount) {
    assumedFields.push('counts.doorCount');
  }

  if (requiresWindowSpec(space) && !merged.counts?.windowCount && !space.measurementDrivers.windowsCount) {
    assumedFields.push('counts.windowCount');
  }

  if (requiresWindowSpec(space) && merged.options?.includeShutter && !merged.counts?.shutterCount && !space.measurementDrivers.windowsCount) {
    assumedFields.push('counts.shutterCount');
  }

  if (requiresElectricalSpec(space) && !merged.counts?.electricalPointsCount && !space.measurementDrivers.electricalPointsCount) {
    assumedFields.push('counts.electricalPointsCount');
  }

  if (requiresLightingSpec(space) && !merged.counts?.lightingPointsCount && !space.measurementDrivers.lightingPointsCount) {
    assumedFields.push('counts.lightingPointsCount');
  }

  if (requiresElectricalSpec(space) && !merged.counts?.electricalMechanismsCount && !space.measurementDrivers.electricalPointsCount) {
    assumedFields.push('counts.electricalMechanismsCount');
  }

  if (requiresElectricalSpec(space) && !merged.counts?.electricalPanelCount) {
    assumedFields.push('counts.electricalPanelCount');
  }

  if (requiresPlumbingSpec(space) && !merged.counts?.plumbingPointsCount && !space.measurementDrivers.waterPointsCount) {
    assumedFields.push('counts.plumbingPointsCount');
  }

  if (requiresPlumbingSpec(space) && !merged.counts?.plumbingWetPointsCount && !space.measurementDrivers.waterPointsCount) {
    assumedFields.push('counts.plumbingWetPointsCount');
  }

  if (requiresDrainageSpec(space) && !merged.counts?.drainagePointsCount && !space.measurementDrivers.sanitaryFixturesCount) {
    assumedFields.push('counts.drainagePointsCount');
  }

  if (requiresDrainageSpec(space) && !merged.counts?.drainageWetPointsCount && !space.measurementDrivers.sanitaryFixturesCount) {
    assumedFields.push('counts.drainageWetPointsCount');
  }

  return assumedFields;
}

function resolveSpecForSpace(space: ResolvedSpace, sessionData: DiscoverySessionData): ResolvedSpec {
  const model = ensureTechnicalSpecModel(sessionData.technicalSpecModel);
  const parentGroupId = getParentGroupId(space, sessionData);
  const parentInstance = getParentInstance(space, sessionData);
  const merged = mergePatchChain(
    model.projectSpecs,
    space.floorId ? model.floorSpecs[space.floorId] : undefined,
    parentGroupId ? model.groupSpecs[parentGroupId] : undefined,
    space.sourceGroupId ? model.groupSpecs[space.sourceGroupId] : undefined,
    parentInstance ? model.instanceSpecs[parentInstance.instanceId] : undefined,
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
  if (hasBathScope(space)) {
    applicable.push('bath');
    if (!spec.selections.bathSolution) missing.push('bath');
  }
  if (hasKitchenScope(space)) {
    applicable.push('kitchenette');
    if (!spec.selections.kitchenetteSolution) missing.push('kitchenette');
  }
  if (hasBathScope(space) && spec.selections.bathShowerBaseSolution) {
    applicable.push('bathShowerBase');
  }
  if (hasBathScope(space) && spec.selections.bathScreenSolution) {
    applicable.push('bathScreen');
  }
  if (hasBathScope(space) && spec.selections.bathVanitySolution) {
    applicable.push('bathVanity');
  }
  if (hasBathScope(space) && spec.selections.bathTapwareSolution) {
    applicable.push('bathTapware');
  }
  if (hasKitchenScope(space) && spec.selections.kitchenetteLowCabinetSolution) {
    applicable.push('kitchenetteLowCabinet');
  }
  if (hasKitchenScope(space) && spec.selections.kitchenetteHighCabinetSolution) {
    applicable.push('kitchenetteHighCabinet');
  }
  if (hasKitchenScope(space) && spec.selections.kitchenetteCountertopSolution) {
    applicable.push('kitchenetteCountertop');
  }
  if (hasKitchenScope(space) && spec.selections.kitchenetteApplianceSolution) {
    applicable.push('kitchenetteAppliance');
  }
  if (hasKitchenScope(space) && spec.selections.kitchenetteSinkSolution) {
    applicable.push('kitchenetteSink');
  }
  if (hasKitchenScope(space) && spec.selections.kitchenetteTapwareSolution) {
    applicable.push('kitchenetteTapware');
  }
  if (space.features.requiresLeveling) {
    applicable.push('leveling');
    if (!spec.selections.levelingSolution) missing.push('leveling');
  }
  if (['ZONA_COMUN', 'PASILLO', 'PORTAL', 'ESCALERA'].includes(space.areaType)) {
    applicable.push('commonArea');
    if (!spec.selections.commonAreaSolution) missing.push('commonArea');
  }

  if (requiresWallFinishSpec(space) && spec.options.includeWallTile) {
    applicable.push('wallTile');
    if (!spec.selections.wallTileSolution) missing.push('wallTile');
  }
  if (requiresWallFinishSpec(space) && spec.options.includeWallPaint) {
    applicable.push('wallPaint');
    if (!spec.selections.wallPaintSolution) missing.push('wallPaint');
  }
  if (requiresWallFinishSpec(space) && spec.options.includeCeilingPaint) {
    applicable.push('ceilingPaint');
    if (!spec.selections.ceilingPaintSolution) missing.push('ceilingPaint');
  }
  if (requiresWaterproofingSpec(space) && spec.options.includeWaterproofing) {
    applicable.push('waterproofing');
    if (!spec.selections.waterproofingSolution) missing.push('waterproofing');
  }

  if (requiresPartitionSpec(space)) {
    applicable.push('partition');
    if (!spec.selections.partitionSolution) missing.push('partition');
  }
  if (requiresPartitionSpec(space) && spec.selections.liningSolution) {
    applicable.push('lining');
  }
  if (requiresCeilingSpec(space)) {
    applicable.push('ceiling');
    if (!spec.selections.ceilingSolution) missing.push('ceiling');
  }
  if (requiresFlooringSpec(space)) {
    applicable.push('flooring');
    if (!spec.selections.flooringSolution) missing.push('flooring');
  }
  if (requiresFlooringSpec(space) && spec.options.includeSkirting) {
    applicable.push('skirting');
    if (!spec.selections.skirtingSolution) missing.push('skirting');
  }
  if (requiresDoorSpec(space)) {
    applicable.push('door');
    if (!spec.selections.doorSolution) missing.push('door');
  }
  if (requiresWindowSpec(space)) {
    applicable.push('window');
    if (!spec.selections.windowSolution) missing.push('window');
  }
  if (requiresWindowSpec(space) && spec.options.includeShutter) {
    applicable.push('shutter');
    if (!spec.selections.shutterSolution) missing.push('shutter');
  }
  if (requiresElectricalSpec(space)) {
    applicable.push('electrical');
    if (!spec.selections.electricalSolution) missing.push('electrical');
  }
  if (requiresElectricalSpec(space)) {
    applicable.push('electricalMechanisms');
    if (!spec.selections.electricalMechanismsSolution) missing.push('electricalMechanisms');
    applicable.push('electricalPanel');
    if (!spec.selections.electricalPanelSolution) missing.push('electricalPanel');
  }
  if (requiresLightingSpec(space)) {
    applicable.push('lighting');
    if (!spec.selections.lightingSolution) missing.push('lighting');
  }
  if (requiresPlumbingSpec(space)) {
    applicable.push('plumbing');
    if (!spec.selections.plumbingSolution) missing.push('plumbing');
    applicable.push('plumbingWet');
    if (!spec.selections.plumbingWetSolution) missing.push('plumbingWet');
  }
  if (requiresDrainageSpec(space)) {
    applicable.push('drainage');
    if (!spec.selections.drainageSolution) missing.push('drainage');
    applicable.push('drainageWet');
    if (!spec.selections.drainageWetSolution) missing.push('drainageWet');
  }

  return {
    applicable,
    missing,
  };
}

export function inspectResolvedSpecCoverage(space: ResolvedSpace, spec: ResolvedSpec) {
  return isScopeSatisfied(space, spec);
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
