import {
  AccessLevel,
  ScopeType,
  SiteType,
  WorkType,
} from './types';
import {
  deriveComplexityFactor,
  detectWorkTags,
  estimateDurationFromRate,
  evaluateMeasurementRule,
  expandLocationTemplate,
  loadAutomationTypology,
  matchesInclusionRule,
  resolveLocationKey,
} from './masters';

export interface PlanningGenerationInput {
  name: string;
  description?: string | null;
  projectType?: string | null;
  siteType: SiteType;
  scopeType: ScopeType;
  workType: WorkType;
  area: number;
  works: string;
  accessLevel?: AccessLevel;
  bathrooms?: number;
  kitchens?: number;
  rooms?: number;
  units?: number;
  floors?: number;
  structuralWorks?: boolean;
  hasElevator?: boolean;
  finishLevel?: 'BASICO' | 'MEDIO' | 'MEDIO_ALTO' | 'ALTO';
  conditions?: string;
  areas?: Array<{
    areaId: string;
    areaType: string;
    label: string;
    index?: number | null;
    approxSizeM2?: number | null;
    currentState?: string | null;
    targetState?: string | null;
    certainty?: string;
  }>;
  actionsByArea?: Array<{
    areaId: string;
    actions: Array<{
      actionCode: string;
      coverage?: string;
      replaceMode?: string;
      notes?: string | null;
      certainty?: string;
    }>;
  }>;
  discoverySubtypes?: string[];
  complexityProfile?: {
    riskLevel?: string;
    drivers?: string[];
    costSensitivity?: string;
    scheduleSensitivity?: string;
    procurementSensitivity?: string;
  };
  inclusions?: Record<string, string>;
  currentVsTarget?: Record<string, unknown>;
  executionConstraints?: Record<string, unknown>;
  certainty?: unknown;
  executionContext?: {
    resolvedSpaces?: Array<{
      spaceId: string;
      areaType: string;
      label: string;
      floorId?: string | null;
      parentSpaceId?: string | null;
      measurementDrivers?: { areaM2?: number | null };
    }>;
  };
}

export interface PlanningLocationNode {
  key: string;
  name: string;
  type: string;
  parentKey?: string | null;
  code?: string | null;
  description?: string | null;
}

export interface PlanningWBSNode {
  key: string;
  name: string;
  level: string;
  parentKey?: string | null;
  code?: string | null;
  description?: string | null;
}

export interface PlanningActivityNode {
  key: string;
  name: string;
  code: string;
  wbsKey: string;
  locationKey?: string | null;
  durationDays: number;
  responsible?: string | null;
  notes?: string | null;
  standardActivityId?: string | null;
  standardActivityCode?: string | null;
  generationSource?: 'MASTER' | 'FALLBACK';
  originTypologyCode?: string | null;
  originActivityTemplateCode?: string | null;
  originCostItemCode?: string | null;
  productivityRateName?: string | null;
}

export interface PlanningDependencyNode {
  predecessorKey: string;
  successorKey: string;
  type?: 'FS' | 'SS' | 'FF' | 'SF';
  lagDays?: number;
}

export interface PlanningBlueprint {
  locationNodes: PlanningLocationNode[];
  wbsNodes: PlanningWBSNode[];
  activityNodes: PlanningActivityNode[];
  dependencyNodes: PlanningDependencyNode[];
  notes: string[];
  typologyCode?: string | null;
  source: 'MASTER' | 'FALLBACK';
}

function buildFallbackBlueprint(context: PlanningGenerationInput): PlanningBlueprint {
  return {
    locationNodes: [{ key: 'site-root', name: context.name, type: context.siteType, code: 'SITE' }],
    wbsNodes: [{ key: 'wbs-01', name: 'General', level: 'CAPITULO', code: '01' }],
    activityNodes: [
      {
        key: 'act-01',
        name: 'Actividad base generada por fallback',
        code: 'A01',
        wbsKey: 'wbs-01',
        locationKey: 'site-root',
        durationDays: Math.max(1, Number(((context.area || 0) / 25).toFixed(1))),
        responsible: 'Produccion',
        generationSource: 'FALLBACK',
      },
    ],
    dependencyNodes: [],
    notes: ['No se encontro tipologia aplicable. Se ha generado una estructura minima de fallback.'],
    typologyCode: null,
    source: 'FALLBACK',
  };
}

function buildDiscoveryTagsText(context: PlanningGenerationInput) {
  const selectedAreas = (context.areas || []).map((area) => {
    const areaBits = [area.label, area.areaType, area.currentState, area.targetState].filter(Boolean);
    return areaBits.join(' ');
  });
  const actionBits = (context.actionsByArea || []).flatMap((areaActions) =>
    areaActions.actions.map((action) =>
      [action.actionCode, action.coverage, action.replaceMode, action.notes].filter(Boolean).join(' ')
    )
  );
  const subtypeBits = context.discoverySubtypes || [];
  const complexityBits = [
    context.complexityProfile?.riskLevel,
    ...(context.complexityProfile?.drivers || []),
  ].filter(Boolean);
  const inclusionBits = Object.entries(context.inclusions || {}).map(([family, mode]) => `${family} ${mode}`);
  const constraintBits = Object.entries(context.executionConstraints || {}).flatMap(([key, value]) =>
    value ? [`${key} ${String(value)}`] : []
  );

  return [
    context.works || '',
    ...selectedAreas,
    ...actionBits,
    ...subtypeBits,
    ...complexityBits,
    ...inclusionBits,
    ...constraintBits,
  ]
    .filter(Boolean)
    .join(' ');
}

function buildLocationNodes(context: PlanningGenerationInput, typology: any) {
  const masterLocationNodes = typology.locationTemplates.flatMap((template: any) =>
    expandLocationTemplate(template, {
      ...context,
      finishLevel: context.finishLevel || 'MEDIO',
    })
  );

  const selectedAreas = (context.areas || []).filter((area) => area.label);
  if (selectedAreas.length === 0) {
    const structuredSpaces = context.executionContext?.resolvedSpaces || [];
    if (structuredSpaces.length === 0) return masterLocationNodes;
    return [
      ...masterLocationNodes,
      ...structuredSpaces.map((space) => ({
        key: `space-${space.spaceId}`,
        name: space.label,
        type: space.areaType,
        parentKey: space.parentSpaceId ? `space-${space.parentSpaceId}` : 'site-root',
        code: space.areaType,
        description: typeof space.measurementDrivers?.areaM2 === 'number' ? `${space.measurementDrivers.areaM2} m2` : null,
      })),
    ];
  }

  const existingKeys = new Set(masterLocationNodes.map((node: PlanningLocationNode) => node.key));
  const discoveryLocationNodes: PlanningLocationNode[] = selectedAreas
    .filter((area) => !existingKeys.has(`discovery-${area.areaId}`))
    .map((area) => ({
      key: `discovery-${area.areaId}`,
      name: area.label,
      type: area.areaType,
      parentKey: 'site-root',
      code: area.areaType,
      description: [area.currentState, area.targetState].filter(Boolean).join(' -> ') || null,
    }));

  return [...masterLocationNodes, ...discoveryLocationNodes];
}

function inferLocationKeyFromDiscovery(
  context: PlanningGenerationInput,
  locationNodes: PlanningLocationNode[],
  template: any,
  costItem: any
) {
  const selectedAreas = (context.areas || []).filter((area) => area.label);
  if (selectedAreas.length === 0) return 'site-root';

  const haystack = [
    template?.nameOverride,
    template?.standardActivity?.name,
    template?.standardActivity?.code,
    costItem?.name,
    costItem?.chapterName,
    context.works,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const hintMatchers: Array<{ areaType: string; patterns: string[] }> = [
    { areaType: 'COCINA', patterns: ['cocina', 'kitchen'] },
    { areaType: 'BANO', patterns: ['bano', 'baño', 'sanitario', 'aseo'] },
    { areaType: 'ASEO', patterns: ['aseo', 'wc'] },
    { areaType: 'HABITACION', patterns: ['habitacion', 'dormitorio', 'room'] },
    { areaType: 'SALON', patterns: ['salon', 'estar', 'living'] },
    { areaType: 'COMEDOR', patterns: ['comedor'] },
    { areaType: 'PASILLO', patterns: ['pasillo', 'distribuidor'] },
    { areaType: 'PORTAL', patterns: ['portal', 'acceso'] },
    { areaType: 'ESCALERA', patterns: ['escalera'] },
    { areaType: 'FACHADA', patterns: ['fachada'] },
    { areaType: 'CUBIERTA', patterns: ['cubierta', 'tejado'] },
    { areaType: 'PATIO', patterns: ['patio'] },
    { areaType: 'TERRAZA', patterns: ['terraza'] },
    { areaType: 'EXTERIOR', patterns: ['exterior', 'urbanizacion', 'urbanización'] },
    { areaType: 'ZONA_COMUN', patterns: ['zona comun', 'zonas comunes', 'common'] },
    { areaType: 'VIVIENDA', patterns: ['vivienda', 'unidad'] },
    { areaType: 'SALA_PRINCIPAL', patterns: ['sala principal', 'sala'] },
    { areaType: 'ALMACEN', patterns: ['almacen', 'trastienda', 'storage'] },
    { areaType: 'OFFICE', patterns: ['office'] },
    { areaType: 'ESCAPARATE', patterns: ['escaparate'] },
  ];

  const matchedArea = hintMatchers
    .filter((matcher) => matcher.patterns.some((pattern) => haystack.includes(pattern)))
    .flatMap((matcher) => selectedAreas.filter((area) => area.areaType === matcher.areaType))
    .find(Boolean);

  if (!matchedArea) return 'site-root';

  const matchedNode = locationNodes.find((node) => node.key === `discovery-${matchedArea.areaId}`);
  return matchedNode?.key || 'site-root';
}

export async function generatePlanningBlueprint(context: PlanningGenerationInput): Promise<PlanningBlueprint> {
  const normalizedContext = {
    ...context,
    finishLevel: context.finishLevel || 'MEDIO',
  };
  const typology = await loadAutomationTypology(normalizedContext);
  if (!typology) return buildFallbackBlueprint(context);

  const tags = detectWorkTags(buildDiscoveryTagsText(context));
  const locationNodes = buildLocationNodes(normalizedContext, typology);

  const wbsNodes = Array.from(
    new Map(
      typology.costItems.map((item: any) => [
        item.chapterCode,
        {
          key: `wbs-${item.chapterCode}`,
          name: item.chapterName,
          level: 'CAPITULO',
          code: item.chapterCode,
        },
      ])
    ).values()
  ) as PlanningWBSNode[];

  const costItemMap = new Map<string, any>(typology.costItems.map((item: any) => [item.code, item]));
  const factors = deriveComplexityFactor(normalizedContext, typology);

  const activityNodes = typology.activityTemplates
    .filter((template: any) => matchesInclusionRule(template.inclusionRule, normalizedContext, tags))
    .map((template: any, index: number) => {
      const costItem = template.costItemCode ? costItemMap.get(template.costItemCode) : null;
      const quantity = costItem ? evaluateMeasurementRule(costItem.measurementRule, normalizedContext, tags) : 1;
      const pricing = costItem?.pricingRule && typeof costItem.pricingRule === 'object' ? costItem.pricingRule : {};
      const fallbackHoursPerUnit = typeof pricing.fallbackLaborHoursPerUnit === 'number' ? pricing.fallbackLaborHoursPerUnit : 1;
      const durationDays = Number(
        (
          estimateDurationFromRate(
            quantity,
            template.productivityRate || costItem?.productivityRate,
            fallbackHoursPerUnit
          ) *
          factors.typologyTimeFactor *
          factors.conditionFactor
        ).toFixed(1)
      );

      return {
        key: `act-${index + 1}`,
        name: template.nameOverride || template.standardActivity.name,
        code: template.standardActivity.code || `A${index + 1}`,
        wbsKey: `wbs-${template.wbsCode || costItem?.chapterCode || '01'}`,
        locationKey:
          resolveLocationKey(template.locationCode, locationNodes) !== 'site-root'
            ? resolveLocationKey(template.locationCode, locationNodes)
            : inferLocationKeyFromDiscovery(normalizedContext, locationNodes, template, costItem),
        durationDays: Math.max(1, durationDays),
        responsible: template.standardActivity.category === 'INSTALACIONES' ? 'Instalaciones' : template.standardActivity.category === 'CARPINTERIA' ? 'Carpinteria' : 'Produccion',
        notes: `Generada desde plantilla ${template.code}${costItem ? ` | Partida: ${costItem.name}` : ''}${context.discoverySubtypes?.length ? ` | Discovery: ${context.discoverySubtypes.join(', ')}` : ''}`,
        standardActivityId: template.standardActivity.id || null,
        standardActivityCode: template.standardActivity.code || null,
        generationSource: 'MASTER' as const,
        originTypologyCode: typology.code,
        originActivityTemplateCode: template.code,
        originCostItemCode: template.costItemCode || null,
        productivityRateName: template.productivityRate?.name || costItem?.productivityRate?.name || null,
      };
    });

  if (activityNodes.length === 0) return buildFallbackBlueprint(context);

  const dependencyNodes: PlanningDependencyNode[] = [];
  for (let index = 0; index < activityNodes.length - 1; index += 1) {
    const template = typology.activityTemplates[index + 1];
    dependencyNodes.push({
      predecessorKey: activityNodes[index].key,
      successorKey: activityNodes[index + 1].key,
      type: (template?.dependencyType || 'FS') as PlanningDependencyNode['type'],
      lagDays: template?.lagDays || 0,
    });
  }

  return {
    locationNodes,
    wbsNodes,
    activityNodes,
    dependencyNodes,
    notes: [
      `Tipologia aplicada: ${typology.name}`,
      'El planning base se ha generado desde maestros tipologicos, actividades estandar y rendimientos.',
      ...(context.discoverySubtypes?.length ? [`Discovery subtypes: ${context.discoverySubtypes.join(', ')}`] : []),
    ],
    typologyCode: typology.code,
    source: 'MASTER',
  };
}
