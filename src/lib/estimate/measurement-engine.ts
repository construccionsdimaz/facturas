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

function requiresWallFinishes(space: ResolvedSpace) {
  return hasWorkCode(space, 'REVESTIMIENTOS') || hasWorkCode(space, 'PINTURA') || hasAction(space, 'ALICATAR') || hasAction(space, 'PINTAR');
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

function requiresWaterproofing(space: ResolvedSpace) {
  return (space.areaType === 'BANO' || space.areaType === 'COCINA' || space.subspaceKind === 'BANO_ASOCIADO' || space.subspaceKind === 'KITCHENETTE') && hasWorkCode(space, 'IMPERMEABILIZACION');
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

function resolveWallTileArea(space: ResolvedSpace, spec: ResolvedSpec): MeasurementSource {
  if (typeof spec.dimensions.wallTileAreaM2 === 'number' && spec.dimensions.wallTileAreaM2 > 0) {
    return { quantity: spec.dimensions.wallTileAreaM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.tilingSurfaceM2 === 'number' && space.measurementDrivers.tilingSurfaceM2 > 0) {
    return { quantity: space.measurementDrivers.tilingSurfaceM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.wallSurfaceM2 === 'number' && space.measurementDrivers.wallSurfaceM2 > 0) {
    return {
      quantity: space.measurementDrivers.wallSurfaceM2,
      status: 'ASSUMED',
      assumption: `Se usa superficie de pared como fallback de revestimiento vertical para ${space.label}.`,
    };
  }
  return {
    quantity: null,
    status: 'BLOCKED',
    warning: `Falta superficie base de revestimiento vertical en ${space.label}.`,
  };
}

function resolvePaintWallArea(space: ResolvedSpace, spec: ResolvedSpec): MeasurementSource {
  if (typeof spec.dimensions.paintWallAreaM2 === 'number' && spec.dimensions.paintWallAreaM2 > 0) {
    return { quantity: spec.dimensions.paintWallAreaM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.wallSurfaceM2 === 'number' && space.measurementDrivers.wallSurfaceM2 > 0) {
    return { quantity: space.measurementDrivers.wallSurfaceM2, status: 'MEASURED' };
  }
  return {
    quantity: null,
    status: 'BLOCKED',
    warning: `Falta superficie base de pintura de pared en ${space.label}.`,
  };
}

function resolvePaintCeilingArea(space: ResolvedSpace, spec: ResolvedSpec): MeasurementSource {
  if (typeof spec.dimensions.paintCeilingAreaM2 === 'number' && spec.dimensions.paintCeilingAreaM2 > 0) {
    return { quantity: spec.dimensions.paintCeilingAreaM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.ceilingSurfaceM2 === 'number' && space.measurementDrivers.ceilingSurfaceM2 > 0) {
    return { quantity: space.measurementDrivers.ceilingSurfaceM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.areaM2 === 'number' && space.measurementDrivers.areaM2 > 0) {
    return {
      quantity: space.measurementDrivers.areaM2,
      status: 'ASSUMED',
      assumption: `Se usa area del espacio como fallback de pintura de techo para ${space.label}.`,
    };
  }
  return {
    quantity: null,
    status: 'BLOCKED',
    warning: `Falta superficie base de pintura de techo en ${space.label}.`,
  };
}

function resolveWaterproofingArea(space: ResolvedSpace, spec: ResolvedSpec): MeasurementSource {
  if (typeof spec.dimensions.waterproofingAreaM2 === 'number' && spec.dimensions.waterproofingAreaM2 > 0) {
    return { quantity: spec.dimensions.waterproofingAreaM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.tilingSurfaceM2 === 'number' && space.measurementDrivers.tilingSurfaceM2 > 0) {
    return { quantity: space.measurementDrivers.tilingSurfaceM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.floorSurfaceM2 === 'number' && space.measurementDrivers.floorSurfaceM2 > 0) {
    return {
      quantity: space.measurementDrivers.floorSurfaceM2,
      status: 'ASSUMED',
      assumption: `Se usa superficie de suelo como fallback de impermeabilizacion para ${space.label}.`,
    };
  }
  return {
    quantity: null,
    status: 'BLOCKED',
    warning: `Falta superficie base de impermeabilizacion en ${space.label}.`,
  };
}

function resolveLiningArea(space: ResolvedSpace, spec: ResolvedSpec): MeasurementSource {
  if (typeof spec.dimensions.liningWallAreaM2 === 'number' && spec.dimensions.liningWallAreaM2 > 0) {
    return { quantity: spec.dimensions.liningWallAreaM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.wallSurfaceM2 === 'number' && space.measurementDrivers.wallSurfaceM2 > 0) {
    return { quantity: space.measurementDrivers.wallSurfaceM2, status: 'MEASURED' };
  }
  return {
    quantity: null,
    status: 'BLOCKED',
    warning: `Falta superficie base de trasdosado en ${space.label}.`,
  };
}

function resolveCount(primary: number | null | undefined, fallback: number | null | undefined, message: string): MeasurementSource {
  if (typeof primary === 'number' && primary > 0) return { quantity: primary, status: 'MEASURED' };
  if (typeof fallback === 'number' && fallback > 0) return { quantity: fallback, status: 'MEASURED' };
  return { quantity: null, status: 'BLOCKED', warning: message };
}

function pushUnique(solutions: VerticalSolutionCode[], solutionCode?: VerticalSolutionCode | null) {
  if (solutionCode && !solutions.includes(solutionCode)) solutions.push(solutionCode);
}

function isBathSpace(space: ResolvedSpace) {
  return space.subspaceKind === 'BANO_ASOCIADO' || space.areaType === 'BANO' || space.features.hasBathroom;
}

function isKitchenSpace(space: ResolvedSpace) {
  return space.subspaceKind === 'KITCHENETTE' || space.areaType === 'COCINA' || space.features.hasKitchenette;
}

function resolveWetUnitCount(
  explicitCount: number | null | undefined,
  space: ResolvedSpace,
  message: string,
  assumedLabel: string
): MeasurementSource {
  const resolved = resolveCount(explicitCount, null, message);
  if (resolved.quantity != null) return resolved;
  if (isBathSpace(space) || isKitchenSpace(space)) {
    return {
      quantity: 1,
      status: 'ASSUMED',
      assumption: assumedLabel,
    };
  }
  return resolved;
}

function resolveCountertopLength(space: ResolvedSpace, spec: ResolvedSpec): MeasurementSource {
  if (typeof spec.dimensions.countertopLengthMl === 'number' && spec.dimensions.countertopLengthMl > 0) {
    return { quantity: spec.dimensions.countertopLengthMl, status: 'MEASURED' };
  }
  return resolveKitchenetteLength(space, spec);
}

function resolveBacksplashArea(space: ResolvedSpace, spec: ResolvedSpec): MeasurementSource {
  if (typeof spec.dimensions.backsplashAreaM2 === 'number' && spec.dimensions.backsplashAreaM2 > 0) {
    return { quantity: spec.dimensions.backsplashAreaM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.tilingSurfaceM2 === 'number' && space.measurementDrivers.tilingSurfaceM2 > 0) {
    return { quantity: space.measurementDrivers.tilingSurfaceM2, status: 'MEASURED' };
  }
  const kitchenetteLength = resolveKitchenetteLength(space, spec);
  if (kitchenetteLength.quantity && kitchenetteLength.quantity > 0) {
    return {
      quantity: Number((kitchenetteLength.quantity * 0.6).toFixed(2)),
      status: 'ASSUMED',
      assumption: `Se usa longitud de kitchenette x 0.6 para el frontal de cocina en ${space.label}.`,
    };
  }
  return {
    quantity: null,
    status: 'BLOCKED',
    warning: `Falta area base de frontal de cocina en ${space.label}.`,
  };
}

function resolveWetWallTileArea(
  space: ResolvedSpace,
  spec: ResolvedSpec,
  solutionCode: VerticalSolutionCode
): MeasurementSource {
  if (typeof spec.dimensions.wetWallTileAreaM2 === 'number' && spec.dimensions.wetWallTileAreaM2 > 0) {
    return { quantity: spec.dimensions.wetWallTileAreaM2, status: 'MEASURED' };
  }
  if (typeof spec.dimensions.wallTileAreaM2 === 'number' && spec.dimensions.wallTileAreaM2 > 0) {
    return { quantity: spec.dimensions.wallTileAreaM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.tilingSurfaceM2 === 'number' && space.measurementDrivers.tilingSurfaceM2 > 0) {
    return { quantity: space.measurementDrivers.tilingSurfaceM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.wallSurfaceM2 === 'number' && space.measurementDrivers.wallSurfaceM2 > 0) {
    const factor = solutionCode === 'WALL_TILE_WET_PARTIAL' ? 0.55 : 1;
    return {
      quantity: Number((space.measurementDrivers.wallSurfaceM2 * factor).toFixed(2)),
      status: solutionCode === 'WALL_TILE_WET_PARTIAL' ? 'ASSUMED' : 'MEASURED',
      assumption:
        solutionCode === 'WALL_TILE_WET_PARTIAL'
          ? `Se usa 55% de superficie vertical como alicatado humedo parcial en ${space.label}.`
          : undefined,
    };
  }
  return {
    quantity: null,
    status: 'BLOCKED',
    warning: `Falta superficie base de alicatado humedo en ${space.label}.`,
  };
}

function resolveWetWaterproofingArea(space: ResolvedSpace, spec: ResolvedSpec): MeasurementSource {
  if (typeof spec.dimensions.wetWaterproofingAreaM2 === 'number' && spec.dimensions.wetWaterproofingAreaM2 > 0) {
    return { quantity: spec.dimensions.wetWaterproofingAreaM2, status: 'MEASURED' };
  }
  if (typeof spec.dimensions.waterproofingAreaM2 === 'number' && spec.dimensions.waterproofingAreaM2 > 0) {
    return { quantity: spec.dimensions.waterproofingAreaM2, status: 'MEASURED' };
  }
  if (typeof space.measurementDrivers.floorSurfaceM2 === 'number' && space.measurementDrivers.floorSurfaceM2 > 0) {
    return {
      quantity: Number((space.measurementDrivers.floorSurfaceM2 * 1.15).toFixed(2)),
      status: 'ASSUMED',
      assumption: `Se usa superficie de suelo x 1.15 como impermeabilizacion humeda reforzada en ${space.label}.`,
    };
  }
  if (typeof space.measurementDrivers.tilingSurfaceM2 === 'number' && space.measurementDrivers.tilingSurfaceM2 > 0) {
    return {
      quantity: Number((space.measurementDrivers.tilingSurfaceM2 * 0.45).toFixed(2)),
      status: 'ASSUMED',
      assumption: `Se usa 45% de superficie alicatada como impermeabilizacion reforzada en ${space.label}.`,
    };
  }
  return {
    quantity: null,
    status: 'BLOCKED',
    warning: `Falta superficie base de impermeabilizacion reforzada en ${space.label}.`,
  };
}

function solutionCodesForSpace(space: ResolvedSpace, spec: ResolvedSpec, allSpaces: ResolvedSpace[]) {
  const solutions: VerticalSolutionCode[] = [];

  if ((space.unitKind === 'HABITACION' || space.areaType === 'HABITACION') && spec.selections.roomSolution) {
    pushUnique(solutions, spec.selections.roomSolution);
  }

  const bathHandledByChild = hasDedicatedBathChild(space, allSpaces);
  if (
    !bathHandledByChild &&
    (space.subspaceKind === 'BANO_ASOCIADO' || space.areaType === 'BANO' || space.features.hasBathroom) &&
    spec.selections.bathSolution
  ) {
    pushUnique(solutions, spec.selections.bathSolution);
  }
  if ((space.subspaceKind === 'BANO_ASOCIADO' || space.areaType === 'BANO') && spec.selections.bathSolution) {
    pushUnique(solutions, spec.selections.bathSolution);
  }
  if (isBathSpace(space)) {
    pushUnique(solutions, spec.selections.bathShowerBaseSolution);
    pushUnique(solutions, spec.selections.bathScreenSolution);
    pushUnique(solutions, spec.selections.bathVanitySolution);
    pushUnique(solutions, spec.selections.bathTapwareSolution);
  }

  const kitchenHandledByChild = hasDedicatedKitchenChild(space, allSpaces);
  if (
    !kitchenHandledByChild &&
    (space.subspaceKind === 'KITCHENETTE' || space.areaType === 'COCINA' || space.features.hasKitchenette) &&
    spec.selections.kitchenetteSolution
  ) {
    pushUnique(solutions, spec.selections.kitchenetteSolution);
  }
  if ((space.subspaceKind === 'KITCHENETTE' || space.areaType === 'COCINA') && spec.selections.kitchenetteSolution) {
    pushUnique(solutions, spec.selections.kitchenetteSolution);
  }
  if (isKitchenSpace(space)) {
    pushUnique(solutions, spec.selections.kitchenetteLowCabinetSolution);
    pushUnique(solutions, spec.selections.kitchenetteHighCabinetSolution);
    pushUnique(solutions, spec.selections.kitchenetteCountertopSolution);
    pushUnique(solutions, spec.selections.kitchenetteApplianceSolution);
    pushUnique(solutions, spec.selections.kitchenetteSinkSolution);
    pushUnique(solutions, spec.selections.kitchenetteTapwareSolution);
  }

  if (space.features.requiresLeveling && spec.selections.levelingSolution) {
    pushUnique(solutions, spec.selections.levelingSolution);
  }

  if (
    ['ZONA_COMUN', 'PASILLO', 'PORTAL', 'ESCALERA'].includes(space.areaType) &&
    spec.selections.commonAreaSolution
  ) {
    pushUnique(solutions, spec.selections.commonAreaSolution);
  }

  if (
    spec.options.includeWallTile &&
    spec.selections.wallTileSolution &&
    (requiresWallFinishes(space) || (spec.dimensions.wallTileAreaM2 || 0) > 0 || (space.measurementDrivers.tilingSurfaceM2 || 0) > 0 || (space.measurementDrivers.wallSurfaceM2 || 0) > 0)
  ) {
    pushUnique(solutions, spec.selections.wallTileSolution);
  }

  if (
    spec.options.includeWallPaint &&
    spec.selections.wallPaintSolution &&
    (requiresWallFinishes(space) || (spec.dimensions.paintWallAreaM2 || 0) > 0 || (space.measurementDrivers.wallSurfaceM2 || 0) > 0)
  ) {
    pushUnique(solutions, spec.selections.wallPaintSolution);
  }

  if (
    spec.options.includeCeilingPaint &&
    spec.selections.ceilingPaintSolution &&
    (requiresWallFinishes(space) || (spec.dimensions.paintCeilingAreaM2 || 0) > 0 || (space.measurementDrivers.ceilingSurfaceM2 || 0) > 0 || (space.measurementDrivers.areaM2 || 0) > 0)
  ) {
    pushUnique(solutions, spec.selections.ceilingPaintSolution);
  }

  if (
    spec.options.includeWaterproofing &&
    spec.selections.waterproofingSolution &&
    (requiresWaterproofing(space) || (spec.dimensions.waterproofingAreaM2 || 0) > 0 || (space.measurementDrivers.tilingSurfaceM2 || 0) > 0 || (space.measurementDrivers.floorSurfaceM2 || 0) > 0)
  ) {
    pushUnique(solutions, spec.selections.waterproofingSolution);
  }

  if ((requiresPartition(space) || Boolean(spec.selections.partitionSolution)) && spec.selections.partitionSolution) {
    pushUnique(solutions, spec.selections.partitionSolution);
  }

  if ((requiresPartition(space) || Boolean(spec.selections.liningSolution)) && spec.selections.liningSolution) {
    pushUnique(solutions, spec.selections.liningSolution);
  }

  if ((requiresCeiling(space) || Boolean(spec.selections.ceilingSolution)) && spec.selections.ceilingSolution) {
    pushUnique(solutions, spec.selections.ceilingSolution);
  }

  if ((requiresFlooring(space) || Boolean(spec.selections.flooringSolution)) && spec.selections.flooringSolution) {
    pushUnique(solutions, spec.selections.flooringSolution);
  }

  if ((requiresFlooring(space) || Boolean(spec.selections.skirtingSolution)) && spec.options.includeSkirting && spec.selections.skirtingSolution) {
    pushUnique(solutions, spec.selections.skirtingSolution);
  }

  if (
    spec.selections.doorSolution &&
    (requiresDoors(space) || (spec.counts.doorCount || 0) > 0 || (space.measurementDrivers.doorsCount || 0) > 0)
  ) {
    pushUnique(solutions, spec.selections.doorSolution);
  }

  if (
    spec.selections.windowSolution &&
    (requiresWindows(space) || (spec.counts.windowCount || 0) > 0 || (space.measurementDrivers.windowsCount || 0) > 0)
  ) {
    pushUnique(solutions, spec.selections.windowSolution);
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
    spec.selections.electricalMechanismsSolution &&
    (requiresElectrical(space) || (spec.counts.electricalMechanismsCount || 0) > 0 || (space.measurementDrivers.electricalPointsCount || 0) > 0)
  ) {
    solutions.push(spec.selections.electricalMechanismsSolution);
  }

  if (
    spec.selections.electricalPanelSolution &&
    (space.parentSpaceId === null || space.areaType === 'ZONA_COMUN') &&
    ((spec.counts.electricalPanelCount || 0) > 0 || requiresElectrical(space))
  ) {
    solutions.push(spec.selections.electricalPanelSolution);
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
    spec.selections.plumbingWetSolution &&
    (requiresPlumbing(space) || (spec.counts.plumbingWetPointsCount || 0) > 0 || (space.measurementDrivers.waterPointsCount || 0) > 0)
  ) {
    solutions.push(spec.selections.plumbingWetSolution);
  }

  if (
    spec.selections.drainageSolution &&
    (requiresDrainage(space) || (spec.counts.drainagePointsCount || 0) > 0 || (space.measurementDrivers.sanitaryFixturesCount || 0) > 0)
  ) {
    solutions.push(spec.selections.drainageSolution);
  }

  if (
    spec.selections.drainageWetSolution &&
    (requiresDrainage(space) || (spec.counts.drainageWetPointsCount || 0) > 0 || (space.measurementDrivers.sanitaryFixturesCount || 0) > 0)
  ) {
    solutions.push(spec.selections.drainageWetSolution);
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

  if (solutionCode === 'BATH_SHOWER_TRAY_STD') {
    const resolved = resolveWetUnitCount(
      spec.counts.bathShowerBaseCount,
      space,
      `Falta conteo base de platos de ducha en ${space.label}.`,
      `Se asume un plato de ducha por bano en ${space.label}.`
    );
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'SHOWER_TRAY_UNITS',
        description: `Plato de ducha ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'ud',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode === 'BATH_BATHTUB_STD') {
    const resolved = resolveWetUnitCount(
      spec.counts.bathShowerBaseCount,
      space,
      `Falta conteo base de baneras en ${space.label}.`,
      `Se asume una banera por bano en ${space.label}.`
    );
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'BATHTUB_UNITS',
        description: `Banera ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'ud',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode === 'BATH_SCREEN_STD') {
    const resolved = resolveWetUnitCount(
      spec.counts.bathScreenCount,
      space,
      `Falta conteo base de mamparas en ${space.label}.`,
      `Se asume una mampara por bano en ${space.label}.`
    );
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'SHOWER_SCREEN_UNITS',
        description: `Mampara ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'ud',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode === 'BATH_VANITY_STD') {
    const resolved = resolveWetUnitCount(
      spec.counts.bathVanityCount,
      space,
      `Falta conteo base de muebles lavabo en ${space.label}.`,
      `Se asume un mueble lavabo por bano en ${space.label}.`
    );
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'VANITY_UNITS',
        description: `Mueble lavabo ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'ud',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode === 'BATH_TAPWARE_STD' || solutionCode === 'BATH_TAPWARE_PLUS') {
    const resolved = resolveWetUnitCount(
      spec.counts.bathTapwareCount,
      space,
      `Falta conteo base de griferia de bano en ${space.label}.`,
      `Se asume un juego de griferia de bano por unidad en ${space.label}.`
    );
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'BATH_TAPWARE_UNITS',
        description: `Griferia bano ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'ud',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (
    solutionCode === 'KITCHENETTE_CABINET_LOW_STD' ||
    solutionCode === 'KITCHENETTE_CABINET_HIGH_STD'
  ) {
    const resolved = resolveKitchenetteLength(space, spec);
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode:
          solutionCode === 'KITCHENETTE_CABINET_LOW_STD'
            ? 'KITCHEN_CABINET_LOW_LENGTH'
            : 'KITCHEN_CABINET_HIGH_LENGTH',
        description:
          solutionCode === 'KITCHENETTE_CABINET_LOW_STD'
            ? `Mueble bajo ${space.label}`
            : `Mueble alto ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'ml',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (
    solutionCode === 'KITCHENETTE_COUNTERTOP_STD' ||
    solutionCode === 'KITCHENETTE_COUNTERTOP_PLUS'
  ) {
    const resolved = resolveCountertopLength(space, spec);
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'COUNTERTOP_LENGTH',
        description: `Encimera ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'ml',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode === 'KITCHENETTE_APPLIANCE_PACK_BASIC') {
    const resolved = resolveWetUnitCount(
      spec.counts.kitchenetteAppliancePackCount,
      space,
      `Falta conteo base de packs de electrodomesticos en ${space.label}.`,
      `Se asume un pack basico de electrodomesticos por kitchenette en ${space.label}.`
    );
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'KITCHEN_APPLIANCE_UNITS',
        description: `Pack electrodomesticos ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'ud',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode === 'KITCHENETTE_SINK_STD') {
    const resolved = resolveWetUnitCount(
      spec.counts.kitchenetteSinkCount,
      space,
      `Falta conteo base de fregaderos en ${space.label}.`,
      `Se asume un fregadero por kitchenette en ${space.label}.`
    );
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'KITCHEN_SINK_UNITS',
        description: `Fregadero ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'ud',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode === 'KITCHENETTE_TAPWARE_STD') {
    const resolved = resolveWetUnitCount(
      spec.counts.kitchenetteTapwareCount,
      space,
      `Falta conteo base de griferia de cocina en ${space.label}.`,
      `Se asume una griferia de cocina por kitchenette en ${space.label}.`
    );
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'KITCHEN_TAPWARE_UNITS',
        description: `Griferia cocina ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'ud',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (
    solutionCode === 'BATH_STD_COMPACT' ||
    solutionCode === 'BATH_STD_MEDIUM' ||
    solutionCode === 'BATH_ADAPTED'
  ) {
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

  if (
    solutionCode === 'KITCHENETTE_120_BASIC' ||
    solutionCode === 'KITCHENETTE_180_COMPLETE'
  ) {
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

  if (solutionCode === 'WALL_TILE_KITCHEN_SPLASHBACK') {
    const resolved = resolveBacksplashArea(space, spec);
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'BACKSPLASH_AREA',
        description: `Frontal cocina ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'm2',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode === 'WALL_TILE_WET_PARTIAL' || solutionCode === 'WALL_TILE_WET_FULL') {
    const resolved = resolveWetWallTileArea(space, spec, solutionCode);
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'WET_WALL_TILE_AREA',
        description: `Alicatado humedo ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'm2',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode.startsWith('WALL_TILE_')) {
    const resolved = resolveWallTileArea(space, spec);
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'WALL_TILE_AREA',
        description: `Revestimiento vertical ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'm2',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode.startsWith('PAINT_WALL_')) {
    const resolved = resolvePaintWallArea(space, spec);
    if (resolved.warning) warnings.push(resolved.warning);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'PAINT_WALL_AREA',
        description: `Pintura paredes ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'm2',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode === 'PAINT_CEILING_STD') {
    const resolved = resolvePaintCeilingArea(space, spec);
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'PAINT_CEILING_AREA',
        description: `Pintura techos ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'm2',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode === 'WET_AREA_WATERPROOFING_PLUS') {
    const resolved = resolveWetWaterproofingArea(space, spec);
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'WET_WATERPROOFING_AREA',
        description: `Impermeabilizacion reforzada ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'm2',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode === 'WET_AREA_WATERPROOFING_STD') {
    const resolved = resolveWaterproofingArea(space, spec);
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'WATERPROOFING_AREA',
        description: `Impermeabilizacion ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'm2',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status: resolved.quantity === null ? 'BLOCKED' : resolved.status,
      }),
    ];
  }

  if (solutionCode.startsWith('PARTITION_')) {
    const isLining = solutionCode === 'PARTITION_LINING_STD';
    const resolved = isLining ? resolveLiningArea(space, spec) : resolvePartitionArea(space, spec);
    if (resolved.warning) warnings.push(resolved.warning);
    if (resolved.assumption) assumptions.push(resolved.assumption);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: isLining ? 'LINING_WALL_AREA' : 'PARTITION_WALL_AREA',
        description: isLining ? `Trasdosado ${space.label}` : `Tabiqueria ${space.label}`,
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

  if (solutionCode === 'ELECTRICAL_MECHANISMS_STD') {
    const resolved = resolveCount(
      spec.counts.electricalMechanismsCount,
      space.measurementDrivers.electricalPointsCount,
      `Falta conteo base de mecanismos electricos en ${space.label}.`
    );
    if (resolved.warning) warnings.push(resolved.warning);
    if (
      resolved.quantity != null &&
      (spec.counts.electricalMechanismsCount == null || spec.counts.electricalMechanismsCount === 0) &&
      (space.measurementDrivers.electricalPointsCount || 0) > 0
    ) {
      assumptions.push(`Se usa el numero de puntos electricos como fallback de mecanismos en ${space.label}.`);
    }
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'ELECTRICAL_MECHANISMS_COUNT',
        description: `Mecanismos electricos ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'pt',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status:
          resolved.quantity === null
            ? 'BLOCKED'
            : spec.counts.electricalMechanismsCount
              ? resolved.status
              : 'ASSUMED',
      }),
    ];
  }

  if (solutionCode === 'ELECTRICAL_PANEL_BASIC') {
    const resolved = resolveCount(
      spec.counts.electricalPanelCount,
      space.parentSpaceId === null ? 1 : null,
      `Falta conteo base de cuadros electricos en ${space.label}.`
    );
    if (resolved.warning) warnings.push(resolved.warning);
    if (
      resolved.quantity != null &&
      (spec.counts.electricalPanelCount == null || spec.counts.electricalPanelCount === 0) &&
      space.parentSpaceId === null
    ) {
      assumptions.push(`Se usa un cuadro electrico por espacio raiz como fallback en ${space.label}.`);
    }
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'ELECTRICAL_PANEL_UNITS',
        description: `Cuadro electrico ${space.label}`,
        quantity: resolved.quantity ?? 0,
        unit: 'ud',
        sourceLevel: spec.sourceLevel,
        sourceRefId: spec.sourceRefId,
        assumedFields: spec.assumedFields,
        status:
          resolved.quantity === null
            ? 'BLOCKED'
            : spec.counts.electricalPanelCount
              ? resolved.status
              : 'ASSUMED',
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

  if (solutionCode === 'PLUMBING_WET_ROOM_STD' || solutionCode === 'PLUMBING_WET_ROOM_PLUS') {
    const resolved = resolveCount(
      spec.counts.plumbingWetPointsCount,
      space.measurementDrivers.waterPointsCount,
      `Falta conteo base de puntos humedos de fontaneria en ${space.label}.`
    );
    if (resolved.warning) warnings.push(resolved.warning);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'PLUMBING_WET_POINTS',
        description: `Puntos humedos fontaneria ${space.label}`,
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

  if (solutionCode === 'DRAINAGE_WET_ROOM_STD' || solutionCode === 'DRAINAGE_WET_ROOM_PLUS') {
    const resolved = resolveCount(
      spec.counts.drainageWetPointsCount,
      space.measurementDrivers.sanitaryFixturesCount,
      `Falta conteo base de puntos humedos de saneamiento en ${space.label}.`
    );
    if (resolved.warning) warnings.push(resolved.warning);
    return [
      makeLine({
        spaceId: space.spaceId,
        solutionCode,
        measurementCode: 'DRAINAGE_WET_POINTS',
        description: `Puntos humedos saneamiento ${space.label}`,
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
