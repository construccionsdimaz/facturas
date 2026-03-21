import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string, supplyId: string }> }
) {
  const { supplyId } = await params;
  try {
    const supply = await (db as any).projectSupply.findUnique({
      where: { id: supplyId },
      include: {
        projectActivity: true,
        location: true,
        wbs: true
      }
    });
    if (!supply) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    return NextResponse.json(supply);
  } catch (error) {
    return NextResponse.json({ error: 'Error cargando detalle' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string, supplyId: string }> }
) {
  const { supplyId } = await params;
  try {
    const data = await req.json();

    const updated = await (db as any).projectSupply.update({
      where: { id: supplyId },
      data: {
        description: data.description,
        category: data.category,
        projectActivityId: data.projectActivityId,
        locationId: data.locationId,
        wbsId: data.wbsId,
        requiredOnSiteDate: data.requiredOnSiteDate ? new Date(data.requiredOnSiteDate) : null,
        leadTimeDays: data.leadTimeDays ? parseInt(data.leadTimeDays) : null,
        orderDate: data.orderDate ? new Date(data.orderDate) : null,
        priority: data.priority,
        status: data.status,
        responsible: data.responsible,
        quantity: data.quantity ? parseFloat(data.quantity) : null,
        unit: data.unit,
        observations: data.observations
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Error actualizando suministro' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string, supplyId: string }> }
) {
  const { supplyId } = await params;
  try {
    await (db as any).projectSupply.delete({
      where: { id: supplyId }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
