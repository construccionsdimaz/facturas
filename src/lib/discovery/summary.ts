import { WORK_CODE_LABELS } from './catalogs';
import { DiscoveryArea, DiscoveryAssumption, DiscoverySessionData, DiscoverySummary, DiscoveryWarning, InclusionMode } from './types';

function pushByCertainty(target: string[], certainty: string, label: string) {
  if (!label) return;
  if (certainty === 'CONFIRMADO') target.push(label);
}

function areaLabel(area: DiscoveryArea) {
  return `${area.label}${typeof area.approxSizeM2 === 'number' ? ` (${area.approxSizeM2} m2)` : ''}`;
}

function inclusionLabel(key: string, mode: InclusionMode) {
  return `${key.toLowerCase()}: ${mode.toLowerCase()}`;
}

export function buildDiscoverySummary(
  data: DiscoverySessionData,
  assumptions: DiscoveryAssumption[],
  warnings: DiscoveryWarning[],
  workTypeLabel: string
): DiscoverySummary {
  const confirmed: string[] = [];
  const estimated: string[] = [];
  const pending: string[] = [];

  const headline = {
    workTypeLabel,
    assetLabel: data.classification.assetType,
    sizeLabel: data.assetContext.areaM2 ? `${data.assetContext.areaM2} m2` : data.assetContext.magnitudeLabel || 'Magnitud pendiente',
  };

  const baseFacts = [
    { certainty: data.classification.certainty, text: `Intervencion ${data.classification.interventionType.toLowerCase()} sobre ${data.classification.assetType.toLowerCase()}` },
    { certainty: data.interventionProfile.certainty, text: `Intensidad ${data.interventionProfile.globalIntensity.toLowerCase()}` },
    { certainty: data.finishProfile.certainty, text: `Acabado ${data.finishProfile.globalLevel.toLowerCase()}` },
    { certainty: data.macroScope.certainty, text: `Familias activas: ${data.macroScope.workCodes.map((code) => WORK_CODE_LABELS[code]).join(', ')}` },
  ];

  baseFacts.forEach((fact) => {
    if (fact.certainty === 'CONFIRMADO') confirmed.push(fact.text);
    else if (fact.certainty === 'ESTIMADO') estimated.push(fact.text);
    else pending.push(fact.text);
  });

  data.areas.filter((area) => area.selected).forEach((area) => {
    const text = `Area: ${areaLabel(area)}`;
    if (area.certainty === 'CONFIRMADO') confirmed.push(text);
    else if (area.certainty === 'ESTIMADO') estimated.push(text);
    else pending.push(text);
  });

  if (data.modelingStrategy === 'STRUCTURED_REPETITIVE') {
    estimated.push(
      `Modelo estructurado con ${data.spatialModel.floors.filter((floor) => floor.selected).length} plantas, ${data.spatialModel.groups.length} grupos y ${data.spatialModel.instances.length} instancias`
    );
  }

  const includedByUs = Object.entries(data.inclusions)
    .filter(([, mode]) => mode === 'INCLUIDO')
    .map(([key, mode]) => inclusionLabel(key, mode));

  const excludedOrExternal = Object.entries(data.inclusions)
    .filter(([, mode]) => mode !== 'INCLUIDO')
    .map(([key, mode]) => inclusionLabel(key, mode));

  assumptions.forEach((assumption) => pending.push(assumption.message));
  warnings.forEach((warning) => pending.push(warning.message));

  return {
    headline,
    confirmed,
    estimated,
    assumed: assumptions.map((assumption) => assumption.message),
    pending,
    includedByUs,
    excludedOrExternal,
    nextRiskPoints: warnings.map((warning) => warning.message),
  };
}
