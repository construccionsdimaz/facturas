import type { RecipeMaterialCode } from '@/lib/estimate/recipe-types';
import type { PriceSource, PriceStatus } from '@/lib/estimate/pricing-types';
import { chooseSupplierOffer } from './sourcing';
import type { ProjectSourcingPolicy, SourcingFamily, SourcingStrategy } from './sourcing-policy';
import { sourcingFamilyFromMaterialCode } from './sourcing-policy';

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

  const candidateOffers = (materialLookup?.offers || []).filter((offer) =>
    isOfferActive(offer, referenceDate),
  );

  const eligibleOffers = candidateOffers.filter((offer) => {
    if (
      params.policy.allowedSupplierIds?.length &&
      !params.policy.allowedSupplierIds.includes(offer.supplierId)
    ) {
      return false;
    }
    if (
      params.policy.allowedSupplierNames?.length &&
      !params.policy.allowedSupplierNames.includes(offer.supplier?.name || '')
    ) {
      return false;
    }
    if (
      typeof params.policy.maxLeadTimeDays === 'number' &&
      Number.isFinite(params.policy.maxLeadTimeDays) &&
      typeof offer.leadTimeDays === 'number' &&
      offer.leadTimeDays > params.policy.maxLeadTimeDays
    ) {
      return false;
    }
    if (
      params.policy.zoneHint &&
      offer.supplier?.address &&
      !offer.supplier.address.toLowerCase().includes(params.policy.zoneHint.toLowerCase())
    ) {
      return false;
    }
    if (useOnlyPreferred && familyPreferredSuppliers.length > 0) {
      return familyPreferredSuppliers.includes(offer.supplier?.name || '');
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
        candidateOfferCount: candidateOffers.length,
        eligibleOfferCount: selectionPool.length,
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
      candidateOfferCount: candidateOffers.length,
      eligibleOfferCount: selectionPool.length,
      reason: `Sin oferta real elegible. Se usa proveedor preferido de referencia para ${sourcingFamily}.`,
      warnings: candidateOffers.length > 0 ? ['No hay oferta elegible segun politica de obra; se usa referencia preferida.'] : [],
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
      candidateOfferCount: candidateOffers.length,
      eligibleOfferCount: selectionPool.length,
      reason: procurementMaterialCode
        ? 'Sin oferta real elegible; se usa referencia de catalogo interno.'
        : 'Material sin binding de procurement suficiente; se usa referencia de catalogo.',
      warnings: candidateOffers.length > 0 ? ['Las ofertas existentes no cumplen la politica activa; se cae a catalogo.'] : [],
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
      candidateOfferCount: candidateOffers.length,
      eligibleOfferCount: selectionPool.length,
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
    candidateOfferCount: candidateOffers.length,
    eligibleOfferCount: selectionPool.length,
    reason: 'No existe oferta ni referencia suficiente para valorar el material.',
    warnings: ['Material sin oferta real ni referencia fiable.'],
  };
}
