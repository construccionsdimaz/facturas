import type { ExecutionContext, ResolvedSpace } from '@/lib/discovery/types';
import type { ResolvedSpec, VerticalSolutionCode } from '@/lib/discovery/technical-spec-types';
import type { MeasurementLine, MeasurementResult, MeasurementStatus } from './measurement-types';

type MeasurementSource = {
  quantity: number | null;
  status: MeasurementStatus;
  assumption?: string;
  warning?: string;
};

function makeLine(params: {
  spaceId: string;
  solutionCode: VerticalSolutionCode;
  measurementCode: string;
  description: string;
  quantity: number;
  unit: MeasurementLine['unit'];
  sourceLevel: MeasurementLine['sourceLevel'];
  sourceRefId?: string;
  assumedFields: string[];
  status: MeasurementStatus;
}): MeasurementLine {
  return {
    id: `${params.spaceId}:${params.measurementCode}`,
    spaceId: params.spaceId,
    solutionCode: params.solutionCode,
    measurementCode: params.measurementCode,
    description: params.description,
    quantity: Number(params.quantity.toFixed(2)),
    unit: params.unit,
    sourceLevel: params.sourceLevel,
    sourceRefId: params.sourceRefId,
    assumedFields: params.assumedFields,
    status: params.status,
  };
}

function childSpaces(space: ResolvedSpace, allSpaces: ResolvedSpace[]) {
  return allSpaces.filter((candidate) => candidate.parentSpaceId === space.spaceId);
}

function hasDedicatedBathChild(space: ResolvedSpace, allSpaces: ResolvedSpace[]) {
  return childSpaces(space, allSpaces).some(
    (child) => child.subspaceKind === 'BANO_ASOCIADO' || child.areaType === 'BANO'
  );
}

function hasDedicatedKitchenChild(space: ResolvedSpace, allSpaces: ResolvedSpace[]) {
  return childSpaces(space, allSpaces).some(
    (child) => child.subspaceKind === 'KITCHENETTE' || child.areaType === 'COCINA'
  );
}

function hasWorkCode(space: ResolvedSpace, code: string) {
  return space.derivedWorkCodes.includes(code as any);
}

function hasAction(space: ResolvedSpace, actionCode: string) {
  return space.technicalScope.actions.some(
    (action) => action.enabled !== false && action.actionCode === actionCode
  );
}

function requiresPartition(space: ResolvedSpace) {
  return hasWorkCode(space, 'PLADUR') || hasWorkCode(space, 'ALBANILERIA') || hasAction(space, 'LEVANTAR_TABIQUES');
}

function requiresCeiling(space: ResolvedSpace) {
  return hasWorkCode(space, 'FALSO_TECHO') || hasAction(space, 'MONTAR_FALSO_TECHO');
}

function requiresFlooring(space: ResolvedSpace) {
  return hasWorkCode(space, 'REVESTIMIENTOS') || hasAction(space, 'COLOCAR_SUELO');
}

function requiresDoors(space: ResolvedSpace) {
  return (space.measurementDrivers.doorsCount || 0) > 0 && (hasWorkCode(space, 'CARPINTERIA_INTERIOR') || hasAction(space, 'CAMBIAR_PUERTAS'));
}

function requiresWindows(space: ResolvedSpace) {
  return (space.measurementDrivers.windowsCount || 0) > 0 && space.features.hasExteriorOpenings && (hasWorkCode(space, 'CARPINTERIA_EXTERIOR') || hasAction(space, 'CAMBIAR_VENTANAS'));
}

function requiresElectrical(space: ResolvedSpace) {
  return ((space.measurementDrivers.electricalPointsCount || 0) > 0 && hasWorkCode(space, 'ELECTRICIDAD')) || hasAction(space, 'RENOVAR_INSTALACION_ELECTRICA');
}

function requiresLighting(space: ResolvedSpace) {
  return ((space.measurementDrivers.lightingPointsCount || 0) > 0 && hasWorkCode(space, 'ILUMINACION')) || hasAction(space, 'RENOVAR_ILUMINACION');
}

function requiresPlumbing(space: ResolvedSpace) {
  return ((space.measurementDrivers.waterPointsCount || 0) > 0 && hasWorkCode(space, 'FONTANERIA')) || hasAction(space, 'RENOVAR_INSTALACION_FONTANERIA');
}

function requiresDrainage(space: ResolvedSpace) {
  return (((space.measurementDrivers.sanitaryFixturesCount || 0) > 0 || space.areaType === 'BANO' || space.areaType === 'COCINA') && hasWorkCode(space, 'SANEAMIENTO')) || hasAction(space, 'RENOVAR_INSTALACION_SANEAMIENTO');
}

function resolveRoomArea(space: ResolvedSpace, spec: ResolvedSpec): MeasurementSource {
  if (typeof spec.dimensions.roomAreaM2 === 'number' && spec.dimensions.roomAreaM2 > 0) {
    return { quantity: spec.dimensions.roomAreaM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.areaM2 === 'number' && space.measurementDrivers.areaM2 > 0) {
    return { quantity: space.measurementDrivers.areaM2, status: 'MEASURED' };
  }
  return {
    quantity: null,
    status: 'BLOCKED',
    warning: `Falta magnitud base de habitacion en ${space.label}.`,
  };
}

function resolveBathArea(space: ResolvedSpace, spec: ResolvedSpec): MeasurementSource {
  if (typeof spec.dimensions.bathAreaM2 === 'number' && spec.dimensions.bathAreaM2 > 0) {
    return { quantity: spec.dimensions.bathAreaM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.areaM2 === 'number' && space.measurementDrivers.areaM2 > 0) {
    return { quantity: space.measurementDrivers.areaM2, status: 'MEASURED' };
  }
  return {
    quantity: null,
    status: 'BLOCKED',
    warning: `Falta magnitud base de bano en ${space.label}.`,
  };
}

function resolveKitchenetteLength(space: ResolvedSpace, spec: ResolvedSpec): MeasurementSource {
  if (typeof spec.dimensions.kitchenetteLinearMeters === 'number' && spec.dimensions.kitchenetteLinearMeters > 0) {
    return { quantity: spec.dimensions.kitchenetteLinearMeters, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.linearMeters === 'number' && space.measurementDrivers.linearMeters > 0) {
    return { quantity: space.measurementDrivers.linearMeters, status: 'MEASURED' };
  }
  return {
    quantity: null,
    status: 'BLOCKED',
    warning: `Falta longitud lineal de kitchenette en ${space.label}.`,
  };
}

function resolveLevelingArea(space: ResolvedSpace, spec: ResolvedSpec, floorAreaFallback: number | null): MeasurementSource {
  if (typeof spec.dimensions.levelingAreaM2 === 'number' && spec.dimensions.levelingAreaM2 > 0) {
    return { quantity: spec.dimensions.levelingAreaM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.floorSurfaceM2 === 'number' && space.measurementDrivers.floorSurfaceM2 > 0) {
    return { quantity: space.measurementDrivers.floorSurfaceM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.areaM2 === 'number' && space.measurementDrivers.areaM2 > 0) {
    return {
      quantity: space.measurementDrivers.areaM2,
      status: 'ASSUMED',
      assumption: `Se usa area del espacio como fallback de nivelacion para ${space.label}.`,
    };
  }
  if (typeof floorAreaFallback === 'number' && floorAreaFallback > 0) {
    return {
      quantity: floorAreaFallback,
      status: 'ASSUMED',
      assumption: `Se usa suma de area de planta como fallback de nivelacion para ${space.label}.`,
    };
  }
  return {
    quantity: null,
    status: 'BLOCKED',
    warning: `Falta superficie de nivelacion en ${space.label}.`,
  };
}

function resolveCommonArea(space: ResolvedSpace, spec: ResolvedSpec): MeasurementSource {
  if (typeof spec.dimensions.commonAreaM2 === 'number' && spec.dimensions.commonAreaM2 > 0) {
    return { quantity: spec.dimensions.commonAreaM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.areaM2 === 'number' && space.measurementDrivers.areaM2 > 0) {
    return { quantity: space.measurementDrivers.areaM2, status: 'MEASURED' };
  }
  return {
    quantity: null,
    status: 'BLOCKED',
    warning: `Falta superficie de zona comun en ${space.label}.`,
  };
}

function resolvePartitionArea(space: ResolvedSpace, spec: ResolvedSpec): MeasurementSource {
  if (typeof spec.dimensions.partitionWallAreaM2 === 'number' && spec.dimensions.partitionWallAreaM2 > 0) {
    return { quantity: spec.dimensions.partitionWallAreaM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.wallSurfaceM2 === 'number' && space.measurementDrivers.wallSurfaceM2 > 0) {
    return { quantity: space.measurementDrivers.wallSurfaceM2, status: 'MEASURED' };
  }
  const height = spec.dimensions.partitionHeightM || space.measurementDrivers.heightM;
  if (typeof space.measurementDrivers.perimeterMl === 'number' && space.measurementDrivers.perimeterMl > 0 && typeof height === 'number' && height > 0) {
    return {
      quantity: Number((space.measurementDrivers.perimeterMl * height).toFixed(2)),
      status: 'ASSUMED',
      assumption: `Se usa perimetro x altura como fallback de tabiqueria para ${space.label}.`,
    };
  }
  return {
    quantity: null,
    status: 'BLOCKED',
    warning: `Falta superficie base de tabiqueria en ${space.label}.`,
  };
}

function resolveCeilingArea(space: ResolvedSpace, spec: ResolvedSpec): MeasurementSource {
  if (typeof spec.dimensions.ceilingAreaM2 === 'number' && spec.dimensions.ceilingAreaM2 > 0) {
    return { quantity: spec.dimensions.ceilingAreaM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.ceilingSurfaceM2 === 'number' && space.measurementDrivers.ceilingSurfaceM2 > 0) {
    return { quantity: space.measurementDrivers.ceilingSurfaceM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.areaM2 === 'number' && space.measurementDrivers.areaM2 > 0) {
    return {
      quantity: space.measurementDrivers.areaM2,
      status: 'ASSUMED',
      assumption: `Se usa area del espacio como fallback de falso techo para ${space.label}.`,
    };
  }
  return {
    quantity: null,
    status: 'BLOCKED',
    warning: `Falta superficie base de falso techo en ${space.label}.`,
  };
}

function resolveFlooringArea(space: ResolvedSpace, spec: ResolvedSpec): MeasurementSource {
  if (typeof spec.dimensions.flooringAreaM2 === 'number' && spec.dimensions.flooringAreaM2 > 0) {
    return { quantity: spec.dimensions.flooringAreaM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.floorSurfaceM2 === 'number' && space.measurementDrivers.floorSurfaceM2 > 0) {
    return { quantity: space.measurementDrivers.floorSurfaceM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.areaM2 === 'number' && space.measurementDrivers.areaM2 > 0) {
    return {
      quantity: space.measurementDrivers.areaM2,
      status: 'ASSUMED',
      assumption: `Se usa area del espacio como fallback de pavimento para ${space.label}.`,
    };
  }
  return {
    quantity: null,
    status: 'BLOCKED',
    warning: `Falta superficie base de pavimento en ${space.label}.`,
  };
}

function resolveSkirtingLength(space: ResolvedSpace, spec: ResolvedSpec): MeasurementSource {
  if (typeof spec.dimensions.skirtingLengthMl === 'number' && spec.dimensions.skirtingLengthMl > 0) {
    return { quantity: spec.dimensions.skirtingLengthMl, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.perimeterMl === 'number' && space.measurementDrivers.perimeterMl > 0) {
    return { quantity: space.measurementDrivers.perimeterMl, status: 'MEASURED' };
  }
  return {
    quantity: null,
    status: 'BLOCKED',
    warning: `Falta longitud base de rodapie en ${space.label}.`,
  };
}

function resolveCount(primary: number | null | undefined, fallback: number | null | undefined, message: string): MeasurementSource {
  if (typeof primary === 'number' && primary > 0) return { quantity: primary, status: 'MEASURED' };
  if (typeof fallback === 'number' && fallback > 0) return { quantity: fallback, status: 'MEASURED' };
  return { quantity: null, status: 'BLOCKED', warning: message };
}

function solutionCodesForSpace(space: ResolvedSpace, spec: ResolvedSpec, allSpaces: ResolvedSpace[]) {
  const solutions: VerticalSolutionCode[] = [];

  if ((space.unitKind === 'HABITACION' || space.areaType === 'HABITACION') && spec.selections.roomSolution) {
    solutions.push(spec.selections.roomSolution);
  }

  const bathHandledByChild = hasDedicatedBathChild(space, allSpaces);
  if (
    !bathHandledByChild &&
    (space.subspaceKind === 'BANO_ASOCIADO' || space.areaType === 'BANO' || space.features.hasBathroom) &&
    spec.selections.bathSolution
  ) {
    solutions.push(spec.selections.bathSolution);
  }
  if ((space.subspaceKind === 'BANO_ASOCIADO' || space.areaType === 'BANO') && spec.selections.bathSolution) {
    if (!solutions.includes(spec.selections.bathSolution)) solutions.push(spec.selections.bathSolution);
  }

  const kitchenHandledByChild = hasDedicatedKitchenChild(space, allSpaces);
  if (
    !kitchenHandledByChild &&
    (space.subspaceKind === 'KITCHENETTE' || space.areaType === 'COCINA' || space.features.hasKitchenette) &&
    spec.selections.kitchenetteSolution
  ) {
    solutions.push(spec.selections.kitchenetteSolution);
  }
  if ((space.subspaceKind === 'KITCHENETTE' || space.areaType === 'COCINA') && spec.selections.kitchenetteSolution) {
    if (!solutions.includes(spec.selections.kitchenetteSolution)) solutions.push(spec.selections.kitchenetteSolution);
  }

  if (space.features.requiresLeveling && spec.selections.levelingSolution) {
    solutions.push(spec.selections.levelingSolution);
  }

  if (
    ['ZONA_COMUN', 'PASILLO', 'PORTAL', 'ESCALERA'].includes(space.areaType) &&
    spec.selections.commonAreaSolution
  ) {
    solutions.push(spec.selections.commonAreaSolution);
  }

  if ((requiresPartition(space) || Boolean(spec.selections.partitionSolution)) && spec.selections.partitionSolution) {
    solutions.push(spec.selections.partitionSolution);
  }

  if ((requiresCeiling(space) || Boolean(spec.selections.ceilingSolution)) && spec.selections.ceilingSolution) {
    solutions.push(spec.selections.ceilingSolution);
  }

  if ((requiresFlooring(space) || Boolean(spec.selections.flooringSolution)) && spec.selections.flooringSolution) {
    solutions.push(spec.selections.flooringSolution);
  }

  if ((requiresFlooring(space) || Boolean(spec.selections.skirtingSolution)) && spec.options.includeSkirting && spec.selections.skirtingSolution) {
    solutions.push(spec.selections.skirtingSolution);
  }

  if (
    spec.selections.doorSolution &&
    (requiresDoors(space) || (spec.counts.doorCount || 0) > 0 || (space.measurementDrivers.doorsCount || 0) > 0)
  ) {
    solutions.push(spec.selections.doorSolution);
  }

  if (
    spec.selections.windowSolution &&
    (requiresWindows(space) || (spec.counts.windowCount || 0) > 0 || (space.measurementDrivers.windowsCount || 0) > 0)
  ) {
    solutions.push(spec.selections.windowSolution);
  }

  if (
    spec.options.includeShutter &&
    spec.selections.shutterSolution &&
    (requiresWindows(space) || (spec.counts.shutterCount || 0) > 0 || (space.measurementDrivers.windowsCount || 0) > 0)
  ) {
    solutions.push(spec.selections.shutterSolution);
  }

  if (
    spec.selections.electricalSolution &&
    (requiresElectrical(space) || (spec.counts.electricalPointsCount || 0) > 0 || (space.measurementDrivers.electricalPointsCount || 0) > 0)
  ) {
    solutions.push(spec.selections.electricalSolution);
  }

  if (
    spec.selections.lightingSolution &&
    (requiresLighting(space) || (spec.counts.lightingPointsCount || 0) > 0 || (space.measurementDrivers.lightingPointsCount || 0) > 0)
  ) {
    solutions.push(spec.selections.lightingSolution);
  }

  if (
    spec.selections.plumbingSolution &&
    (requiresPlumbing(space) || (spec.counts.plumbingPointsCount || 0) > 0 || (space.measurementDrivers.waterPointsCount || 0) > 0)
  ) {
    solutions.push(spec.selections.plumbingSolution);
  }

  if (
    spec.selections.drainageSolution &&
    (requiresDrainage(space) || (spec.counts.drainagePointsCount || 0) > 0 || (space.measurementDrivers.sanitaryFixturesCount || 0) > 0)
  ) {
    solutions.push(spec.selections.drainageSolution);
  }

  return solutions;
}

function measureFloorLeveling(
  space: ResolvedSpace,
  spec: ResolvedSpec,
  executionContext: ExecutionContext,
  seenFloorLeveling: Set<string>,
  warnings: string[],
  assumptions: string[]
): MeasurementLine[] {
  const floorKey = `${space.floorId || 'no-floor'}:${spec.selections.levelingSolution}`;
  if (!space.floorId || seenFloorLeveling.has(floorKey) || !spec.selections.levelingSolution) return [];
  seenFloorLeveling.add(floorKey);

  const floorSpaces = executionContext.resolvedSpaces.filter(
    (candidate) =>
      candidate.floorId === space.floorId &&
      candidate.parentSpaceId === null &&
      candidate.features.areaIncludedInParent !== true
  );
  const floorAreaFallback = floorSpaces.reduce(
    (sum, candidate) => sum + (candidate.measurementDrivers.floorSurfaceM2 ?? candidate.measurementDrivers.areaM2 ?? 0),
    0
  );
  const resolved = resolveLevelingArea(space, spec, floorAreaFallback || null);
  if (resolved.warning) warnings.push(resolved.warning);
  if (resolved.assumption) assumptions.push(resolved.assumption);

  if (resolved.quantity === null) {
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode: spec.selections.levelingSolution,
        measurementCode: 'LEVELING_AREA',
        description: `Nivelacion ${space.label}`,
        quantity: 0,
        unit: 'm2',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: Array.from(new Set([...spec.assumedFields, 'dimensions.levelingAreaM2'])),
        status: 'BLOCKED',
      }),
    ];
  }

  return [
    makeLine({
      spaceId: space.spaceId,
      solutionCode: spec.selections.levelingSolution,
      measurementCode: 'LEVELING_AREA',
      description: `Nivelacion ${space.label}`,
      quantity: resolved.quantity,
      unit: 'm2',
      sourceLevel: spec.sourceLevel,
      sourceRefId: spec.sourceRefId,
      assumedFields: spec.assumedFields,
      status: resolved.status,
    }),
  ];
}

function measureSolutionForSpace(
  space: ResolvedSpace,
  spec: ResolvedSpec,
  solutionCode: VerticalSolutionCode,
  executionContext: ExecutionContext,
  warnings: string[],
  assumptions: string[],
  seenFloorLeveling: Set<string>
): MeasurementLine[] {
  if (solutionCode.startsWith('ROOM_')) {
    const resolved = resolveRoomArea(space, spec);
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    const lines: MeasurementLine[] = [];
    lines.push(
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'ROOM_AREA',
        description: `Superficie ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'm2',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      })
    );
    lines.push(
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'ROOM_UNIT',
        description: `Unidad ${space.label}`,
        quantity: 1,
        unit: 'ud',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields:
          resolved.quantity === null
            ? Array.from(new Set([...spec.assumedFields, 'dimensions.roomAreaM2']))
            : spec.assumedFields,
        status: resolved.quantity === null ? 'PARTIAL' : 'MEASURED',
      })
    );
    return lines;
  }

  if (solutionCode.startsWith('BATH_')) {
    const resolved = resolveBathArea(space, spec);
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'BATH_AREA',
        description: `Superficie ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'm2',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'BATH_UNIT',
        description: `Unidad ${space.label}`,
        quantity: 1,
        unit: 'ud',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields:
          resolved.quantity === null
            ? Array.from(new Set([...spec.assumedFields, 'dimensions.bathAreaM2']))
            : spec.assumedFields,
        status: resolved.quantity === null ? 'PARTIAL' : 'MEASURED',
      }),
    ];
  }

  if (solutionCode.startsWith('KITCHENETTE_')) {
    const resolved = resolveKitchenetteLength(space, spec);
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'KITCHENETTE_LENGTH',
        description: `Longitud ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'ml',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode.startsWith('LEVELING_')) {
    return measureFloorLeveling(
      space,
      spec,
      executionContext,
      seenFloorLeveling,
      warnings,
      assumptions
    );
  }

  if (solutionCode.startsWith('PARTITION_')) {
    const resolved = resolvePartitionArea(space, spec);
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'PARTITION_WALL_AREA',
        description: `Tabiqueria ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'm2',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode.startsWith('CEILING_')) {
    const resolved = resolveCeilingArea(space, spec);
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'CEILING_AREA',
        description: `Falso techo ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'm2',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode.startsWith('FLOOR_')) {
    const resolved = resolveFlooringArea(space, spec);
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'FLOORING_AREA',
        description: `Pavimento ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'm2',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode === 'SKIRTING_STD') {
    const resolved = resolveSkirtingLength(space, spec);
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'SKIRTING_LENGTH',
        description: `Rodapie ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'ml',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode.startsWith('DOOR_')) {
    const resolved = resolveCount(spec.counts.doorCount, space.measurementDrivers.doorsCount, `Falta conteo base de puertas en ${space.label}.`);
    if (resolved.warning) warnings.push(resolved.warning);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'DOOR_UNITS',
        description: `Puertas ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'ud',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode.startsWith('WINDOW_')) {
    const resolved = resolveCount(spec.counts.windowCount, space.measurementDrivers.windowsCount, `Falta conteo base de ventanas en ${space.label}.`);
    if (resolved.warning) warnings.push(resolved.warning);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'WINDOW_UNITS',
        description: `Ventanas ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'ud',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode === 'SHUTTER_STD') {
    const resolved = resolveCount(spec.counts.shutterCount, space.measurementDrivers.windowsCount, `Falta conteo base de persianas en ${space.label}.`);
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.quantity != null && (spec.counts.shutterCount == null || spec.counts.shutterCount === 0) && (space.measurementDrivers.windowsCount || 0) > 0) {
      assumptions.push(`Se usa el numero de ventanas como fallback de persianas para ${space.label}.`);
    }
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'SHUTTER_UNITS',
        description: `Persianas ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'ud',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : spec.counts.shutterCount ? resolved.status : 'ASSUMED',
      }),
    ];
  }

  if (solutionCode === 'ELECTRICAL_ROOM_STD') {
    const resolved = resolveCount(spec.counts.electricalPointsCount, space.measurementDrivers.electricalPointsCount, `Falta conteo base de puntos electricos en ${space.label}.`);
    if (resolved.warning) warnings.push(resolved.warning);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'ELECTRICAL_POINTS',
        description: `Puntos electricos ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'pt',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode === 'LIGHTING_BASIC') {
    const resolved = resolveCount(spec.counts.lightingPointsCount, space.measurementDrivers.lightingPointsCount, `Falta conteo base de puntos de luz en ${space.label}.`);
    if (resolved.warning) warnings.push(resolved.warning);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'LIGHTING_POINTS',
        description: `Puntos de luz ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'pt',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode === 'PLUMBING_POINT_STD') {
    const resolved = resolveCount(spec.counts.plumbingPointsCount, space.measurementDrivers.waterPointsCount, `Falta conteo base de puntos de fontaneria en ${space.label}.`);
    if (resolved.warning) warnings.push(resolved.warning);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'PLUMBING_POINTS',
        description: `Puntos de fontaneria ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'pt',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode === 'DRAINAGE_POINT_STD') {
    const resolved = resolveCount(spec.counts.drainagePointsCount, space.measurementDrivers.sanitaryFixturesCount, `Falta conteo base de puntos de saneamiento en ${space.label}.`);
    if (resolved.warning) warnings.push(resolved.warning);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'DRAINAGE_POINTS',
        description: `Puntos de saneamiento ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'pt',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  const resolved = resolveCommonArea(space, spec);
  if (resolved.warning) warnings.push(resolved.warning);
  if (resolved.assumption) assumptions.push(resolved.assumption);
  return [
    makeLine({
      spaceId: space.spaceId,
      solutionCode,
      measurementCode: 'COMMON_AREA',
      description: `Superficie ${space.label}`,
      quantity: resolved.quantity ?? 0,
      unit: 'm2',
      sourceLevel: spec.sourceLevel,
      sourceRefId: spec.sourceRefId,
      assumedFields: spec.assumedFields,
      status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
    }),
  ];
}

export function measureExecutionContext(
  executionContext: ExecutionContext
): MeasurementResult {
  const warnings: string[] = [];
  const assumptions: string[] = [];
  const lines: MeasurementLine[] = [];
  const seenFloorLeveling = new Set<string>();

  for (const space of executionContext.resolvedSpaces) {
    const spec = executionContext.resolvedSpecs.bySpaceId[space.spaceId];
    if (!spec) continue;
    const solutions = solutionCodesForSpace(space, spec, executionContext.resolvedSpaces);
    for (const solutionCode of solutions) {
      lines.push(
        ...measureSolutionForSpace(
          space,
          spec,
          solutionCode,
          executionContext,
          warnings,
          assumptions,
          seenFloorLeveling
        )
      );
    }
  }

  const measuredLines = lines.filter((line) => line.status === 'MEASURED').length;
  const partialLines = lines.filter((line) => line.status === 'PARTIAL').length;
  const assumedLines = lines.filter((line) => line.status === 'ASSUMED').length;
  const blockedLines = lines.filter((line) => line.status === 'BLOCKED').length;

  const status =
    lines.length === 0 || blockedLines === lines.length
      ? 'BLOCKED'
      : blockedLines > 0 || partialLines > 0 || assumedLines > 0
        ? 'PARTIAL'
        : 'READY';

  const specifiedScopePercent =
    lines.length === 0
      ? 0
      : Math.round(((measuredLines + assumedLines + partialLines) / lines.length) * 100);

  return {
    status,
    lines,
    coverage: {
      measuredLines,
      partialLines,
      assumedLines,
      blockedLines,
      specifiedScopePercent,
    },
    warnings: Array.from(new Set(warnings)),
    assumptions: Array.from(new Set(assumptions)),
  };
}
