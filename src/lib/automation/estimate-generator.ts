import {
  AutomationContext,
  AccessLevel,
  FinishLevel,
  ScopeType,
  SiteType,
  WorkType,
} from './types';
import {
  AUTOMATION_SEED_VERSION,
  deriveComplexityFactor,
  detectWorkTags,
  estimateLaborHours,
  evaluateMeasurementRule,
  loadAutomationTypology,
  matchesInclusionRule,
} from './masters';
import {
  buildSprintOneEstimateStatus,
  buildSprintOneLineEconomicStatus,
  type EstimateLineEconomicSnapshot,
  type EstimateStatusSnapshot,
} from '@/lib/estimate/estimate-status';

export type { AccessLevel, FinishLevel, ScopeType, SiteType, WorkType };
export type EstimateGenerationInput = AutomationContext;
export type LegacyEstimateCostingMode =
  | 'MASTER_PARAMETRIC'
  | 'FALLBACK_PARAMETRIC';

export interface GeneratedEstimateLine {
  chapter: string;
  code?: string | null;
  description: string;
  unit: string;
  quantity: number;
  commercialPrice: number;
  internalCost: number;
  laborHours: number;
  laborCost: number;
  materialCost: number;
  associatedCost: number;
  kind: 'DIRECT' | 'LABOR' | 'ASSOCIATED' | 'PROVISIONAL';
  source: 'MASTER' | 'FALLBACK';
  typologyCode?: string | null;
  standardActivityCode?: string | null;
  productivityRateName?: string | null;
  measurementRule?: Record<string, unknown> | null;
  pricingRule?: Record<string, unknown> | null;
  appliedAssumptions?: Record<string, unknown> | null;
  economicStatus: EstimateLineEconomicSnapshot;
}

export interface GeneratedEstimateSummary {
  materialCost: number;
  laborCost: number;
  associatedCost: number;
  internalCost: number;
  contingencyAmount: number;
  marginAmount: number;
  commercialSubtotal: number;
  vatAmount: number;
  commercialTotal: number;
}

export interface GeneratedEstimateProposal {
  chapters: string[];
  lines: GeneratedEstimateLine[];
  summary: GeneratedEstimateSummary;
  notes: string[];
  structureMode: 'LEGACY_STRUCTURE_BASE';
  legacyCostingMode: LegacyEstimateCostingMode;
  typologyCode?: string | null;
  source: 'MASTER' | 'FALLBACK';
  seedVersion?: number | null;
  estimateStatus: EstimateStatusSnapshot;
}

function asLineKind(kind?: string | null): GeneratedEstimateLine['kind'] {
  if (kind === 'LABOR' || kind === 'ASSOCIATED' || kind === 'PROVISIONAL') return kind;
  return 'DIRECT';
}

function toChapterLabel(code: string, name: string) {
  return `${code} ${name}`;
}

function buildLineFromMaster(item: any, input: EstimateGenerationInput, typology: any) {
  const tags = detectWorkTags(input.works || '');
  if (!matchesInclusionRule(item.inclusionRule, input, tags)) return null;

  const quantity = Number(evaluateMeasurementRule(item.measurementRule, input, tags).toFixed(2));
  if (quantity <= 0) return null;

  const pricing = item.pricingRule && typeof item.pricingRule === 'object' ? item.pricingRule : {};
  const factors = deriveComplexityFactor(input, typology);
  const fallbackLaborHoursPerUnit = typeof pricing.fallbackLaborHoursPerUnit === 'number' ? pricing.fallbackLaborHoursPerUnit : 0;
  const materialRate = typeof pricing.materialRate === 'number' ? pricing.materialRate : 0;
  const associatedRate = typeof pricing.associatedRate === 'number' ? pricing.associatedRate : 0;
  const commercialFactor = typeof pricing.commercialFactor === 'number' ? pricing.commercialFactor : 1.2;

  const laborHours = estimateLaborHours(quantity, item.productivityRate, fallbackLaborHoursPerUnit) * factors.finishFactor * factors.conditionFactor * factors.typologyTimeFactor;
  const laborCost = Number((laborHours * 28 * factors.accessFactor).toFixed(2));
  const materialCost = Number((quantity * materialRate * factors.finishFactor * factors.typologyCostFactor).toFixed(2));
  const associatedCost = Number((quantity * associatedRate * factors.conditionFactor * factors.siteFactor * (input.hasElevator ? 0.95 : 1) * typology.operationalSensitivity).toFixed(2));
  const internalCost = Number((laborCost + materialCost + associatedCost).toFixed(2));
  const commercialPrice = Number((internalCost * commercialFactor * factors.accessFactor * Math.max(1, factors.scopeFactor)).toFixed(2));

  return {
    chapter: toChapterLabel(item.chapterCode, item.chapterName),
    code: item.code || null,
    description: item.name,
    unit: item.unit,
    quantity,
    commercialPrice,
    internalCost,
    laborHours: Number(laborHours.toFixed(2)),
    laborCost,
    materialCost,
    associatedCost,
    kind: asLineKind(item.lineKind),
    source: 'MASTER' as const,
    typologyCode: typology.code || null,
    standardActivityCode: item.standardActivity?.code || null,
    productivityRateName: item.productivityRate?.name || null,
    measurementRule: item.measurementRule && typeof item.measurementRule === 'object' ? item.measurementRule : null,
    pricingRule: item.pricingRule && typeof item.pricingRule === 'object' ? item.pricingRule : null,
    appliedAssumptions: {
      finishLevel: input.finishLevel,
      accessLevel: input.accessLevel,
      siteType: input.siteType,
      scopeType: input.scopeType,
      structuralWorks: input.structuralWorks,
    },
    economicStatus: buildSprintOneLineEconomicStatus(),
  };
}

function buildFallbackProposal(input: EstimateGenerationInput): GeneratedEstimateProposal {
  const internalCost = Number((Math.max(0, input.area) * 420).toFixed(2));
  const contingencyAmount = Number((internalCost * 0.06).toFixed(2));
  const marginAmount = Number((internalCost * 0.18).toFixed(2));
  const commercialSubtotal = Number((internalCost + contingencyAmount + marginAmount).toFixed(2));
  const vatAmount = Number((commercialSubtotal * 0.21).toFixed(2));
  return {
    chapters: ['01 GENERAL'],
    lines: [
      {
        chapter: '01 GENERAL',
        code: 'FALLBACK-GENERAL',
        description: 'Partida base generada por fallback',
        unit: 'ud',
        quantity: 1,
        commercialPrice: commercialSubtotal,
        internalCost,
        laborHours: Number(((input.area || 0) * 0.2).toFixed(2)),
        laborCost: Number((internalCost * 0.35).toFixed(2)),
        materialCost: Number((internalCost * 0.45).toFixed(2)),
        associatedCost: Number((internalCost * 0.2).toFixed(2)),
        kind: 'DIRECT',
        source: 'FALLBACK',
        typologyCode: null,
        standardActivityCode: null,
        productivityRateName: null,
        measurementRule: null,
        pricingRule: null,
        appliedAssumptions: {
          fallbackReason: 'No se encontro tipologia maestra o no genero lineas utilizables.',
          area: input.area,
          workType: input.workType,
          siteType: input.siteType,
          scopeType: input.scopeType,
        },
        economicStatus: buildSprintOneLineEconomicStatus(),
      },
    ],
    summary: {
      materialCost: Number((internalCost * 0.45).toFixed(2)),
      laborCost: Number((internalCost * 0.35).toFixed(2)),
      associatedCost: Number((internalCost * 0.2).toFixed(2)),
      internalCost,
      contingencyAmount,
      marginAmount,
      commercialSubtotal,
      vatAmount,
      commercialTotal: Number((commercialSubtotal + vatAmount).toFixed(2)),
    },
    notes: ['No se encontro maestro tipologico aplicable. Se ha usado un fallback minimo.'],
    structureMode: 'LEGACY_STRUCTURE_BASE',
    legacyCostingMode: 'FALLBACK_PARAMETRIC',
    typologyCode: null,
    source: 'FALLBACK',
    seedVersion: AUTOMATION_SEED_VERSION,
    estimateStatus: buildSprintOneEstimateStatus({ lineCount: 1 }),
  };
}

export async function generateEstimateProposal(input: EstimateGenerationInput): Promise<GeneratedEstimateProposal> {
  const typology = await loadAutomationTypology(input);
  if (!typology) return buildFallbackProposal(input);

  const lines = typology.costItems
    .map((item: any) => buildLineFromMaster(item, input, typology))
    .filter(Boolean) as GeneratedEstimateLine[];

  if (lines.length === 0) return buildFallbackProposal(input);

  const materialCost = Number(lines.reduce((sum, line) => sum + line.materialCost, 0).toFixed(2));
  const laborCost = Number(lines.reduce((sum, line) => sum + line.laborCost, 0).toFixed(2));
  const associatedCost = Number(lines.reduce((sum, line) => sum + line.associatedCost, 0).toFixed(2));
  const internalCost = Number((materialCost + laborCost + associatedCost).toFixed(2));
  const marginAmount = Number((internalCost * 0.18 * Math.max(1, typology.costSensitivity || 1)).toFixed(2));
  const contingency = Number((internalCost * 0.06 * Math.max(1, typology.operationalSensitivity || 1)).toFixed(2));
  const commercialSubtotal = Number((internalCost + contingency + marginAmount).toFixed(2));
  const vatAmount = Number((commercialSubtotal * 0.21).toFixed(2));

  return {
    chapters: Array.from(new Set(lines.map((line) => line.chapter))),
    lines,
    summary: {
      materialCost,
      laborCost,
      associatedCost,
      internalCost,
      contingencyAmount: contingency,
      marginAmount,
      commercialSubtotal,
      vatAmount,
      commercialTotal: Number((commercialSubtotal + vatAmount).toFixed(2)),
    },
    notes: [
      `Tipologia aplicada: ${typology.name}`,
      'La estructura base se ha generado desde maestros tipologicos, partidas maestras y rendimientos reutilizables.',
    ],
    structureMode: 'LEGACY_STRUCTURE_BASE',
    legacyCostingMode: 'MASTER_PARAMETRIC',
    typologyCode: typology.code,
    source: 'MASTER',
    seedVersion: AUTOMATION_SEED_VERSION,
    estimateStatus: buildSprintOneEstimateStatus({ lineCount: lines.length }),
  };
}
