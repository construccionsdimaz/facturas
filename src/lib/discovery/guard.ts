import { DiscoveryAssumption, DiscoverySessionData, DiscoveryWarning } from './types';

export type DiscoveryGenerateCheck = {
  canGenerate: boolean;
  blockers: string[];
  warnings: DiscoveryWarning[];
  assumptions: DiscoveryAssumption[];
  confidenceScore: number;
  confidenceLevel: 'BAJA' | 'MEDIA' | 'ALTA';
};

export function evaluateDiscoveryForGenerate(data: DiscoverySessionData): DiscoveryGenerateCheck {
  const blockers: string[] = [];
  const warnings: DiscoveryWarning[] = [];
  const assumptions: DiscoveryAssumption[] = [];

  if (!data.classification.interventionType) blockers.push('Falta tipo de intervencion.');
  if (!data.classification.assetType) blockers.push('Falta tipo de inmueble.');
  if (!data.classification.globalScope) blockers.push('Falta alcance global.');
  if (!data.assetContext.areaM2 && !data.assetContext.magnitudeLabel) blockers.push('Falta magnitud base de la obra.');
  if (!data.assetContext.accessLevel || data.assetContext.accessLevel === 'NO_LO_SE') blockers.push('Falta nivel de acceso.');
  if (!data.assetContext.occupancyState || data.assetContext.occupancyState === 'NO_LO_SE') blockers.push('Falta indicar si el inmueble esta ocupado.');
  if (data.macroScope.workCodes.length === 0) blockers.push('Falta seleccionar al menos una familia de trabajo.');
  if (data.areas.filter((area) => area.selected).length === 0 && data.classification.assetType !== 'EXTERIOR') blockers.push('Falta seleccionar al menos una zona afectada.');
  if (data.actionsByArea.length === 0 || data.actionsByArea.every((item) => item.actions.length === 0)) blockers.push('Falta indicar acciones principales por area.');
  if (!data.interventionProfile.globalIntensity) blockers.push('Falta intensidad de intervencion.');
  if (!data.finishProfile.globalLevel) blockers.push('Falta nivel de acabado global.');

  if (data.currentVsTarget.structureAffected?.value && !data.macroScope.workCodes.includes('ESTRUCTURA')) {
    blockers.push('Se ha marcado estructura afectada, pero no existe familia estructural activa.');
  }

  if (data.currentVsTarget.changeOfUse?.value && data.classification.assetType === 'LOCAL' && !data.assetContext.unitsCurrent && !data.assetContext.areaM2) {
    blockers.push('Cambio de uso sin magnitud ni contexto minimo del activo.');
  }

  if (!data.assetContext.areaM2) {
    assumptions.push({
      code: 'ASSUME_DEFAULT_MAGNITUDE',
      scope: 'CONTEXT',
      message: 'Se trabajara con magnitud aproximada al no existir superficie confirmada.',
      certaintyImpact: 'HIGH',
    });
  }

  if (data.currentVsTarget.installationReplacement?.electricity === 'PENDIENTE') {
    assumptions.push({
      code: 'ASSUME_INSTALLATIONS_BY_SCOPE',
      scope: 'CURRENT_TARGET',
      message: 'Se asumira el alcance de instalaciones segun tipologia y areas afectadas.',
      certaintyImpact: 'MEDIUM',
    });
  }

  const pendingInclusions = Object.entries(data.inclusions).filter(([, mode]) => mode === 'PENDIENTE');
  if (pendingInclusions.length > 0) {
    warnings.push({
      code: 'INCLUSIONS_PENDING',
      severity: 'WARNING',
      message: `Hay ${pendingInclusions.length} familias de suministro pendientes de definir.`,
      relatedTo: 'INCLUSIONS',
    });
  }

  if (!data.assetContext.hasElevator && typeof data.assetContext.floorNumber === 'number' && data.assetContext.floorNumber >= 2) {
    warnings.push({
      code: 'ACCESS_COMPLEXITY_HIGH',
      severity: 'WARNING',
      message: 'Sin ascensor y con planta elevada: aumenta riesgo logistico y de coste.',
      relatedTo: 'CONTEXT',
    });
  }

  if (!data.assetContext.roomsCurrent && (data.classification.assetType === 'PISO' || data.classification.assetType === 'CASA')) {
    warnings.push({
      code: 'ROOMS_NOT_CONFIRMED',
      severity: 'INFO',
      message: 'El numero de habitaciones no esta confirmado; se inferira con criterio.',
      relatedTo: 'CONTEXT',
    });
  }

  let confidenceScore = 100 - blockers.length * 20 - warnings.length * 7 - assumptions.length * 8;
  confidenceScore = Math.max(10, Math.min(100, confidenceScore));
  const confidenceLevel = confidenceScore >= 75 ? 'ALTA' : confidenceScore >= 45 ? 'MEDIA' : 'BAJA';

  return {
    canGenerate: blockers.length === 0,
    blockers,
    warnings,
    assumptions,
    confidenceScore,
    confidenceLevel,
  };
}
