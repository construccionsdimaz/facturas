import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { intakeSupplierOffer } from '@/lib/procurement/offer-intake';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const existing = await db.supplierMaterialOffer.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Oferta no encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const result = await intakeSupplierOffer({
      payload: {
        supplierId: body.supplierId || existing.supplierId,
        materialId: body.materialId ?? existing.materialId,
        procurementMaterialCode: body.procurementMaterialCode ?? existing.procurementMaterialCode,
        supplierProductName: body.supplierProductName ?? existing.supplierProductName,
        supplierProductRef: body.supplierProductRef ?? existing.supplierProductRef,
        warehouseLabel: body.warehouseLabel ?? existing.warehouseLabel,
        unit: body.unit || existing.unit,
        unitCost: Number(body.unitCost ?? existing.unitCost),
        leadTimeDays: Number(body.leadTimeDays ?? existing.leadTimeDays),
        status: body.status || existing.status,
        isPreferred: body.isPreferred ?? existing.isPreferred,
        validFrom: body.validFrom ?? existing.validFrom,
        validUntil: body.validUntil ?? existing.validUntil,
        observations: body.observations ?? existing.observations,
        currency: body.currency || existing.currency,
      },
      source: existing.intakeSource === 'CSV_IMPORT' ? 'CSV_IMPORT' : 'MANUAL',
      updateExisting: true,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating material offer:', error);
    return NextResponse.json({ error: 'No se pudo actualizar la oferta' }, { status: 500 });
  }
}
