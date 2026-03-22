import type { ExecutionContext, ResolvedSpace } from './types';
import { inspectResolvedSpecCoverage } from './resolve-technical-spec';
import type { MeasurementResult } from '@/lib/estimate/measurement-types';
import type { PricingResult } from '@/lib/estimate/pricing-types';
import type { ResolvedTechnicalSpecSummary, ResolvedSpec, TechnicalSpecPatch } from './technical-spec-types';
import { createEmptyTechnicalSpecPatch, ensureTechnicalSpecPatch } from './technical-spec-defaults';
import type { DiscoverySessionData, SpaceGroup, SpaceInstance } from './types';

export type TechnicalSystemKey =
  | 'rooms'
  | 'bathrooms'
  | 'kitchenettes'
  | 'leveling'
  | 'commonAreas'
  | 'wallFinishes'
  | 'partitions'
  | 'ceilings'
  | 'flooring'
  | 'carpentry'
  | 'mep';

export type TechnicalSystemCard = {
  key: TechnicalSystemKey;
  label: string;
  description: string;
  status: 'READY' | 'PARTIAL' | 'BLOCKED';
  applicableCount: number;
  satisfiedCount: number;
  blockedMeasurementCount: number;
  pendingPricingCount: number;
  inferredPricingCount: number;
  missingScopes: string[];
  driverIssues: string[];
  measurementIssues: string[];
  pricingIssues: string[];
};

export type TechnicalHierarchyRow = {
  key: string;
  label: string;
  level: 'PROJECT' | 'FLOOR' | 'GROUP' | 'INSTANCE';
  status: 'READY' | 'PARTIAL' | 'BLOCKED' | 'INHERITED' | 'OVERRIDDEN';
  inheritedFrom: string | null;
  issueCount: number;
  highlightedSystems: TechnicalSystemKey[];
};

export type TechnicalReviewSummary = {
  readySystems: number;
  partialSystems: number;
  blockedSystems: number;
  missingDriverCount: number;
  measurementBlockedCount: number;
  pricingPendingCount: number;
  pricingInferredCount: number;
  provisionalRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  blockers: string[];
};

const SYSTEM_META: Record<TechnicalSystemKey, { label: string; description: string }> = {
  rooms: { label: 'Rooms', description: 'Habitaciones y unidades tipo' },
  bathrooms: { label: 'Bathrooms', description: 'Baños, sanitarios y drivers húmedos' },
  kitchenettes: { label: 'Kitchens', description: 'Kitchenettes y cocinas compactas' },
  leveling: { label: 'Leveling', description: 'Regularización y nivelación por planta' },
  commonAreas: { label: 'Common Areas', description: 'Zonas comunes y remates' },
  wallFinishes: { label: 'Wall Finishes', description: 'Alicatados, pintura e impermeabilización ligera' },
  partitions: { label: 'Partitions', description: 'Tabiquería y trasdosados' },
  ceilings: { label: 'Ceilings', description: 'Falsos techos y acabados superiores' },
  flooring: { label: 'Flooring', description: 'Pavimentos y rodapiés' },
  carpentry: { label: 'Carpentry', description: 'Puertas, ventanas y persianas' },
  mep: { label: 'MEP', description: 'Electricidad, iluminación, fontanería y saneamiento' },
};

const SCOPE_TO_SYSTEM: Record<string, TechnicalSystemKey> = {
  room: 'rooms',
  bath: 'bathrooms',
  kitchenette: 'kitchenettes',
  leveling: 'leveling',
  commonArea: 'commonAreas',
  wallTile: 'wallFinishes',
  wallPaint: 'wallFinishes',
  ceilingPaint: 'wallFinishes',
  waterproofing: 'wallFinishes',
  partition: 'partitions',
  lining: 'partitions',
  ceiling: 'ceilings',
  flooring: 'flooring',
  skirting: 'flooring',
  door: 'carpentry',
  window: 'carpentry',
  shutter: 'carpentry',
  electrical: 'mep',
  electricalMechanisms: 'mep',
  electricalPanel: 'mep',
  lighting: 'mep',
  plumbing: 'mep',
  plumbingWet: 'mep',
  drainage: 'mep',
  drainageWet: 'mep',
};

function systemFromSolutionCode(solutionCode?: string | null): TechnicalSystemKey | null {
  const value = solutionCode || '';
  if (value.startsWith('ROOM_')) return 'rooms';
  if (value.startsWith('BATH_')) return 'bathrooms';
  if (value.startsWith('KITCHENETTE_')) return 'kitchenettes';
  if (value.startsWith('LEVELING_')) return 'leveling';
  if (value.startsWith('COMMON_AREA_')) return 'commonAreas';
  if (value.startsWith('WALL_TILE_') || value.startsWith('PAINT_') || value.startsWith('WET_AREA_')) return 'wallFinishes';
  if (value.startsWith('PARTITION_')) return 'partitions';
  if (value.startsWith('CEILING_')) return 'ceilings';
  if (value.startsWith('FLOOR_') || value === 'SKIRTING_STD') return 'flooring';
  if (value.startsWith('DOOR_') || value.startsWith('WINDOW_') || value.startsWith('SHUTTER_')) return 'carpentry';
  if (value.startsWith('ELECTRICAL_') || value.startsWith('LIGHTING_') || value.startsWith('PLUMBING_') || value.startsWith('DRAINAGE_')) return 'mep';
  return null;
}

export function buildTechnicalSystemCards(params: {
  executionContext: ExecutionContext;
  resolvedSummary: ResolvedTechnicalSpecSummary;
  measurementResult?: MeasurementResult | null;
  pricingResult?: PricingResult | null;
}): TechnicalSystemCard[] {
  const measurementLines = params.measurementResult?.lines || [];
  const pricingLines = params.pricingResult?.lines || [];
  const cards = new Map<TechnicalSystemKey, TechnicalSystemCard>();

  (Object.keys(SYSTEM_META) as TechnicalSystemKey[]).forEach((key) => {
    cards.set(key, {
      key,
      label: SYSTEM_META[key].label,
      description: SYSTEM_META[key].description,
      status: 'BLOCKED',
      applicableCount: 0,
      satisfiedCount: 0,
      blockedMeasurementCount: 0,
      pendingPricingCount: 0,
      inferredPricingCount: 0,
      missingScopes: [],
      driverIssues: [],
      measurementIssues: [],
      pricingIssues: [],
    });
  });

  for (const space of params.executionContext.resolvedSpaces) {
    const resolvedSpec = params.resolvedSummary.bySpaceId[space.spaceId];
    if (!resolvedSpec) continue;
    const scopeCheck = inspectResolvedSpecCoverage(space, resolvedSpec);
    for (const scope of scopeCheck.applicable) {
      const systemKey = SCOPE_TO_SYSTEM[scope];
      if (!systemKey) continue;
      const card = cards.get(systemKey)!;
      card.applicableCount += 1;
      if (!scopeCheck.missing.includes(scope)) card.satisfiedCount += 1;
      else {
        const issue = `${space.label}: falta driver/spec para ${scope}`;
        card.missingScopes.push(issue);
        card.driverIssues.push(issue);
      }
    }
  }

  for (const line of measurementLines) {
    const systemKey = systemFromSolutionCode(line.solutionCode);
    if (!systemKey) continue;
    const card = cards.get(systemKey)!;
    if (line.status === 'BLOCKED' || line.status === 'PARTIAL') {
      card.blockedMeasurementCount += 1;
      card.measurementIssues.push(`${line.solutionCode}: measurement ${line.status} en ${line.measurementCode}`);
    }
  }

  for (const line of pricingLines) {
    const systemKey = systemFromSolutionCode(line.solutionCode);
    if (!systemKey) continue;
    const card = cards.get(systemKey)!;
    if (line.priceStatus === 'PRICE_PENDING_VALIDATION') {
      card.pendingPricingCount += 1;
      card.pricingIssues.push(`${line.solutionCode}: pricing pendiente de validacion`);
    }
    if (line.priceStatus === 'PRICE_INFERRED') {
      card.inferredPricingCount += 1;
      card.pricingIssues.push(`${line.solutionCode}: pricing inferido`);
    }
  }

  for (const card of cards.values()) {
    if (card.applicableCount === 0) {
      card.status = 'BLOCKED';
      continue;
    }
    if (
      card.satisfiedCount === card.applicableCount &&
      card.blockedMeasurementCount === 0 &&
      card.pendingPricingCount === 0
    ) {
      card.status = 'READY';
    } else if (card.satisfiedCount > 0 || card.inferredPricingCount > 0) {
      card.status = 'PARTIAL';
    } else {
      card.status = 'BLOCKED';
    }
  }

  return Array.from(cards.values());
}

export function describePatchState(params: {
  patch?: TechnicalSpecPatch | null;
  resolvedSpec?: ResolvedSpec | null;
  expectedLevel: 'PROJECT' | 'FLOOR' | 'GROUP' | 'INSTANCE';
}) {
  const patch = ensureTechnicalSpecPatch(params.patch || createEmptyTechnicalSpecPatch());
  const hasOverride =
    Object.values(patch.selections || {}).some(Boolean) ||
    Object.values(patch.dimensions || {}).some((value) => typeof value === 'number' && value > 0) ||
    Object.values(patch.counts || {}).some((value) => typeof value === 'number' && value > 0) ||
    Object.values(patch.options || {}).some((value) => value === true);

  if (hasOverride) return 'OVERRIDDEN' as const;
  if (!params.resolvedSpec) return 'BLOCKED' as const;
  if (params.resolvedSpec.sourceLevel === params.expectedLevel) return 'READY' as const;
  return 'INHERITED' as const;
}

export function buildScopeIssues(params: {
  space: ResolvedSpace;
  resolvedSpec?: ResolvedSpec | null;
  measurementResult?: MeasurementResult | null;
  pricingResult?: PricingResult | null;
}) {
  const issues: string[] = [];
  if (params.resolvedSpec) {
    const scopeCheck = inspectResolvedSpecCoverage(params.space, params.resolvedSpec);
    for (const missing of scopeCheck.missing) {
      issues.push(`Falta spec para ${missing}`);
    }
  }

  for (const line of params.measurementResult?.lines || []) {
    if (line.spaceId !== params.space.spaceId) continue;
    if (line.status === 'BLOCKED') issues.push(`Measurement bloqueada en ${line.measurementCode}`);
    if (line.status === 'ASSUMED' || line.status === 'PARTIAL') issues.push(`Measurement parcial en ${line.measurementCode}`);
  }

  for (const line of params.pricingResult?.lines || []) {
    if (line.spaceId !== params.space.spaceId) continue;
    if (line.priceStatus === 'PRICE_PENDING_VALIDATION') issues.push(`Pricing pendiente en ${line.solutionCode}`);
    if (line.priceStatus === 'PRICE_INFERRED') issues.push(`Pricing inferido en ${line.solutionCode}`);
  }

  return Array.from(new Set(issues));
}

function inferSystemsForGroup(group: SpaceGroup): TechnicalSystemKey[] {
  const systems: TechnicalSystemKey[] = [];
  if (group.template.areaType === 'HABITACION') systems.push('rooms');
  if (group.template.features.hasBathroom) systems.push('bathrooms');
  if (group.template.features.hasKitchenette) systems.push('kitchenettes');
  if (group.template.features.requiresLeveling) systems.push('leveling');
  return systems;
}

function inferSystemsForInstance(instance: SpaceInstance): TechnicalSystemKey[] {
  const systems: TechnicalSystemKey[] = [];
  if (instance.areaType === 'HABITACION') systems.push('rooms');
  if (instance.areaType === 'BANO' || instance.subspaceKind === 'BANO_ASOCIADO') systems.push('bathrooms');
  if (instance.areaType === 'COCINA' || instance.subspaceKind === 'KITCHENETTE') systems.push('kitchenettes');
  if (['PASILLO', 'PORTAL', 'ESCALERA', 'ZONA_COMUN'].includes(instance.areaType)) systems.push('commonAreas');
  return systems;
}

export function buildTechnicalHierarchyRows(params: {
  data: DiscoverySessionData;
  resolvedSummary: ResolvedTechnicalSpecSummary;
  measurementResult?: MeasurementResult | null;
  pricingResult?: PricingResult | null;
}) {
  const rows: TechnicalHierarchyRow[] = [];

  rows.push({
    key: 'project',
    label: 'Proyecto',
    level: 'PROJECT',
    status: params.resolvedSummary.completeness.specifiedScopePercent >= 80 ? 'READY' : 'PARTIAL',
    inheritedFrom: null,
    issueCount: params.resolvedSummary.completeness.missingScopes.length,
    highlightedSystems: [],
  });

  for (const floor of params.data.spatialModel.floors.filter((item) => item.selected)) {
    const patch = ensureTechnicalSpecPatch(params.data.technicalSpecModel.floorSpecs[floor.floorId]);
    rows.push({
      key: `floor:${floor.floorId}`,
      label: floor.label,
      level: 'FLOOR',
      status: describePatchState({ patch, expectedLevel: 'FLOOR' }),
      inheritedFrom: patch ? 'Proyecto' : null,
      issueCount: 0,
      highlightedSystems: ['leveling'],
    });
  }

  for (const group of params.data.spatialModel.groups) {
    const patch = ensureTechnicalSpecPatch(params.data.technicalSpecModel.groupSpecs[group.groupId]);
    const sampleInstance = params.data.spatialModel.instances.find((instance) => instance.groupId === group.groupId);
    const resolvedSpec = sampleInstance ? params.resolvedSummary.bySpaceId[sampleInstance.instanceId] : null;
    rows.push({
      key: `group:${group.groupId}`,
      label: group.label,
      level: 'GROUP',
      status: describePatchState({ patch, resolvedSpec, expectedLevel: 'GROUP' }),
      inheritedFrom: 'Proyecto/Planta',
      issueCount: 0,
      highlightedSystems: inferSystemsForGroup(group),
    });
  }

  for (const instance of params.data.spatialModel.instances) {
    const patch = ensureTechnicalSpecPatch(params.data.technicalSpecModel.instanceSpecs[instance.instanceId]);
    const resolvedSpec = params.resolvedSummary.bySpaceId[instance.instanceId];
    rows.push({
      key: `instance:${instance.instanceId}`,
      label: instance.label,
      level: 'INSTANCE',
      status: describePatchState({ patch, resolvedSpec, expectedLevel: 'INSTANCE' }),
      inheritedFrom: instance.parentInstanceId ? 'Grupo/Instancia padre' : 'Grupo/Planta',
      issueCount: 0,
      highlightedSystems: inferSystemsForInstance(instance),
    });
  }

  return rows;
}

export function buildTechnicalReviewSummary(cards: TechnicalSystemCard[]): TechnicalReviewSummary {
  const readySystems = cards.filter((card) => card.status === 'READY').length;
  const partialSystems = cards.filter((card) => card.status === 'PARTIAL').length;
  const blockedSystems = cards.filter((card) => card.status === 'BLOCKED').length;
  const missingDriverCount = cards.reduce((sum, card) => sum + card.driverIssues.length, 0);
  const measurementBlockedCount = cards.reduce((sum, card) => sum + card.blockedMeasurementCount, 0);
  const pricingPendingCount = cards.reduce((sum, card) => sum + card.pendingPricingCount, 0);
  const pricingInferredCount = cards.reduce((sum, card) => sum + card.inferredPricingCount, 0);
  const blockers = cards
    .filter((card) => card.status !== 'READY')
    .flatMap((card) => [...card.driverIssues, ...card.measurementIssues, ...card.pricingIssues])
    .slice(0, 12);

  const provisionalRisk =
    blockedSystems > 0 || pricingPendingCount > 0
      ? 'HIGH'
      : partialSystems > 0 || pricingInferredCount > 0
        ? 'MEDIUM'
        : 'LOW';

  return {
    readySystems,
    partialSystems,
    blockedSystems,
    missingDriverCount,
    measurementBlockedCount,
    pricingPendingCount,
    pricingInferredCount,
    provisionalRisk,
    blockers,
  };
}
