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
  standardActivityCode?: string | null;
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
      },
    ],
    dependencyNodes: [],
    notes: ['No se encontro tipologia aplicable. Se ha generado una estructura minima de fallback.'],
    typologyCode: null,
    source: 'FALLBACK',
  };
}

export async function generatePlanningBlueprint(context: PlanningGenerationInput): Promise<PlanningBlueprint> {
  const normalizedContext = {
    ...context,
    finishLevel: context.finishLevel || 'MEDIO',
  };
  const typology = await loadAutomationTypology(normalizedContext);
  if (!typology) return buildFallbackBlueprint(context);

  const tags = detectWorkTags(context.works || '');
  const locationNodes = typology.locationTemplates.flatMap((template: any) => expandLocationTemplate(template, normalizedContext));

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
        locationKey: resolveLocationKey(template.locationCode, locationNodes),
        durationDays: Math.max(1, durationDays),
        responsible: template.standardActivity.category === 'INSTALACIONES' ? 'Instalaciones' : template.standardActivity.category === 'CARPINTERIA' ? 'Carpinteria' : 'Produccion',
        notes: `Generada desde plantilla ${template.code}${costItem ? ` | Partida: ${costItem.name}` : ''}`,
        standardActivityCode: template.standardActivity.code || null,
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
    ],
    typologyCode: typology.code,
    source: 'MASTER',
  };
}
