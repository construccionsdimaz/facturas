import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureProcurementCatalog } from '@/lib/procurement/catalog';

export async function GET() {
  try {
    await ensureProcurementCatalog();

    const materials = await db.material.findMany({
      include: {
        offers: {
          where: { status: 'ACTIVA' },
          include: {
            supplier: {
              select: { id: true, name: true },
            },
          },
          orderBy: [
            { isPreferred: 'desc' },
            { unitCost: 'asc' },
          ],
        },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(materials);
  } catch (error) {
    console.error('Error fetching materials:', error);
    return NextResponse.json({ error: 'No se pudieron cargar los materiales' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name || !body.category || !body.baseUnit) {
      return NextResponse.json({ error: 'name, category y baseUnit son obligatorios' }, { status: 400 });
    }

    const material = await db.material.create({
      data: {
        code: body.code || null,
        name: body.name,
        category: body.category,
        baseUnit: body.baseUnit,
        description: body.description || null,
        observations: body.observations || null,
        status: body.status || 'ACTIVO',
        isCriticalForSchedule: Boolean(body.isCriticalForSchedule),
        requiresSpecificSupplier: Boolean(body.requiresSpecificSupplier),
      },
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error('Error creating material:', error);
    return NextResponse.json({ error: 'No se pudo crear el material' }, { status: 500 });
  }
}
