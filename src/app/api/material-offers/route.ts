import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureProcurementCatalog } from '@/lib/procurement/catalog';

export async function GET(request: Request) {
  try {
    await ensureProcurementCatalog();
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');

    const offers = await db.supplierMaterialOffer.findMany({
      where: {
        status: 'ACTIVA',
        ...(materialId ? { materialId } : {}),
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
    if (!body.materialId || !body.supplierId) {
      return NextResponse.json({ error: 'materialId y supplierId son obligatorios' }, { status: 400 });
    }
    if (!body.unit || !body.unitCost || body.leadTimeDays === undefined || body.leadTimeDays === null) {
      return NextResponse.json({ error: 'La oferta requiere unit, unitCost y leadTimeDays' }, { status: 400 });
    }

    const offer = await db.supplierMaterialOffer.create({
      data: {
        materialId: body.materialId,
        supplierId: body.supplierId,
        unitCost: Number(body.unitCost),
        currency: body.currency || 'EUR',
        unit: body.unit,
        leadTimeDays: Number(body.leadTimeDays),
        minimumOrderQty: body.minimumOrderQty ? Number(body.minimumOrderQty) : null,
        isPreferred: Boolean(body.isPreferred),
        validFrom: body.validFrom ? new Date(body.validFrom) : null,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        observations: body.observations || null,
        status: body.status || 'ACTIVA',
      },
      include: {
        supplier: { select: { id: true, name: true } },
        material: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json(offer, { status: 201 });
  } catch (error) {
    console.error('Error creating offer:', error);
    return NextResponse.json({ error: 'No se pudo crear la oferta' }, { status: 500 });
  }
}
