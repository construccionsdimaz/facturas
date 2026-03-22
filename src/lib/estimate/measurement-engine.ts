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
