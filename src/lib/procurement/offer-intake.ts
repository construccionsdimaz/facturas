import { db } from '@/lib/db';
import { sourcingFamilyFromMaterialCode, type SourcingFamily } from './sourcing-policy';

export type OfferMatchStatus =
  | 'MATCHED_DIRECT'
  | 'MATCHED_BY_CODE'
  | 'MATCHED_BY_NAME_CANDIDATE'
  | 'NEEDS_REVIEW'
  | 'DUPLICATE_SKIPPED';

export type OfferIntakeSource = 'MANUAL' | 'CSV_IMPORT';

export type OfferIntakePayload = {
  supplierId?: string | null;
  supplierName?: string | null;
  materialId?: string | null;
  procurementMaterialCode?: string | null;
  supplierProductName?: string | null;
  supplierProductRef?: string | null;
  warehouseLabel?: string | null;
  unit: string;
  unitCost: number;
  leadTimeDays: number;
  status?: string | null;
  isPreferred?: boolean | null;
  validFrom?: string | Date | null;
  validUntil?: string | Date | null;
  observations?: string | null;
  currency?: string | null;
};

export type OfferIntakeResult = {
  status: OfferMatchStatus | 'CREATED' | 'UPDATED';
  materialId?: string | null;
  procurementMaterialCode?: string | null;
  mappingStatus: OfferMatchStatus;
  mappingReason: string;
  duplicateOfferId?: string | null;
  createdOfferId?: string | null;
};

export type OfferMaterialCandidate = {
  materialId: string;
  materialCode?: string | null;
  materialName: string;
  category: string;
  baseUnit: string;
  confidence: 'HIGH' | 'MEDIUM';
  matchType: 'DIRECT_CODE' | 'NAME_CANDIDATE';
  score: number;
  reason: string;
};

export type OfferDuplicateCandidate = {
  offerId: string;
  supplierId: string;
  supplierName: string;
  materialId?: string | null;
  materialCode?: string | null;
  materialName?: string | null;
  procurementMaterialCode?: string | null;
  supplierProductName?: string | null;
  supplierProductRef?: string | null;
  warehouseLabel?: string | null;
  unit: string;
  unitCost: number;
  leadTimeDays: number;
  isActive: boolean;
  status: string;
  score: number;
  reason: string;
};

export type OfferReviewRow = {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierProductName?: string | null;
  supplierProductRef?: string | null;
  procurementMaterialCode?: string | null;
  warehouseLabel?: string | null;
  material?: {
    id: string;
    code?: string | null;
    name: string;
    category: string;
    baseUnit: string;
  } | null;
  mappingStatus: OfferMatchStatus;
  mappingReason?: string | null;
  intakeSource: string;
  status: string;
  isActive: boolean;
  isPreferred: boolean;
  unit: string;
  unitCost: number;
  leadTimeDays: number;
  validUntil?: string | null;
  family: SourcingFamily;
  candidates: OfferMaterialCandidate[];
  duplicateCandidates: OfferDuplicateCandidate[];
};

export type OfferCatalogMetrics = {
  totalOffers: number;
  activeOffers: number;
  mappedOffers: number;
  reviewQueueCount: number;
  needsReviewCount: number;
  candidateCount: number;
  duplicateCount: number;
  inactiveCount: number;
  familyBreakdown: Array<{
    family: SourcingFamily;
    totalOffers: number;
    activeMappedOffers: number;
    reviewQueueOffers: number;
    duplicateOffers: number;
  }>;
};

export type OfferBulkAction =
  | {
      action: 'ASSIGN_MATERIAL';
      offerIds: string[];
      materialId: string;
      activate?: boolean;
    }
  | {
      action: 'CONFIRM_CANDIDATE';
      offerIds: string[];
      materialId?: string;
    }
  | {
      action: 'SET_ACTIVE';
      offerIds: string[];
      isActive: boolean;
    }
  | {
      action: 'MARK_NO_MATCH';
      offerIds: string[];
    }
  | {
      action: 'MARK_NEEDS_REVIEW';
      offerIds: string[];
    }
  | {
      action: 'DEDUPLICATE_KEEP';
      offerIds: string[];
      keepOfferId: string;
    };

export type OfferBulkActionResult = {
  processedCount: number;
  affectedOfferIds: string[];
  message: string;
};

export type OfferCsvPreviewRow = {
  rowNumber: number;
  supplierName?: string | null;
  procurementMaterialCode?: string | null;
  supplierProductName?: string | null;
  status: OfferMatchStatus | 'READY_TO_CREATE' | 'INVALID_ROW';
  mappingStatus: OfferMatchStatus;
  mappingReason: string;
  duplicateOfferId?: string | null;
  candidates: OfferMaterialCandidate[];
};

export type OfferCsvPreview = {
  totalRows: number;
  readyToCreate: number;
  needsReview: number;
  duplicateCount: number;
  invalidCount: number;
  rows: OfferCsvPreviewRow[];
};

function normalizeText(value?: string | null) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizedIncludes(left?: string | null, right?: string | null) {
  const base = normalizeText(left);
  const query = normalizeText(right);
  if (!base || !query) return false;
  return base.includes(query) || query.includes(base);
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))));
}

function appendObservation(base?: string | null, extra?: string | null) {
  const values = uniqueStrings([base || null, extra || null]);
  return values.length > 0 ? values.join(' | ') : null;
}

function deriveOfferFamily(params: {
  procurementMaterialCode?: string | null;
  materialCode?: string | null;
  materialCategory?: string | null;
}) : SourcingFamily {
  if (params.procurementMaterialCode || params.materialCode) {
    return sourcingFamilyFromMaterialCode(params.procurementMaterialCode || params.materialCode || null);
  }

  const category = normalizeText(params.materialCategory);
  if (category.includes('pint')) return 'PAINT';
  if (category.includes('ceram')) return 'CERAMICS';
  if (category.includes('imper')) return 'WATERPROOFING';
  if (category.includes('electric')) return 'ELECTRICAL';
  if (category.includes('font') || category.includes('plumb')) return 'PLUMBING';
  if (category.includes('san')) return 'DRAINAGE';
  if (category.includes('cocina')) return 'KITCHEN';
  if (category.includes('bano')) return 'BATH';
  if (category.includes('carp')) return 'CARPENTRY';
  if (category.includes('placa') || category.includes('pladur') || category.includes('yeso')) return 'PLASTERBOARD';
  return 'GENERAL';
}

function scoreMaterialCandidate(input: {
  procurementMaterialCode?: string | null;
  supplierProductName?: string | null;
  material: {
    id: string;
    code?: string | null;
    name: string;
    category: string;
    baseUnit: string;
  };
}) {
  const procurementCode = normalizeText(input.procurementMaterialCode);
  const materialCode = normalizeText(input.material.code);
  const productName = normalizeText(input.supplierProductName);
  const materialName = normalizeText(input.material.name);

  if (procurementCode && materialCode && procurementCode === materialCode) {
    return {
      score: 100,
      confidence: 'HIGH' as const,
      matchType: 'DIRECT_CODE' as const,
      reason: 'Coincidencia directa por procurement/material code.',
    };
  }

  if (
    procurementCode &&
    materialCode &&
    (procurementCode.includes(materialCode) || materialCode.includes(procurementCode))
  ) {
    return {
      score: 90,
      confidence: 'HIGH' as const,
      matchType: 'DIRECT_CODE' as const,
      reason: 'Coincidencia cercana por codigo interno.',
    };
  }

  if (productName && materialName && (productName === materialName || normalizedIncludes(productName, materialName))) {
    return {
      score: productName === materialName ? 82 : 72,
      confidence: productName === materialName ? ('HIGH' as const) : ('MEDIUM' as const),
      matchType: 'NAME_CANDIDATE' as const,
      reason: 'Coincidencia prudente por nombre de producto/material.',
    };
  }

  if (productName && materialCode && normalizedIncludes(productName, materialCode)) {
    return {
      score: 68,
      confidence: 'MEDIUM' as const,
      matchType: 'NAME_CANDIDATE' as const,
      reason: 'El nombre del proveedor contiene un codigo interno parecido.',
    };
  }

  return null;
}

export async function findOfferMaterialCandidates(input: {
  procurementMaterialCode?: string | null;
  supplierProductName?: string | null;
  limit?: number;
}) : Promise<OfferMaterialCandidate[]> {
  const materials = await db.material.findMany({
    where: { status: 'ACTIVO' },
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      baseUnit: true,
    },
  });

  const candidates = materials
    .map((material) => {
      const scored = scoreMaterialCandidate({
        procurementMaterialCode: input.procurementMaterialCode,
        supplierProductName: input.supplierProductName,
        material,
      });
      if (!scored) return null;
      return {
        materialId: material.id,
        materialCode: material.code || null,
        materialName: material.name,
        category: material.category,
        baseUnit: material.baseUnit,
        confidence: scored.confidence,
        matchType: scored.matchType,
        score: scored.score,
        reason: scored.reason,
      } satisfies OfferMaterialCandidate;
    })
    .filter((candidate) => Boolean(candidate)) as OfferMaterialCandidate[];

  candidates.sort((left, right) => right.score - left.score || left.materialName.localeCompare(right.materialName));

  return candidates.slice(0, Math.max(1, input.limit || 5));
}

export async function resolveOfferMaterialMatch(input: {
  materialId?: string | null;
  procurementMaterialCode?: string | null;
  supplierProductName?: string | null;
}) {
  if (input.materialId) {
    const material = await db.material.findUnique({
      where: { id: input.materialId },
      select: { id: true, code: true, name: true },
    });
    if (material) {
      return {
        materialId: material.id,
        procurementMaterialCode: material.code || input.procurementMaterialCode || null,
        mappingStatus: 'MATCHED_DIRECT' as OfferMatchStatus,
        mappingReason: 'Material enlazado manualmente por id interno.',
      };
    }
  }

  if (input.procurementMaterialCode) {
    const material = await db.material.findFirst({
      where: {
        code: input.procurementMaterialCode,
      },
      select: { id: true, code: true, name: true },
    });
    if (material) {
      return {
        materialId: material.id,
        procurementMaterialCode: material.code || input.procurementMaterialCode,
        mappingStatus: 'MATCHED_BY_CODE' as OfferMatchStatus,
        mappingReason: 'Oferta mapeada por procurement/material code interno.',
      };
    }
  }

  if (input.supplierProductName) {
    const [candidate] = await findOfferMaterialCandidates({
      procurementMaterialCode: input.procurementMaterialCode,
      supplierProductName: input.supplierProductName,
      limit: 1,
    });

    if (candidate) {
      return {
        materialId: candidate.materialId,
        procurementMaterialCode: candidate.materialCode || null,
        mappingStatus: 'MATCHED_BY_NAME_CANDIDATE' as OfferMatchStatus,
        mappingReason: candidate.reason,
      };
    }
  }

  return {
    materialId: null,
    procurementMaterialCode: input.procurementMaterialCode || null,
    mappingStatus: 'NEEDS_REVIEW' as OfferMatchStatus,
    mappingReason: 'No hay mapping suficientemente fiable; la oferta queda pendiente de revision.',
  };
}

export async function findDuplicateSupplierOffer(params: {
  offerId?: string | null;
  supplierId: string;
  materialId?: string | null;
  procurementMaterialCode?: string | null;
  supplierProductRef?: string | null;
  supplierProductName?: string | null;
  unit: string;
  warehouseLabel?: string | null;
}) {
  const offers = await db.supplierMaterialOffer.findMany({
    where: {
      supplierId: params.supplierId,
      unit: params.unit,
      ...(params.offerId ? { id: { not: params.offerId } } : {}),
    },
    select: {
      id: true,
      materialId: true,
      procurementMaterialCode: true,
      supplierProductRef: true,
      supplierProductName: true,
      warehouseLabel: true,
    },
  });

  return (
    offers.find((offer) => {
      if (params.materialId && offer.materialId === params.materialId) {
        if (
          normalizeText(offer.warehouseLabel) === normalizeText(params.warehouseLabel) &&
          normalizeText(offer.supplierProductRef) === normalizeText(params.supplierProductRef)
        ) {
          return true;
        }
      }

      return (
        normalizeText(offer.procurementMaterialCode) === normalizeText(params.procurementMaterialCode) &&
        normalizeText(offer.supplierProductRef) === normalizeText(params.supplierProductRef) &&
        normalizeText(offer.supplierProductName) === normalizeText(params.supplierProductName) &&
        normalizeText(offer.warehouseLabel) === normalizeText(params.warehouseLabel)
      );
    }) || null
  );
}

export async function findDuplicateOfferCandidates(params: {
  offerId?: string | null;
  supplierId: string;
  materialId?: string | null;
  procurementMaterialCode?: string | null;
  supplierProductRef?: string | null;
  supplierProductName?: string | null;
  unit: string;
  warehouseLabel?: string | null;
  limit?: number;
}) : Promise<OfferDuplicateCandidate[]> {
  const offers = await db.supplierMaterialOffer.findMany({
    where: {
      supplierId: params.supplierId,
      unit: params.unit,
      ...(params.offerId ? { id: { not: params.offerId } } : {}),
    },
    include: {
      supplier: {
        select: { id: true, name: true },
      },
      material: {
        select: { id: true, code: true, name: true },
      },
    },
    orderBy: [
      { isActive: 'desc' },
      { updatedAt: 'desc' },
    ],
  });

  const duplicateCandidates = offers
    .map((offer) => {
      const reasons: string[] = [];
      let score = 0;

      if (params.materialId && offer.materialId === params.materialId) {
        score += 40;
        reasons.push('Mismo material interno.');
      }
      if (
        normalizeText(params.procurementMaterialCode) &&
        normalizeText(params.procurementMaterialCode) === normalizeText(offer.procurementMaterialCode)
      ) {
        score += 25;
        reasons.push('Mismo procurement code.');
      }
      if (
        normalizeText(params.supplierProductRef) &&
        normalizeText(params.supplierProductRef) === normalizeText(offer.supplierProductRef)
      ) {
        score += 25;
        reasons.push('Misma referencia de proveedor.');
      }
      if (
        normalizeText(params.supplierProductName) &&
        normalizeText(params.supplierProductName) === normalizeText(offer.supplierProductName)
      ) {
        score += 20;
        reasons.push('Mismo nombre de producto.');
      } else if (
        normalizedIncludes(params.supplierProductName, offer.supplierProductName)
      ) {
        score += 12;
        reasons.push('Nombre de producto muy similar.');
      }
      if (
        normalizeText(params.warehouseLabel) &&
        normalizeText(params.warehouseLabel) === normalizeText(offer.warehouseLabel)
      ) {
        score += 8;
        reasons.push('Mismo almacen.');
      }

      if (score < 20) return null;

      return {
        offerId: offer.id,
        supplierId: offer.supplierId,
        supplierName: offer.supplier?.name || 'Proveedor',
        materialId: offer.materialId,
        materialCode: offer.material?.code || offer.procurementMaterialCode || null,
        materialName: offer.material?.name || null,
        procurementMaterialCode: offer.procurementMaterialCode,
        supplierProductName: offer.supplierProductName,
        supplierProductRef: offer.supplierProductRef,
        warehouseLabel: offer.warehouseLabel,
        unit: offer.unit,
        unitCost: offer.unitCost,
        leadTimeDays: offer.leadTimeDays,
        isActive: offer.isActive,
        status: offer.status,
        score,
        reason: reasons.join(' '),
      } satisfies OfferDuplicateCandidate;
    })
    .filter((candidate) => Boolean(candidate)) as OfferDuplicateCandidate[];

  duplicateCandidates.sort((left, right) => right.score - left.score || left.unitCost - right.unitCost);

  return duplicateCandidates.slice(0, Math.max(1, params.limit || 5));
}

export async function intakeSupplierOffer(params: {
  payload: OfferIntakePayload;
  source: OfferIntakeSource;
  updateExisting?: boolean;
}) : Promise<OfferIntakeResult> {
  const payload = params.payload;
  const supplierId = payload.supplierId
    ? payload.supplierId
    : payload.supplierName
      ? (
          await db.client.findFirst({
            where: {
              name: payload.supplierName,
              category: 'PROVEEDOR',
            },
            select: { id: true },
          })
        )?.id || null
      : null;

  if (!supplierId) {
    return {
      status: 'NEEDS_REVIEW',
      mappingStatus: 'NEEDS_REVIEW',
      mappingReason: 'La oferta no tiene supplierId ni supplierName resoluble.',
    };
  }

  const match = await resolveOfferMaterialMatch({
    materialId: payload.materialId,
    procurementMaterialCode: payload.procurementMaterialCode,
    supplierProductName: payload.supplierProductName,
  });

  const duplicate = await findDuplicateSupplierOffer({
    supplierId,
    materialId: match.materialId,
    procurementMaterialCode: match.procurementMaterialCode,
    supplierProductRef: payload.supplierProductRef,
    supplierProductName: payload.supplierProductName,
    unit: payload.unit,
    warehouseLabel: payload.warehouseLabel,
  });

  if (duplicate && !params.updateExisting) {
    return {
      status: 'DUPLICATE_SKIPPED',
      materialId: match.materialId,
      procurementMaterialCode: match.procurementMaterialCode,
      mappingStatus: match.mappingStatus,
      mappingReason: `${match.mappingReason} Oferta equivalente ya existente.`,
      duplicateOfferId: duplicate.id,
    };
  }

  const data = {
    supplierId,
    ...(match.materialId ? { materialId: match.materialId } : {}),
    procurementMaterialCode: match.procurementMaterialCode,
    supplierProductName: payload.supplierProductName || null,
    supplierProductRef: payload.supplierProductRef || null,
    warehouseLabel: payload.warehouseLabel || null,
    unitCost: Number(payload.unitCost),
    currency: payload.currency || 'EUR',
    unit: payload.unit,
    leadTimeDays: Number(payload.leadTimeDays),
    isPreferred: Boolean(payload.isPreferred),
    validFrom: payload.validFrom ? new Date(payload.validFrom) : null,
    validUntil: payload.validUntil ? new Date(payload.validUntil) : null,
    status: payload.status || 'ACTIVA',
    isActive: (payload.status || 'ACTIVA') === 'ACTIVA',
    intakeSource: params.source,
    mappingStatus: match.mappingStatus,
    mappingReason: match.mappingReason,
    observations: payload.observations || null,
  };

  if (duplicate && params.updateExisting) {
    await db.supplierMaterialOffer.update({
      where: { id: duplicate.id },
      data,
    });
    return {
      status: 'UPDATED',
      materialId: match.materialId,
      procurementMaterialCode: match.procurementMaterialCode,
      mappingStatus: match.mappingStatus,
      mappingReason: `${match.mappingReason} Oferta existente actualizada.`,
      duplicateOfferId: duplicate.id,
      createdOfferId: duplicate.id,
    };
  }

  const created = await db.supplierMaterialOffer.create({
    data,
  });

  return {
    status: 'CREATED',
    materialId: match.materialId,
    procurementMaterialCode: match.procurementMaterialCode,
    mappingStatus: match.mappingStatus,
    mappingReason: match.mappingReason,
    createdOfferId: created.id,
  };
}

export async function buildOfferCatalogMetrics(): Promise<OfferCatalogMetrics> {
  const offers = await db.supplierMaterialOffer.findMany({
    include: {
      material: {
        select: { code: true, category: true },
      },
    },
  });

  const familyMap = new Map<SourcingFamily, OfferCatalogMetrics['familyBreakdown'][number]>();
  for (const offer of offers) {
    const family = deriveOfferFamily({
      procurementMaterialCode: offer.procurementMaterialCode,
      materialCode: offer.material?.code || null,
      materialCategory: offer.material?.category || null,
    });
    const current = familyMap.get(family) || {
      family,
      totalOffers: 0,
      activeMappedOffers: 0,
      reviewQueueOffers: 0,
      duplicateOffers: 0,
    };
    current.totalOffers += 1;
    if (offer.isActive && Boolean(offer.materialId || offer.procurementMaterialCode) && !['NEEDS_REVIEW', 'MATCHED_BY_NAME_CANDIDATE'].includes(offer.mappingStatus)) {
      current.activeMappedOffers += 1;
    }
    if (['NEEDS_REVIEW', 'MATCHED_BY_NAME_CANDIDATE'].includes(offer.mappingStatus)) {
      current.reviewQueueOffers += 1;
    }
    if (offer.mappingStatus === 'DUPLICATE_SKIPPED') {
      current.duplicateOffers += 1;
    }
    familyMap.set(family, current);
  }

  return {
    totalOffers: offers.length,
    activeOffers: offers.filter((offer) => offer.isActive).length,
    mappedOffers: offers.filter((offer) => Boolean(offer.materialId)).length,
    reviewQueueCount: offers.filter((offer) => ['NEEDS_REVIEW', 'MATCHED_BY_NAME_CANDIDATE', 'DUPLICATE_SKIPPED'].includes(offer.mappingStatus)).length,
    needsReviewCount: offers.filter((offer) => offer.mappingStatus === 'NEEDS_REVIEW').length,
    candidateCount: offers.filter((offer) => offer.mappingStatus === 'MATCHED_BY_NAME_CANDIDATE').length,
    duplicateCount: offers.filter((offer) => offer.mappingStatus === 'DUPLICATE_SKIPPED').length,
    inactiveCount: offers.filter((offer) => !offer.isActive).length,
    familyBreakdown: Array.from(familyMap.values()).sort((left, right) => right.totalOffers - left.totalOffers),
  };
}

export async function buildOfferReviewQueue() : Promise<OfferReviewRow[]> {
  const offers = await db.supplierMaterialOffer.findMany({
    where: {
      mappingStatus: {
        in: ['NEEDS_REVIEW', 'MATCHED_BY_NAME_CANDIDATE', 'DUPLICATE_SKIPPED'],
      },
    },
    include: {
      supplier: {
        select: { id: true, name: true },
      },
      material: {
        select: { id: true, code: true, name: true, category: true, baseUnit: true },
      },
    },
    orderBy: [
      { isActive: 'desc' },
      { updatedAt: 'desc' },
    ],
  });

  const rows = await Promise.all(
    offers.map(async (offer) => {
      const [candidates, duplicateCandidates] = await Promise.all([
        findOfferMaterialCandidates({
          procurementMaterialCode: offer.procurementMaterialCode,
          supplierProductName: offer.supplierProductName,
          limit: 4,
        }),
        findDuplicateOfferCandidates({
          offerId: offer.id,
          supplierId: offer.supplierId,
          materialId: offer.materialId,
          procurementMaterialCode: offer.procurementMaterialCode,
          supplierProductRef: offer.supplierProductRef,
          supplierProductName: offer.supplierProductName,
          unit: offer.unit,
          warehouseLabel: offer.warehouseLabel,
          limit: 3,
        }),
      ]);

      return {
        id: offer.id,
        supplierId: offer.supplierId,
        supplierName: offer.supplier?.name || 'Proveedor',
        supplierProductName: offer.supplierProductName,
        supplierProductRef: offer.supplierProductRef,
        procurementMaterialCode: offer.procurementMaterialCode,
        warehouseLabel: offer.warehouseLabel,
        material: offer.material
          ? {
              id: offer.material.id,
              code: offer.material.code || null,
              name: offer.material.name,
              category: offer.material.category,
              baseUnit: offer.material.baseUnit,
            }
          : null,
        mappingStatus: offer.mappingStatus as OfferMatchStatus,
        mappingReason: offer.mappingReason,
        intakeSource: offer.intakeSource,
        status: offer.status,
        isActive: offer.isActive,
        isPreferred: offer.isPreferred,
        unit: offer.unit,
        unitCost: offer.unitCost,
        leadTimeDays: offer.leadTimeDays,
        validUntil: offer.validUntil ? offer.validUntil.toISOString() : null,
        family: deriveOfferFamily({
          procurementMaterialCode: offer.procurementMaterialCode,
          materialCode: offer.material?.code || null,
          materialCategory: offer.material?.category || null,
        }),
        candidates,
        duplicateCandidates,
      } satisfies OfferReviewRow;
    }),
  );

  return rows;
}

export async function previewOfferCsvImport(csvText: string) : Promise<OfferCsvPreview> {
  const payloads = csvRowsToOfferPayloads(csvText);
  const rows = await Promise.all(
    payloads.map(async (row, index) => {
      if (!row.unit || !Number.isFinite(row.unitCost) || !Number.isFinite(row.leadTimeDays)) {
        return {
          rowNumber: index + 2,
          supplierName: row.supplierName || null,
          procurementMaterialCode: row.procurementMaterialCode || null,
          supplierProductName: row.supplierProductName || null,
          status: 'INVALID_ROW' as const,
          mappingStatus: 'NEEDS_REVIEW' as OfferMatchStatus,
          mappingReason: 'Fila CSV incompleta o sin datos numericos suficientes.',
          candidates: [],
        } satisfies OfferCsvPreviewRow;
      }

      const match = await resolveOfferMaterialMatch({
        materialId: row.materialId,
        procurementMaterialCode: row.procurementMaterialCode,
        supplierProductName: row.supplierProductName,
      });

      let duplicateOfferId: string | null = null;
      if (row.supplierId || row.supplierName) {
        const supplierId = row.supplierId
          ? row.supplierId
          : row.supplierName
            ? (
                await db.client.findFirst({
                  where: {
                    name: row.supplierName,
                    category: 'PROVEEDOR',
                  },
                  select: { id: true },
                })
              )?.id || null
            : null;

        if (supplierId) {
          const duplicate = await findDuplicateSupplierOffer({
            supplierId,
            materialId: match.materialId,
            procurementMaterialCode: match.procurementMaterialCode,
            supplierProductRef: row.supplierProductRef,
            supplierProductName: row.supplierProductName,
            unit: row.unit,
            warehouseLabel: row.warehouseLabel,
          });
          duplicateOfferId = duplicate?.id || null;
        }
      }

      const candidates =
        match.mappingStatus === 'MATCHED_BY_NAME_CANDIDATE' || match.mappingStatus === 'NEEDS_REVIEW'
          ? await findOfferMaterialCandidates({
              procurementMaterialCode: row.procurementMaterialCode,
              supplierProductName: row.supplierProductName,
              limit: 4,
            })
          : [];

      return {
        rowNumber: index + 2,
        supplierName: row.supplierName || null,
        procurementMaterialCode: row.procurementMaterialCode || null,
        supplierProductName: row.supplierProductName || null,
        status: duplicateOfferId
          ? 'DUPLICATE_SKIPPED'
          : match.mappingStatus === 'NEEDS_REVIEW'
            ? 'NEEDS_REVIEW'
            : 'READY_TO_CREATE',
        mappingStatus: match.mappingStatus,
        mappingReason: duplicateOfferId
          ? `${match.mappingReason} Se detecta oferta equivalente ya cargada.`
          : match.mappingReason,
        duplicateOfferId,
        candidates,
      } satisfies OfferCsvPreviewRow;
    }),
  );

  return {
    totalRows: rows.length,
    readyToCreate: rows.filter((row) => row.status === 'READY_TO_CREATE').length,
    needsReview: rows.filter((row) => row.mappingStatus === 'NEEDS_REVIEW').length,
    duplicateCount: rows.filter((row) => row.status === 'DUPLICATE_SKIPPED').length,
    invalidCount: rows.filter((row) => row.status === 'INVALID_ROW').length,
    rows,
  };
}

export async function applyBulkOfferAction(action: OfferBulkAction) : Promise<OfferBulkActionResult> {
  const offerIds = Array.from(new Set(action.offerIds.filter(Boolean)));
  if (offerIds.length === 0) {
    return {
      processedCount: 0,
      affectedOfferIds: [],
      message: 'No hay ofertas seleccionadas.',
    };
  }

  const offers = await db.supplierMaterialOffer.findMany({
    where: { id: { in: offerIds } },
    include: {
      material: {
        select: { id: true, code: true, name: true },
      },
    },
  });

  if (offers.length === 0) {
    return {
      processedCount: 0,
      affectedOfferIds: [],
      message: 'No se encontraron ofertas para procesar.',
    };
  }

  if (action.action === 'ASSIGN_MATERIAL' || action.action === 'CONFIRM_CANDIDATE') {
    const materialId =
      action.materialId ||
      null;
    if (!materialId) {
      return {
        processedCount: 0,
        affectedOfferIds: [],
        message: 'No hay material interno seleccionado para confirmar.',
      };
    }
    const material = await db.material.findUnique({
      where: { id: materialId },
      select: { id: true, code: true, name: true },
    });
    if (!material) {
      return {
        processedCount: 0,
        affectedOfferIds: [],
        message: 'Material interno no encontrado.',
      };
    }

    await db.$transaction(
      offers.map((offer) =>
        db.supplierMaterialOffer.update({
          where: { id: offer.id },
          data: {
            materialId: material.id,
            procurementMaterialCode: material.code || offer.procurementMaterialCode,
            mappingStatus: 'MATCHED_DIRECT',
            mappingReason:
              action.action === 'CONFIRM_CANDIDATE'
                ? 'Candidato de material confirmado manualmente desde la cola de revision.'
                : 'Material interno asignado manualmente desde la cola de revision.',
            ...(action.action === 'ASSIGN_MATERIAL' && action.activate !== undefined
              ? {
                  isActive: action.activate,
                  status: action.activate ? 'ACTIVA' : 'PAUSADA',
                }
              : {}),
          },
        })
      )
    );

    return {
      processedCount: offers.length,
      affectedOfferIds: offers.map((offer) => offer.id),
      message: `${offers.length} ofertas normalizadas contra ${material.code || material.name}.`,
    };
  }

  if (action.action === 'SET_ACTIVE') {
    await db.$transaction(
      offers.map((offer) =>
        db.supplierMaterialOffer.update({
          where: { id: offer.id },
          data: {
            isActive: action.isActive,
            status: action.isActive ? 'ACTIVA' : offer.status === 'EXPIRADA' ? 'EXPIRADA' : 'PAUSADA',
            mappingReason: action.isActive
              ? offer.mappingReason || 'Oferta reactivada manualmente.'
              : appendObservation(offer.mappingReason, 'Oferta desactivada manualmente desde la cola de revision.'),
          },
        })
      )
    );
    return {
      processedCount: offers.length,
      affectedOfferIds: offers.map((offer) => offer.id),
      message: action.isActive
        ? `${offers.length} ofertas reactivadas.`
        : `${offers.length} ofertas desactivadas.`,
    };
  }

  if (action.action === 'MARK_NO_MATCH') {
    await db.$transaction(
      offers.map((offer) =>
        db.supplierMaterialOffer.update({
          where: { id: offer.id },
          data: {
            materialId: null,
            mappingStatus: 'NEEDS_REVIEW',
            mappingReason: 'Marcada manualmente como sin match valido; pendiente de catalogacion.',
            observations: appendObservation(offer.observations, 'Sin match valido confirmado en revision manual.'),
          },
        })
      )
    );
    return {
      processedCount: offers.length,
      affectedOfferIds: offers.map((offer) => offer.id),
      message: `${offers.length} ofertas quedan pendientes de catalogacion manual.`,
    };
  }

  if (action.action === 'MARK_NEEDS_REVIEW') {
    await db.$transaction(
      offers.map((offer) =>
        db.supplierMaterialOffer.update({
          where: { id: offer.id },
          data: {
            mappingStatus: 'NEEDS_REVIEW',
            mappingReason: 'Oferta devuelta manualmente a revision.',
          },
        })
      )
    );
    return {
      processedCount: offers.length,
      affectedOfferIds: offers.map((offer) => offer.id),
      message: `${offers.length} ofertas marcadas de nuevo para revision.`,
    };
  }

  if (action.action === 'DEDUPLICATE_KEEP') {
    const keepOffer = offers.find((offer) => offer.id === action.keepOfferId);
    if (!keepOffer) {
      return {
        processedCount: 0,
        affectedOfferIds: [],
        message: 'La oferta principal a conservar no esta en la seleccion.',
      };
    }
    const duplicateIds = offers.filter((offer) => offer.id !== keepOffer.id).map((offer) => offer.id);
    if (duplicateIds.length === 0) {
      return {
        processedCount: 1,
        affectedOfferIds: [keepOffer.id],
        message: 'No habia duplicados adicionales que consolidar.',
      };
    }
    await db.$transaction(
      duplicateIds.map((offerId) =>
        db.supplierMaterialOffer.update({
          where: { id: offerId },
          data: {
            isActive: false,
            status: 'PAUSADA',
            mappingStatus: 'DUPLICATE_SKIPPED',
            mappingReason: `Duplicada revisada manualmente; se conserva ${keepOffer.id}.`,
            observations: appendObservation(
              offers.find((offer) => offer.id === offerId)?.observations || null,
              `Consolidada manualmente contra ${keepOffer.id}.`
            ),
          },
        })
      )
    );
    return {
      processedCount: duplicateIds.length,
      affectedOfferIds: duplicateIds,
      message: `${duplicateIds.length} ofertas duplicadas consolidadas; se conserva ${keepOffer.id}.`,
    };
  }

  return {
    processedCount: 0,
    affectedOfferIds: [],
    message: 'Accion bulk no soportada.',
  };
}

export function parseOfferCsv(text: string) {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

export function csvRowsToOfferPayloads(csvText: string): OfferIntakePayload[] {
  const rows = parseOfferCsv(csvText).filter((row) => row.some((cell) => cell.trim().length > 0));
  if (rows.length <= 1) return [];
  const [header, ...dataRows] = rows;
  const headerMap = header.map((cell) => normalizeText(cell));

  function valueAt(row: string[], names: string[]) {
    const index = headerMap.findIndex((cell) => names.includes(cell));
    return index >= 0 ? row[index]?.trim() || '' : '';
  }

  return dataRows.map((row) => ({
    supplierName: valueAt(row, ['supplier', 'supplier name', 'proveedor']),
    procurementMaterialCode: valueAt(row, ['material', 'material code', 'procurement code', 'procurementmaterialcode', 'material/procurement code', 'material procurement code']) || null,
    supplierProductName: valueAt(row, ['product name', 'supplier product name', 'producto']) || null,
    supplierProductRef: valueAt(row, ['reference', 'ref', 'supplier product ref']) || null,
    warehouseLabel: valueAt(row, ['warehouse', 'warehouse label', 'almacen']) || null,
    unit: valueAt(row, ['unit', 'unidad']),
    unitCost: Number(valueAt(row, ['unit cost', 'unitcost', 'precio', 'price'])),
    leadTimeDays: Number(valueAt(row, ['lead time', 'leadtimedays', 'lead time days', 'plazo'])),
    status: valueAt(row, ['status', 'estado']) || 'ACTIVA',
    isPreferred: ['true', '1', 'si', 'sí', 'yes'].includes(normalizeText(valueAt(row, ['preferred', 'preferida', 'is preferred']))),
    validUntil: valueAt(row, ['valid until', 'validuntil', 'vigencia', 'fecha fin']) || null,
  }));
}
