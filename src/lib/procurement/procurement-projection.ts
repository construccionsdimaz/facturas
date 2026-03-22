import type { ExecutionContext } from '@/lib/discovery/types';
import type { RecipeResult, RecipeMaterialCode, RecipeLine } from '@/lib/estimate/recipe-types';
import type {
  PricingResult,
  PricingLine,
  PriceSource,
  PriceStatus,
} from '@/lib/estimate/pricing-types';
import { MATERIAL_BINDINGS } from '@/lib/estimate/pricing-engine';
import { ensureProcurementCatalog } from './catalog';
import { buildDiscoverySupplyHints, type DiscoverySupplyHint } from './discovery-context';
import { chooseSupplierOffer } from './sourcing';
import type { ProjectSourcingPolicy, SourcingStrategy } from './sourcing-policy';
import type {
  DiscardedOfferSummary,
  SourcingFilterReasonCode,
  SourcingOfferSummary,
  SourcingSelectionReasonCode,
} from './material-resolution';

type ProcurementProjectionSource = 'RECIPE_DRIVEN' | 'HYBRID' | 'DISCOVERY_HINTS';

type ProcurementLineGeneratedFrom =
  | 'RECIPE'
  | 'DISCOVERY_HINT'
  | 'LEGACY_ACTIVITY_FALLBACK';

type ProcurementPlanningLinkage = {
  projectActivityId?: string | null;
  locationId?: string | null;
  wbsId?: string | null;
  requiredOnSiteDate?: string | null;
};

type ProjectActivityMaterialTemplateInput = {
  materialId: string;
  unit?: string | null;
  criticality?: string | null;
  material: {
    id: string;
    code?: string | null;
    name: string;
    category: string;
    baseUnit: string;
    offers?: Array<{
      id: string;
      supplierId: string;
      unitCost: number;
      unit: string;
      leadTimeDays: number | null;
      isPreferred?: boolean | null;
      supplier?: { id: string; name: string } | null;
    }>;
  };
};

type ProjectActivityInput = {
  id: string;
  name: string;
  code?: string | null;
  locationId?: string | null;
  wbsId?: string | null;
  plannedStartDate?: Date | string | null;
  plannedEndDate?: Date | string | null;
  originCostItemCode?: string | null;
  standardActivity?: {
    code?: string | null;
    materialTemplates?: ProjectActivityMaterialTemplateInput[];
  } | null;
};

export type ProcurementProjectionLine = {
  id: string;
  materialCode: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost?: number | null;
  expectedTotalCost?: number | null;
  requiredBySpaceIds: string[];
  supportedRecipeLineIds: string[];
  supportedPricingLineIds: string[];
  supportedSolutionCodes: string[];
  supplierId?: string;
  supplierName?: string | null;
  supplierOfferId?: string;
  materialId?: string | null;
  priceStatus?: PriceStatus | null;
  priceSource?: PriceSource | 'DISCOVERY_HINT' | 'ACTIVITY_FALLBACK' | null;
  sourcingStrategy?: SourcingStrategy | null;
  sourcingReason?: string | null;
  selectionReasonCode?: SourcingSelectionReasonCode | null;
  filterReasonCodes: SourcingFilterReasonCode[];
  candidateOfferCount: number;
  eligibleOfferCount: number;
  selectedOffer?: SourcingOfferSummary | null;
  candidateOffersSummary: SourcingOfferSummary[];
  eligibleOffersSummary: SourcingOfferSummary[];
  discardedOffersSummary: DiscardedOfferSummary[];
  sourcingPolicySnapshotApplied?: ProjectSourcingPolicy | null;
  generatedFrom: ProcurementLineGeneratedFrom;
  requiredOnSiteDate?: string | null;
  planningLinkage?: ProcurementPlanningLinkage | null;
  assumptions: string[];
  warnings: string[];
};

export type ProcurementProjection = {
  source: ProcurementProjectionSource;
  executionContext: Pick<
    ExecutionContext,
    'project' | 'resolvedSpaces' | 'resolvedSpecs' | 'inclusions'
  > | null;
  recipeLines: RecipeLine[];
  pricingLines: PricingLine[];
  supplyHints: DiscoverySupplyHint[];
  procurementLines: ProcurementProjectionLine[];
  coverage: {
    recipeDrivenLines: number;
    hintLines: number;
    activityFallbackLines: number;
    supplierLinkedLines: number;
    offerLinkedLines: number;
  };
  warnings: string[];
  assumptions: string[];
};

type ProcurementProjectionInput = {
  executionContext?: ExecutionContext | null;
  recipeResult?: RecipeResult | null;
  pricingResult?: PricingResult | null;
  includeDiscoveryHints?: boolean;
  referenceDate?: Date;
  projectActivities?: ProjectActivityInput[];
  sourcingPolicy?: ProjectSourcingPolicy;
  materialLookupOverride?: Record<string, MaterialLookupRecord>;
};

type MaterialLookupRecord = {
  id: string;
  code: string;
  name: string;
  category: string;
  baseUnit: string;
  offers: Array<{
    id: string;
    supplierId: string;
    unitCost: number;
    unit: string;
    leadTimeDays: number | null;
    isPreferred?: boolean | null;
    supplier?: { id: string; name: string } | null;
  }>;
};

function round(value: number) {
  return Number(value.toFixed(2));
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function solutionFamily(solutionCode?: string | null) {
  const value = solutionCode || '';
  if (value.startsWith('ROOM_')) return 'ROOMS';
  if (value.startsWith('BATH_')) return 'BATHS';
  if (value.startsWith('KITCHENETTE_')) return 'KITCHENETTES';
  if (value.startsWith('LEVELING_')) return 'LEVELING';
  if (value.startsWith('COMMON_AREA_')) return 'COMMON_AREAS';
  if (value.startsWith('WALL_TILE_') || value.startsWith('PAINT_') || value.startsWith('WET_AREA_')) return 'WALL_FINISHES';
  if (value.startsWith('PARTITION_')) return 'PARTITIONS';
  if (value.startsWith('CEILING_')) return 'CEILINGS';
  if (value.startsWith('FLOOR_') || value === 'SKIRTING_STD') return 'FLOORING';
  if (value.startsWith('DOOR_') || value.startsWith('WINDOW_') || value.startsWith('SHUTTER_')) return 'CARPENTRY';
  if (value.startsWith('ELECTRICAL_') || value.startsWith('LIGHTING_') || value.startsWith('PLUMBING_') || value.startsWith('DRAINAGE_')) return 'BASIC_MEP';
  return 'OTHER';
}

function hintFamily(hint: DiscoverySupplyHint) {
  switch (hint.category) {
    case 'BANOS':
      return 'BATHS';
    case 'COCINA':
      return 'KITCHENETTES';
    case 'ACABADOS':
      return 'LEVELING';
    default:
      return 'OTHER';
  }
}

function inferHintMaterialCode(hint: DiscoverySupplyHint) {
  switch (hint.category) {
    case 'BANOS':
      return 'INS-SAN-STD';
    case 'ACABADOS':
      return 'ACA-PORC';
    default:
      return `HINT:${hint.category}`;
  }
}

function inferActivityFamily(activity: ProjectActivityInput) {
  const origin = (activity?.originCostItemCode || '').toUpperCase();
  const text = `${activity?.name || ''} ${activity?.code || ''} ${activity?.standardActivity?.code || ''}`.toLowerCase();
  if (origin.includes('BANO') || /ba(?:n|ñ)o/.test(text)) return 'BATHS';
  if (origin.includes('COCINA') || /kitchen|cocina/.test(text)) return 'KITCHENETTES';
  if (origin.includes('PAVIMENT') || /nivel|paviment|mortero/.test(text)) return 'LEVELING';
  if (origin.includes('ZONAS') || /com[uú]n/.test(text)) return 'COMMON_AREAS';
  if (origin.includes('HAB') || /habitaci[oó]n|room/.test(text)) return 'ROOMS';
  return 'OTHER';
}

function findPlanningLinkage(
  family: string,
  activities: ProjectActivityInput[] | undefined,
): ProcurementPlanningLinkage | null {
  if (!activities?.length) return null;
  const matches = activities
    .filter((activity) => inferActivityFamily(activity) === family)
    .sort((a, b) => {
      const left = a.plannedStartDate ? new Date(a.plannedStartDate).getTime() : Number.MAX_SAFE_INTEGER;
      const right = b.plannedStartDate ? new Date(b.plannedStartDate).getTime() : Number.MAX_SAFE_INTEGER;
      return left - right;
    });

  if (matches.length === 0) return null;
  const activity = matches[0];
  return {
    projectActivityId: activity.id,
    locationId: activity.locationId || null,
    wbsId: activity.wbsId || null,
    requiredOnSiteDate: activity.plannedStartDate ? new Date(activity.plannedStartDate).toISOString() : null,
  };
}

async function loadMaterialLookup(codes: string[]) {
  const uniqueCodes = unique(codes.filter(Boolean));
  if (uniqueCodes.length === 0) return {} as Record<string, MaterialLookupRecord>;

  await ensureProcurementCatalog();

  const { db } = await import('@/lib/db');
  const materials = await db.material.findMany({
    where: { code: { in: uniqueCodes } },
    include: {
      offers: {
        where: { status: 'ACTIVA', isActive: true },
        include: {
          supplier: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  return Object.fromEntries(
    materials.map((material) => [
      material.code || '',
      {
        id: material.id,
        code: material.code || '',
        name: material.name,
        category: material.category,
        baseUnit: material.baseUnit,
        offers: material.offers.map((offer) => ({
          id: offer.id,
          supplierId: offer.supplierId,
          unitCost: offer.unitCost,
          unit: offer.unit,
          leadTimeDays: offer.leadTimeDays,
          isPreferred: offer.isPreferred,
          supplier: offer.supplier ? { id: offer.supplier.id, name: offer.supplier.name } : null,
        })),
      },
    ]),
  );
}

function collectLookupCodes(
  recipeResult: RecipeResult | null,
  hints: DiscoverySupplyHint[],
  activities: ProjectActivityInput[] | undefined,
) {
  const codes: string[] = [];

  for (const recipeLine of recipeResult?.lines || []) {
    for (const material of recipeLine.materials) {
      const binding = MATERIAL_BINDINGS[material.materialCode as RecipeMaterialCode];
      if (binding?.procurementMaterialCode) codes.push(binding.procurementMaterialCode);
    }
  }

  for (const hint of hints) {
    const hintCode = inferHintMaterialCode(hint);
    if (!hintCode.startsWith('HINT:')) codes.push(hintCode);
  }

  for (const activity of activities || []) {
    for (const template of activity.standardActivity?.materialTemplates || []) {
      if (template.material.code) codes.push(template.material.code);
    }
  }

  return codes;
}

function projectionLineKey(params: {
  materialCode: string;
  unit: string;
  supplierId?: string;
  supplierOfferId?: string;
  generatedFrom: ProcurementLineGeneratedFrom;
}) {
  return [
    params.materialCode,
    params.unit,
    params.supplierId || '',
    params.supplierOfferId || '',
    params.generatedFrom,
  ].join('|');
}

function mergeProjectionLine(target: ProcurementProjectionLine, incoming: ProcurementProjectionLine) {
  target.quantity = round(target.quantity + incoming.quantity);
  target.requiredBySpaceIds = unique([...target.requiredBySpaceIds, ...incoming.requiredBySpaceIds]);
  target.supportedRecipeLineIds = unique([...target.supportedRecipeLineIds, ...incoming.supportedRecipeLineIds]);
  target.supportedPricingLineIds = unique([...target.supportedPricingLineIds, ...incoming.supportedPricingLineIds]);
  target.supportedSolutionCodes = unique([...target.supportedSolutionCodes, ...incoming.supportedSolutionCodes]);
  target.assumptions = unique([...target.assumptions, ...incoming.assumptions]);
  target.warnings = unique([...target.warnings, ...incoming.warnings]);
  target.filterReasonCodes = unique([...target.filterReasonCodes, ...incoming.filterReasonCodes]);
  target.candidateOfferCount = Math.max(target.candidateOfferCount, incoming.candidateOfferCount);
  target.eligibleOfferCount = Math.max(target.eligibleOfferCount, incoming.eligibleOfferCount);
  target.candidateOffersSummary = unique([
    ...target.candidateOffersSummary.map((offer) => JSON.stringify(offer)),
    ...incoming.candidateOffersSummary.map((offer) => JSON.stringify(offer)),
  ]).map((value) => JSON.parse(value));
  target.eligibleOffersSummary = unique([
    ...target.eligibleOffersSummary.map((offer) => JSON.stringify(offer)),
    ...incoming.eligibleOffersSummary.map((offer) => JSON.stringify(offer)),
  ]).map((value) => JSON.parse(value));
  target.discardedOffersSummary = unique([
    ...target.discardedOffersSummary.map((offer) => JSON.stringify(offer)),
    ...incoming.discardedOffersSummary.map((offer) => JSON.stringify(offer)),
  ]).map((value) => JSON.parse(value));

  const currentDate = target.requiredOnSiteDate ? new Date(target.requiredOnSiteDate).getTime() : Number.MAX_SAFE_INTEGER;
  const incomingDate = incoming.requiredOnSiteDate ? new Date(incoming.requiredOnSiteDate).getTime() : Number.MAX_SAFE_INTEGER;
  if (incomingDate < currentDate) {
    target.requiredOnSiteDate = incoming.requiredOnSiteDate;
    target.planningLinkage = incoming.planningLinkage || target.planningLinkage;
  }
}

function activityFallbackLine(
  activity: ProjectActivityInput,
  materialLookup: Record<string, MaterialLookupRecord>,
  referenceDate: Date,
  sourcingStrategy: SourcingStrategy,
) {
  return (activity.standardActivity?.materialTemplates || []).map((template, index) => {
    const code = template.material.code || `ACTIVITY:${template.materialId}`;
    const lookup = materialLookup[code];
    const linkage = {
      projectActivityId: activity.id,
      locationId: activity.locationId || null,
      wbsId: activity.wbsId || null,
      requiredOnSiteDate: activity.plannedStartDate ? new Date(activity.plannedStartDate).toISOString() : null,
    };
    const suggestion = lookup?.offers?.length
      ? chooseSupplierOffer(lookup.offers, linkage.requiredOnSiteDate, sourcingStrategy, referenceDate)
      : { offer: null };
    const unit = template.unit || lookup?.baseUnit || template.material.baseUnit || 'ud';

    return {
      id: `legacy-activity:${activity.id}:${index}`,
      materialCode: code,
      description: lookup?.name || template.material.name,
      quantity: 1,
      unit,
      unitCost: suggestion.offer?.unitCost ?? null,
      expectedTotalCost: suggestion.offer?.unitCost ? round(suggestion.offer.unitCost) : null,
      requiredBySpaceIds: [],
      supportedRecipeLineIds: [],
      supportedPricingLineIds: [],
      supportedSolutionCodes: [],
      supplierId: suggestion.offer?.supplier?.id,
      supplierName: suggestion.offer?.supplier?.name || null,
      supplierOfferId: suggestion.offer?.id,
      materialId: lookup?.id || template.material.id,
      priceStatus: suggestion.offer ? 'PRICE_CONFIRMED' : 'PRICE_PENDING_VALIDATION',
      priceSource: suggestion.offer ? 'SUPPLIER_OFFER' : 'ACTIVITY_FALLBACK',
      sourcingStrategy,
      sourcingReason: suggestion.offer ? suggestion.reason : 'Fallback legacy de actividad sin oferta real.',
      selectionReasonCode: suggestion.offer ? 'SELECTION_BALANCED_SCORE' : 'SELECTION_MISSING',
      filterReasonCodes: [],
      candidateOfferCount: lookup?.offers?.length || 0,
      eligibleOfferCount: suggestion.offer ? 1 : 0,
      selectedOffer: suggestion.offer
        ? {
            offerId: suggestion.offer.id,
            supplierId: suggestion.offer.supplier?.id || '',
            supplierName: suggestion.offer.supplier?.name || null,
            unitCost: suggestion.offer.unitCost,
            unit: suggestion.offer.unit,
            leadTimeDays: suggestion.offer.leadTimeDays,
            isPreferred: Boolean(suggestion.offer.isPreferred),
          }
        : null,
      candidateOffersSummary: [],
      eligibleOffersSummary: [],
      discardedOffersSummary: [],
      sourcingPolicySnapshotApplied: null,
      generatedFrom: 'LEGACY_ACTIVITY_FALLBACK',
      requiredOnSiteDate: linkage.requiredOnSiteDate,
      planningLinkage: linkage,
      assumptions: ['Necesidad material inferida desde plantilla legacy de actividad.'],
      warnings: suggestion.offer ? [] : [`Sin oferta activa para ${lookup?.name || template.material.name}.`],
    } satisfies ProcurementProjectionLine;
  });
}

export async function buildProcurementProjection(
  input: ProcurementProjectionInput,
): Promise<ProcurementProjection> {
  const executionContext = input.executionContext || null;
  const recipeResult = input.recipeResult || null;
  const pricingResult = input.pricingResult || null;
  const includeDiscoveryHints = input.includeDiscoveryHints !== false;
  const referenceDate = input.referenceDate || new Date();
  const supplyHints = includeDiscoveryHints && executionContext
    ? buildDiscoverySupplyHints(executionContext)
    : [];

  const warnings = unique([
    ...(recipeResult?.warnings || []),
    ...(pricingResult?.warnings || []),
  ]);
  const assumptions = unique([
    ...(recipeResult?.assumptions || []),
    ...(pricingResult?.assumptions || []),
  ]);
  let materialLookup = input.materialLookupOverride || ({} as Record<string, MaterialLookupRecord>);
  if (!input.materialLookupOverride) {
    try {
      materialLookup = await loadMaterialLookup(
        collectLookupCodes(recipeResult, supplyHints, input.projectActivities),
      );
    } catch (error) {
      warnings.push('No se pudo refrescar el catalogo procurement; se continua con sourcing parcial.');
    }
  }

  const procurementLines = new Map<string, ProcurementProjectionLine>();
  const pricingByRecipeLineId = new Map(
    (pricingResult?.lines || []).map((line) => [line.recipeLineId, line]),
  );
  const recipeCoverageBySpaceFamily = new Set<string>();

  for (const recipeLine of recipeResult?.lines || []) {
    const pricingLine = pricingByRecipeLineId.get(recipeLine.id);
    const family = solutionFamily(recipeLine.solutionCode);
    if (family !== 'OTHER') {
      recipeCoverageBySpaceFamily.add(`${recipeLine.spaceId}:${family}`);
    }

    for (const material of recipeLine.materials) {
      const binding = MATERIAL_BINDINGS[material.materialCode as RecipeMaterialCode];
      const procurementMaterialCode = binding?.procurementMaterialCode || material.materialCode;
      const pricingMaterial = pricingLine?.materialPricing.find(
        (entry) => entry.materialCode === material.materialCode,
      );
      const lookup = materialLookup[procurementMaterialCode];
      const planningLinkage = findPlanningLinkage(family, input.projectActivities);
      const fallbackSuggestion = !pricingMaterial?.supplierOfferId && lookup?.offers?.length
        ? chooseSupplierOffer(
            lookup.offers,
            planningLinkage?.requiredOnSiteDate || null,
            input.sourcingPolicy?.strategy || 'BALANCED',
            referenceDate,
          )
        : { offer: null };

      const line: ProcurementProjectionLine = {
        id: `proc:${recipeLine.id}:${material.materialCode}`,
        materialCode: procurementMaterialCode,
        description: lookup?.name || material.description,
        quantity: round(material.quantity),
        unit: lookup?.baseUnit || material.unit,
        unitCost: pricingMaterial?.unitCost ?? fallbackSuggestion.offer?.unitCost ?? null,
        expectedTotalCost:
          pricingMaterial?.totalCost ??
          (fallbackSuggestion.offer?.unitCost
            ? round(fallbackSuggestion.offer.unitCost * material.quantity)
            : null),
        requiredBySpaceIds: [recipeLine.spaceId],
        supportedRecipeLineIds: [recipeLine.id],
        supportedPricingLineIds: pricingLine ? [pricingLine.id] : [],
        supportedSolutionCodes: [recipeLine.solutionCode],
        supplierId: pricingMaterial?.supplierId || fallbackSuggestion.offer?.supplier?.id,
        supplierName: pricingMaterial?.supplierName || fallbackSuggestion.offer?.supplier?.name || null,
        supplierOfferId: pricingMaterial?.supplierOfferId || fallbackSuggestion.offer?.id,
        materialId: lookup?.id || null,
        priceStatus: pricingMaterial?.priceStatus || (fallbackSuggestion.offer ? 'PRICE_CONFIRMED' : null),
        priceSource: pricingMaterial?.priceSource || (fallbackSuggestion.offer ? 'SUPPLIER_OFFER' : null),
        sourcingStrategy: pricingMaterial?.sourcingStrategy || input.sourcingPolicy?.strategy || 'BALANCED',
        sourcingReason: pricingMaterial?.sourcingReason || (fallbackSuggestion.offer ? fallbackSuggestion.reason : null),
        selectionReasonCode: pricingMaterial?.selectionReasonCode || (fallbackSuggestion.offer ? 'SELECTION_BALANCED_SCORE' : null),
        filterReasonCodes: pricingMaterial?.filterReasonCodes || [],
        candidateOfferCount: pricingMaterial?.candidateOfferCount || lookup?.offers?.length || 0,
        eligibleOfferCount: pricingMaterial?.eligibleOfferCount || (fallbackSuggestion.offer ? 1 : 0),
        selectedOffer: pricingMaterial?.selectedOffer || (fallbackSuggestion.offer
          ? {
              offerId: fallbackSuggestion.offer.id,
              supplierId: fallbackSuggestion.offer.supplier?.id || '',
              supplierName: fallbackSuggestion.offer.supplier?.name || null,
              unitCost: fallbackSuggestion.offer.unitCost,
              unit: fallbackSuggestion.offer.unit,
              leadTimeDays: fallbackSuggestion.offer.leadTimeDays,
              isPreferred: Boolean(fallbackSuggestion.offer.isPreferred),
            }
          : null),
        candidateOffersSummary: pricingMaterial?.candidateOffersSummary || [],
        eligibleOffersSummary: pricingMaterial?.eligibleOffersSummary || [],
        discardedOffersSummary: pricingMaterial?.discardedOffersSummary || [],
        sourcingPolicySnapshotApplied: pricingMaterial?.sourcingPolicySnapshotApplied || input.sourcingPolicy || null,
        generatedFrom: 'RECIPE',
        requiredOnSiteDate: planningLinkage?.requiredOnSiteDate || null,
        planningLinkage,
        assumptions: unique([
          ...recipeLine.assumedFields,
          ...(pricingLine?.assumedFields || []),
        ]),
        warnings: pricingMaterial?.priceStatus === 'PRICE_PENDING_VALIDATION'
          ? [`Precio pendiente de validar para ${material.description}.`]
          : [],
      };

      const key = projectionLineKey({
        materialCode: line.materialCode,
        unit: line.unit,
        supplierId: line.supplierId,
        supplierOfferId: line.supplierOfferId,
        generatedFrom: line.generatedFrom,
      });
      const existing = procurementLines.get(key);
      if (existing) {
        mergeProjectionLine(existing, line);
      } else {
        procurementLines.set(key, line);
      }
    }
  }

  for (const hint of supplyHints) {
    const family = hintFamily(hint);
    if (hint.requiredSpaceId && recipeCoverageBySpaceFamily.has(`${hint.requiredSpaceId}:${family}`)) {
      continue;
    }

    const hintCode = inferHintMaterialCode(hint);
    const lookup = materialLookup[hintCode];
    const planningLinkage = findPlanningLinkage(family, input.projectActivities);
    const suggestion = lookup?.offers?.length
      ? chooseSupplierOffer(
          lookup.offers,
          planningLinkage?.requiredOnSiteDate || null,
          input.sourcingPolicy?.strategy || 'BALANCED',
          referenceDate,
        )
      : { offer: null };

    const line: ProcurementProjectionLine = {
      id: `hint:${hint.category}:${hint.requiredSpaceId || 'global'}:${hint.description}`,
      materialCode: hintCode,
      description: lookup?.name || hint.description,
      quantity: round(hint.quantity),
      unit: lookup?.baseUnit || hint.unit,
      unitCost: suggestion.offer?.unitCost ?? null,
      expectedTotalCost: suggestion.offer?.unitCost ? round(suggestion.offer.unitCost * hint.quantity) : null,
      requiredBySpaceIds: hint.requiredSpaceId ? [hint.requiredSpaceId] : [],
      supportedRecipeLineIds: [],
      supportedPricingLineIds: [],
      supportedSolutionCodes: [],
      supplierId: suggestion.offer?.supplier?.id,
      supplierName: suggestion.offer?.supplier?.name || null,
      supplierOfferId: suggestion.offer?.id,
      materialId: lookup?.id || null,
      priceStatus: suggestion.offer ? 'PRICE_CONFIRMED' : null,
      priceSource: suggestion.offer ? 'SUPPLIER_OFFER' : 'DISCOVERY_HINT',
      sourcingStrategy: input.sourcingPolicy?.strategy || 'BALANCED',
      sourcingReason: suggestion.offer ? suggestion.reason : 'Necesidad derivada por discovery hint sin oferta elegible.',
      selectionReasonCode: suggestion.offer ? 'SELECTION_BALANCED_SCORE' : 'SELECTION_MISSING',
      filterReasonCodes: [],
      candidateOfferCount: lookup?.offers?.length || 0,
      eligibleOfferCount: suggestion.offer ? 1 : 0,
      selectedOffer: suggestion.offer
        ? {
            offerId: suggestion.offer.id,
            supplierId: suggestion.offer.supplier?.id || '',
            supplierName: suggestion.offer.supplier?.name || null,
            unitCost: suggestion.offer.unitCost,
            unit: suggestion.offer.unit,
            leadTimeDays: suggestion.offer.leadTimeDays,
            isPreferred: Boolean(suggestion.offer.isPreferred),
          }
        : null,
      candidateOffersSummary: [],
      eligibleOffersSummary: [],
      discardedOffersSummary: [],
      sourcingPolicySnapshotApplied: input.sourcingPolicy || null,
      generatedFrom: 'DISCOVERY_HINT',
      requiredOnSiteDate: planningLinkage?.requiredOnSiteDate || null,
      planningLinkage,
      assumptions: ['Necesidad derivada desde discovery context por falta de recipe demand equivalente.'],
      warnings: suggestion.offer ? [] : [`Suministro por hint sin oferta activa para ${hint.description}.`],
    };

    const key = projectionLineKey({
      materialCode: line.materialCode,
      unit: line.unit,
      supplierId: line.supplierId,
      supplierOfferId: line.supplierOfferId,
      generatedFrom: line.generatedFrom,
    });
    const existing = procurementLines.get(key);
    if (existing) {
      mergeProjectionLine(existing, line);
    } else {
      procurementLines.set(key, line);
    }
  }

  if (procurementLines.size === 0 && input.projectActivities?.length) {
    for (const activity of input.projectActivities) {
      for (const line of activityFallbackLine(
        activity,
        materialLookup,
        referenceDate,
        input.sourcingPolicy?.strategy || 'BALANCED',
      )) {
        const key = projectionLineKey({
          materialCode: line.materialCode,
          unit: line.unit,
          supplierId: line.supplierId,
          supplierOfferId: line.supplierOfferId,
          generatedFrom: line.generatedFrom,
        });
        const existing = procurementLines.get(key);
        if (existing) {
          mergeProjectionLine(existing, line);
        } else {
          procurementLines.set(key, line);
        }
      }
    }
    if (input.projectActivities.length > 0) {
      assumptions.push('Se ha usado fallback legacy de actividades por falta de demanda recipe suficiente.');
    }
  }

  const lines = Array.from(procurementLines.values()).sort((a, b) =>
    a.description.localeCompare(b.description),
  );

  for (const line of lines) {
    warnings.push(...line.warnings);
    assumptions.push(...line.assumptions);
  }

  const recipeDrivenLines = lines.filter((line) => line.generatedFrom === 'RECIPE').length;
  const hintLines = lines.filter((line) => line.generatedFrom === 'DISCOVERY_HINT').length;
  const activityFallbackLines = lines.filter((line) => line.generatedFrom === 'LEGACY_ACTIVITY_FALLBACK').length;
  const supplierLinkedLines = lines.filter((line) => Boolean(line.supplierId)).length;
  const offerLinkedLines = lines.filter((line) => Boolean(line.supplierOfferId)).length;
  const recipeDrivenPendingLines = lines.filter(
    (line) =>
      line.generatedFrom === 'RECIPE' &&
      (!line.supplierId ||
        !line.supplierOfferId ||
        line.priceStatus === 'PRICE_PENDING_VALIDATION'),
  ).length;

  let source: ProcurementProjectionSource = 'DISCOVERY_HINTS';
  if (
    recipeDrivenLines > 0 &&
    hintLines === 0 &&
    activityFallbackLines === 0 &&
    recipeDrivenPendingLines === 0
  ) {
    source = 'RECIPE_DRIVEN';
  } else if (recipeDrivenLines > 0) {
    source = 'HYBRID';
  }

  return {
    source,
    executionContext: executionContext
      ? {
          project: executionContext.project,
          resolvedSpaces: executionContext.resolvedSpaces,
          resolvedSpecs: executionContext.resolvedSpecs,
          inclusions: executionContext.inclusions,
        }
      : null,
    recipeLines: recipeResult?.lines || [],
    pricingLines: pricingResult?.lines || [],
    supplyHints,
    procurementLines: lines,
    coverage: {
      recipeDrivenLines,
      hintLines,
      activityFallbackLines,
      supplierLinkedLines,
      offerLinkedLines,
    },
    warnings: unique(warnings),
    assumptions: unique(assumptions),
  };
}

export function procurementProjectionLineToProjectSupply(
  line: ProcurementProjectionLine,
  projectId: string,
) {
  const originSource =
    line.generatedFrom === 'RECIPE'
      ? 'PROCUREMENT_RECIPE_DRIVEN'
      : line.generatedFrom === 'DISCOVERY_HINT'
        ? 'PROCUREMENT_DISCOVERY_HINT'
        : 'PROCUREMENT_LEGACY_ACTIVITY';

  const observations = [
    `Generado desde procurement projection (${line.generatedFrom}).`,
    line.sourcingReason ? `Sourcing: ${line.sourcingReason}` : null,
    line.selectionReasonCode ? `Selection reason: ${line.selectionReasonCode}.` : null,
    `Offers: ${line.eligibleOfferCount}/${line.candidateOfferCount} elegibles.`,
    line.filterReasonCodes.length ? `Discards: ${line.filterReasonCodes.join(', ')}.` : null,
    line.supportedRecipeLineIds.length
      ? `Recipe lines: ${line.supportedRecipeLineIds.join(', ')}.`
      : null,
    line.supportedPricingLineIds.length
      ? `Pricing lines: ${line.supportedPricingLineIds.join(', ')}.`
      : null,
    line.supportedSolutionCodes.length
      ? `Solutions: ${line.supportedSolutionCodes.join(', ')}.`
      : null,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    projectId,
    description: line.description,
    category: line.materialCode.startsWith('HINT:') ? 'OTROS' : 'MATERIALES',
    originSource,
    materialId: line.materialId || null,
    suggestedSupplierId: line.supplierId || null,
    suggestedSupplierOfferId: line.supplierOfferId || null,
    projectActivityId: line.planningLinkage?.projectActivityId || null,
    locationId: line.planningLinkage?.locationId || null,
    wbsId: line.planningLinkage?.wbsId || null,
    requiredOnSiteDate: line.requiredOnSiteDate ? new Date(line.requiredOnSiteDate) : null,
    leadTimeDays: null,
    priority:
      line.priceStatus === 'PRICE_PENDING_VALIDATION'
        ? 'ALTA'
        : line.generatedFrom === 'RECIPE'
          ? 'CRITICA'
          : 'NORMAL',
    status: 'IDENTIFICADA',
    responsible: 'Compras / Produccion',
    quantity: line.quantity,
    unit: line.unit,
    suggestedUnitCost: line.unitCost ?? null,
    expectedUnitCost: line.unitCost ?? null,
    expectedTotalCost: line.expectedTotalCost ?? null,
    suggestedSupplierReason:
      line.priceSource || line.sourcingReason
        ? [
            `Fuente de precio: ${line.priceSource || 'N/A'}`,
            `Estrategia: ${line.sourcingStrategy || 'N/A'}`,
            line.selectionReasonCode ? `Decision: ${line.selectionReasonCode}` : null,
            `Elegibles: ${line.eligibleOfferCount}/${line.candidateOfferCount}`,
            line.filterReasonCodes.length ? `Descartes: ${line.filterReasonCodes.join(', ')}` : null,
            line.sourcingReason,
          ].filter(Boolean).join(' | ')
        : null,
    scheduleRisk: line.requiredOnSiteDate ? 'PENDIENTE_ANALISIS' : 'SIN_FECHA',
    isCriticalForSchedule: line.generatedFrom === 'RECIPE',
    observations,
  };
}
