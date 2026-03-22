import type { RecipeMaterialCode } from '@/lib/estimate/recipe-types';
import type { PriceSource, PriceStatus } from '@/lib/estimate/pricing-types';
import { chooseSupplierOffer } from './sourcing';
import type { ProjectSourcingPolicy, SourcingFamily, SourcingStrategy } from './sourcing-policy';
import { sourcingFamilyFromMaterialCode } from './sourcing-policy';

export type SourcingSelectionReasonCode =
  | 'SELECTION_CHEAPEST'
  | 'SELECTION_FASTEST'
  | 'SELECTION_PREFERRED_MATCH'
  | 'SELECTION_BALANCED_SCORE'
  | 'SELECTION_MANUAL_OVERRIDE'
  | 'SELECTION_FALLBACK_PREFERRED_REFERENCE'
  | 'SELECTION_FALLBACK_CATALOG_REFERENCE'
  | 'SELECTION_FALLBACK_PARAMETRIC_REFERENCE'
  | 'SELECTION_MISSING';

export type SourcingFilterReasonCode =
  | 'DISCARDED_NOT_ALLOWED_SUPPLIER'
  | 'DISCARDED_NOT_PREFERRED'
  | 'DISCARDED_LEAD_TIME_EXCEEDED'
  | 'DISCARDED_ZONE_MISMATCH'
  | 'DISCARDED_NO_ACTIVE_OFFER';

export type SourcingOfferSummary = {
  offerId: string;
  supplierId: string;
  supplierName?: string | null;
  unitCost: number;
  unit: string;
  leadTimeDays: number | null;
  isPreferred: boolean;
};

export type DiscardedOfferSummary = SourcingOfferSummary & {
  filterReasonCodes: SourcingFilterReasonCode[];
};

export type OfferLookupRecord = {
  id: string;
  supplierId: string;
  unitCost: number;
  unit: string;
  leadTimeDays: number | null;
  isPreferred?: boolean | null;
  validFrom?: Date | string | null;
  validUntil?: Date | string | null;
  status?: string | null;
  supplier?: { id: string; name: string; address?: string | null } | null;
};

export type MaterialBindingLike = {
  procurementMaterialCode?: string;
  preferredSupplierName?: string;
  preferredUnitCost?: number;
  catalogReferenceUnitCost?: number;
  parametricReferenceUnitCost?: number;
};

export type MaterialLookupRecord = {
  id: string;
  code: string;
  offers: OfferLookupRecord[];
};

export type MaterialSourcingResolution = {
  procurementMaterialCode?: string | null;
  sourcingFamily: SourcingFamily;
  strategyUsed: SourcingStrategy;
  supplierId?: string;
  supplierName?: string | null;
  supplierOfferId?: string;
  unitCost?: number | null;
  priceSource: PriceSource;
  priceStatus: PriceStatus;
  leadTimeDays?: number | null;
  candidateOfferCount: number;
  eligibleOfferCount: number;
  selectionReasonCode: SourcingSelectionReasonCode;
  filterReasonCodes: SourcingFilterReasonCode[];
  selectedOffer?: SourcingOfferSummary | null;
  candidateOffersSummary: SourcingOfferSummary[];
  eligibleOffersSummary: SourcingOfferSummary[];
  discardedOffersSummary: DiscardedOfferSummary[];
  sourcingPolicySnapshotApplied: ProjectSourcingPolicy;
  reason: string;
  warnings: string[];
};

function isValidCost(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isOfferActive(
  offer: OfferLookupRecord,
  referenceDate: Date,
) {
  if (offer.status && offer.status !== 'ACTIVA') return false;
  const from = offer.validFrom ? new Date(offer.validFrom) : null;
  const until = offer.validUntil ? new Date(offer.validUntil) : null;
  if (from && from.getTime() > referenceDate.getTime()) return false;
  if (until && until.getTime() < referenceDate.getTime()) return false;
  return true;
}

function summarizeOffer(offer: OfferLookupRecord): SourcingOfferSummary {
  return {
    offerId: offer.id,
    supplierId: offer.supplierId,
    supplierName: offer.supplier?.name || null,
    unitCost: offer.unitCost,
    unit: offer.unit,
    leadTimeDays: offer.leadTimeDays,
    isPreferred: Boolean(offer.isPreferred),
  };
}

function selectionReasonCodeForStrategy(strategy: SourcingStrategy): SourcingSelectionReasonCode {
  switch (strategy) {
    case 'CHEAPEST':
      return 'SELECTION_CHEAPEST';
    case 'FASTEST':
      return 'SELECTION_FASTEST';
    case 'PREFERRED':
      return 'SELECTION_PREFERRED_MATCH';
    case 'BALANCED':
    default:
      return 'SELECTION_BALANCED_SCORE';
  }
}

export function resolveRecipeMaterialSourcing(params: {
  materialCode: RecipeMaterialCode;
  binding?: MaterialBindingLike | null;
  materialLookup?: MaterialLookupRecord | null;
  preferredSuppliers?: Record<string, { id: string; name: string }>;
  policy: ProjectSourcingPolicy;
  referenceDate?: Date;
}) : MaterialSourcingResolution {
  const binding = params.binding || null;
  const materialLookup = params.materialLookup || null;
  const referenceDate = params.referenceDate || new Date();
  const procurementMaterialCode = binding?.procurementMaterialCode || null;
  const sourcingFamily = sourcingFamilyFromMaterialCode(procurementMaterialCode);
  const strategyUsed = params.policy.strategy;
  const familyPreferredSuppliers =
    params.policy.preferredSuppliersByFamily?.[sourcingFamily] || [];
  const useOnlyPreferred =
    params.policy.useOnlyPreferredSuppliers ||
    params.policy.useOnlyPreferredByFamily?.[sourcingFamily] ||
    false;
  const activeOffers = (materialLookup?.offers || []).filter((offer) =>
    isOfferActive(offer, referenceDate),
  );
  const inactiveOffers = (materialLookup?.offers || [])
    .filter((offer) => !isOfferActive(offer, referenceDate))
    .map((offer) => ({
      ...summarizeOffer(offer),
      filterReasonCodes: ['DISCARDED_NO_ACTIVE_OFFER'] as SourcingFilterReasonCode[],
    }));

  const discardedEligibleOffers: DiscardedOfferSummary[] = [];
  const eligibleOffers = activeOffers.filter((offer) => {
    const reasons: SourcingFilterReasonCode[] = [];
    if (
      params.policy.allowedSupplierIds?.length &&
      !params.policy.allowedSupplierIds.includes(offer.supplierId)
    ) {
      reasons.push('DISCARDED_NOT_ALLOWED_SUPPLIER');
    }
    if (
      params.policy.allowedSupplierNames?.length &&
      !params.policy.allowedSupplierNames.includes(offer.supplier?.name || '')
    ) {
      reasons.push('DISCARDED_NOT_ALLOWED_SUPPLIER');
    }
    if (
      typeof params.policy.maxLeadTimeDays === 'number' &&
      Number.isFinite(params.policy.maxLeadTimeDays) &&
      typeof offer.leadTimeDays === 'number' &&
      offer.leadTimeDays > params.policy.maxLeadTimeDays
    ) {
      reasons.push('DISCARDED_LEAD_TIME_EXCEEDED');
    }
    if (
      params.policy.zoneHint &&
      offer.supplier?.address &&
      !offer.supplier.address.toLowerCase().includes(params.policy.zoneHint.toLowerCase())
    ) {
      reasons.push('DISCARDED_ZONE_MISMATCH');
    }
    if (useOnlyPreferred && familyPreferredSuppliers.length > 0) {
      if (!familyPreferredSuppliers.includes(offer.supplier?.name || '')) {
        reasons.push('DISCARDED_NOT_PREFERRED');
      }
    }

    if (reasons.length > 0) {
      discardedEligibleOffers.push({
        ...summarizeOffer(offer),
        filterReasonCodes: Array.from(new Set(reasons)),
      });
      return false;
    }
    return true;
  });

  const preferredFamilyOffers =
    familyPreferredSuppliers.length > 0
      ? eligibleOffers.filter((offer) =>
          familyPreferredSuppliers.includes(offer.supplier?.name || ''),
        )
      : [];

  const selectionPool =
    strategyUsed === 'PREFERRED' && preferredFamilyOffers.length > 0
      ? preferredFamilyOffers
      : eligibleOffers;
  const candidateOffersSummary = activeOffers.map(summarizeOffer);
  const eligibleOffersSummary = selectionPool.map(summarizeOffer);
  const discardedOffersSummary = [...discardedEligibleOffers, ...inactiveOffers];
  const filterReasonCodes = Array.from(
    new Set(discardedOffersSummary.flatMap((offer) => offer.filterReasonCodes)),
  );

  if (procurementMaterialCode && selectionPool.length > 0) {
    const chosen = chooseSupplierOffer(
      selectionPool,
      null,
      strategyUsed,
      referenceDate,
    );
    if (chosen.offer && isValidCost(chosen.offer.unitCost)) {
      return {
        procurementMaterialCode,
        sourcingFamily,
        strategyUsed,
        supplierId: chosen.offer.supplier?.id,
        supplierName: chosen.offer.supplier?.name || null,
        supplierOfferId: chosen.offer.id,
        unitCost: chosen.offer.unitCost,
        priceSource: 'SUPPLIER_OFFER',
        priceStatus: 'PRICE_CONFIRMED',
        leadTimeDays: chosen.offer.leadTimeDays,
        candidateOfferCount: activeOffers.length,
        eligibleOfferCount: selectionPool.length,
        selectionReasonCode:
          strategyUsed === 'PREFERRED' && preferredFamilyOffers.length > 0
            ? 'SELECTION_PREFERRED_MATCH'
            : selectionReasonCodeForStrategy(strategyUsed),
        filterReasonCodes,
        selectedOffer: {
          offerId: chosen.offer.id,
          supplierId: chosen.offer.supplier?.id || '',
          supplierName: chosen.offer.supplier?.name || null,
          unitCost: chosen.offer.unitCost,
          unit: chosen.offer.unit,
          leadTimeDays: chosen.offer.leadTimeDays,
          isPreferred: Boolean(chosen.offer.isPreferred),
        },
        candidateOffersSummary,
        eligibleOffersSummary,
        discardedOffersSummary,
        sourcingPolicySnapshotApplied: params.policy,
        reason:
          strategyUsed === 'PREFERRED' && preferredFamilyOffers.length > 0
            ? `${chosen.reason} Se prioriza proveedor preferido de familia ${sourcingFamily}.`
            : chosen.reason,
        warnings: [],
      };
    }
  }

  if (binding?.preferredSupplierName && isValidCost(binding.preferredUnitCost)) {
    const supplier = params.preferredSuppliers?.[binding.preferredSupplierName];
    return {
      procurementMaterialCode,
      sourcingFamily,
      strategyUsed,
      supplierId: supplier?.id,
      supplierName: binding.preferredSupplierName,
      supplierOfferId: undefined,
      unitCost: binding.preferredUnitCost || null,
      priceSource: 'PREFERRED_SUPPLIER',
      priceStatus: 'PRICE_INFERRED',
      leadTimeDays: null,
      candidateOfferCount: activeOffers.length,
      eligibleOfferCount: selectionPool.length,
      selectionReasonCode: 'SELECTION_FALLBACK_PREFERRED_REFERENCE',
      filterReasonCodes,
      selectedOffer: null,
      candidateOffersSummary,
      eligibleOffersSummary,
      discardedOffersSummary,
      sourcingPolicySnapshotApplied: params.policy,
      reason: `Sin oferta real elegible. Se usa proveedor preferido de referencia para ${sourcingFamily}.`,
      warnings: activeOffers.length > 0 ? ['No hay oferta elegible segun politica de obra; se usa referencia preferida.'] : [],
    };
  }

  if (isValidCost(binding?.catalogReferenceUnitCost)) {
    return {
      procurementMaterialCode,
      sourcingFamily,
      strategyUsed,
      unitCost: binding?.catalogReferenceUnitCost || null,
      priceSource: 'CATALOG_REFERENCE',
      priceStatus: 'PRICE_INFERRED',
      leadTimeDays: null,
      candidateOfferCount: activeOffers.length,
      eligibleOfferCount: selectionPool.length,
      selectionReasonCode: 'SELECTION_FALLBACK_CATALOG_REFERENCE',
      filterReasonCodes,
      selectedOffer: null,
      candidateOffersSummary,
      eligibleOffersSummary,
      discardedOffersSummary,
      sourcingPolicySnapshotApplied: params.policy,
      reason: procurementMaterialCode
        ? 'Sin oferta real elegible; se usa referencia de catalogo interno.'
        : 'Material sin binding de procurement suficiente; se usa referencia de catalogo.',
      warnings: activeOffers.length > 0 ? ['Las ofertas existentes no cumplen la politica activa; se cae a catalogo.'] : [],
    };
  }

  if (isValidCost(binding?.parametricReferenceUnitCost)) {
    return {
      procurementMaterialCode,
      sourcingFamily,
      strategyUsed,
      unitCost: binding?.parametricReferenceUnitCost || null,
      priceSource: 'PARAMETRIC_REFERENCE',
      priceStatus: 'PRICE_INFERRED',
      leadTimeDays: null,
      candidateOfferCount: activeOffers.length,
      eligibleOfferCount: selectionPool.length,
      selectionReasonCode: 'SELECTION_FALLBACK_PARAMETRIC_REFERENCE',
      filterReasonCodes,
      selectedOffer: null,
      candidateOffersSummary,
      eligibleOffersSummary,
      discardedOffersSummary,
      sourcingPolicySnapshotApplied: params.policy,
      reason: 'No existe oferta real suficiente y no hay referencia de catalogo fiable; se usa referencia parametrica.',
      warnings: ['Pricing apoyado en referencia parametrica por falta de sourcing real suficiente.'],
    };
  }

  return {
    procurementMaterialCode,
    sourcingFamily,
    strategyUsed,
    unitCost: null,
    priceSource: 'MISSING',
    priceStatus: 'PRICE_PENDING_VALIDATION',
    leadTimeDays: null,
    candidateOfferCount: activeOffers.length,
    eligibleOfferCount: selectionPool.length,
    selectionReasonCode: 'SELECTION_MISSING',
    filterReasonCodes,
    selectedOffer: null,
    candidateOffersSummary,
    eligibleOffersSummary,
    discardedOffersSummary,
    sourcingPolicySnapshotApplied: params.policy,
    reason: 'No existe oferta ni referencia suficiente para valorar el material.',
    warnings: ['Material sin oferta real ni referencia fiable.'],
  };
}
