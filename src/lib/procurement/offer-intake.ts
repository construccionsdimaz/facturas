import { db } from '@/lib/db';

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
    const materials = await db.material.findMany({
      where: { status: 'ACTIVO' },
      select: { id: true, code: true, name: true },
    });
    const candidate = materials.find(
      (material) =>
        normalizedIncludes(input.supplierProductName, material.name) ||
        normalizedIncludes(input.supplierProductName, material.code),
    );

    if (candidate) {
      return {
        materialId: candidate.id,
        procurementMaterialCode: candidate.code || null,
        mappingStatus: 'MATCHED_BY_NAME_CANDIDATE' as OfferMatchStatus,
        mappingReason: 'Oferta mapeada por similitud prudente de nombre/producto.',
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
