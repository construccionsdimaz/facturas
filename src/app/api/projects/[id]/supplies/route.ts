import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supplies = await (db as any).projectSupply.findMany({
      where: { projectId: id },
      include: {
        projectActivity: {
          select: { id: true, name: true, code: true, plannedStartDate: true, plannedEndDate: true }
        },
        location: {
          select: { id: true, name: true }
        },
        wbs: {
          select: { id: true, name: true, code: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(supplies);
  } catch (error) {
    console.error('Error fetching supplies:', error);
    return NextResponse.json({ error: 'Error al cargar suministros' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await req.json();

    const supply = await (db as any).projectSupply.create({
      data: {
        projectId: id,
        description: data.description,
        category: data.category || 'OTROS',
        projectActivityId: data.projectActivityId || null,
        locationId: data.locationId || null,
        wbsId: data.wbsId || null,
        requiredOnSiteDate: data.requiredOnSiteDate ? new Date(data.requiredOnSiteDate) : null,
        leadTimeDays: data.leadTimeDays ? parseInt(data.leadTimeDays) : null,
        orderDate: data.orderDate ? new Date(data.orderDate) : null,
        priority: data.priority || 'NORMAL',
        status: data.status || 'IDENTIFICADA',
        responsible: data.responsible,
        quantity: data.quantity ? parseFloat(data.quantity) : null,
        unit: data.unit,
        observations: data.observations
      }
    });

    return NextResponse.json(supply);
  } catch (error) {
    console.error('Error creating supply:', error);
    return NextResponse.json({ error: 'Error al registrar abastecimiento' }, { status: 500 });
  }
}
