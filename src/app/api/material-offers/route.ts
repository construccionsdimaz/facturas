import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureProcurementCatalog } from '@/lib/procurement/catalog';
import { intakeSupplierOffer } from '@/lib/procurement/offer-intake';

export async function GET(request: Request) {
  try {
    await ensureProcurementCatalog();
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');
    const mappingStatus = searchParams.get('mappingStatus');
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const needsReview = searchParams.get('needsReview') === 'true';

    const offers = await db.supplierMaterialOffer.findMany({
      where: {
        ...(materialId ? { materialId } : {}),
        ...(includeInactive ? {} : { isActive: true }),
        ...(mappingStatus ? { mappingStatus } : {}),
        ...(needsReview ? { mappingStatus: 'NEEDS_REVIEW' } : {}),
      },
      include: {
        supplier: {
          select: { id: true, name: true, email: true, phone: true },
        },
        material: {
          select: { id: true, code: true, name: true, category: true, baseUnit: true },
        },
      },
      orderBy: [
        { isPreferred: 'desc' },
        { unitCost: 'asc' },
        { leadTimeDays: 'asc' },
      ],
    });

    return NextResponse.json(offers);
  } catch (error) {
    console.error('Error fetching material offers:', error);
    return NextResponse.json({ error: 'No se pudieron cargar las ofertas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.supplierId && !body.supplierName) {
      return NextResponse.json({ error: 'supplierId o supplierName es obligatorio' }, { status: 400 });
    }
    if (!body.unit || !body.unitCost || body.leadTimeDays === undefined || body.leadTimeDays === null) {
      return NextResponse.json({ error: 'La oferta requiere unit, unitCost y leadTimeDays' }, { status: 400 });
    }

    const result = await intakeSupplierOffer({
      payload: {
        supplierId: body.supplierId || null,
        supplierName: body.supplierName || null,
        materialId: body.materialId || null,
        procurementMaterialCode: body.procurementMaterialCode || null,
        supplierProductName: body.supplierProductName || null,
        supplierProductRef: body.supplierProductRef || null,
        warehouseLabel: body.warehouseLabel || null,
        unit: body.unit,
        unitCost: Number(body.unitCost),
        leadTimeDays: Number(body.leadTimeDays),
        status: body.status || 'ACTIVA',
        isPreferred: Boolean(body.isPreferred),
        validFrom: body.validFrom || null,
        validUntil: body.validUntil || null,
        observations: body.observations || null,
        currency: body.currency || 'EUR',
      },
      source: 'MANUAL',
      updateExisting: Boolean(body.updateExisting),
    });

    return NextResponse.json(result, { status: result.status === 'CREATED' ? 201 : 200 });
  } catch (error) {
    console.error('Error creating offer:', error);
    return NextResponse.json({ error: 'No se pudo crear la oferta' }, { status: 500 });
  }
}
