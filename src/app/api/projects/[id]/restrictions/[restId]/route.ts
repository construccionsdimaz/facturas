import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string, restId: string }> }
) {
  const { restId } = await params;
  try {
    const restriction = await (db as any).restriction.findUnique({
      where: { id: restId },
      include: {
        projectActivity: true,
        location: true,
        wbs: true
      }
    });
    if (!restriction) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    return NextResponse.json(restriction);
  } catch (error) {
    console.error('Error detail restriction:', error);
    return NextResponse.json({ error: 'Error cargando detalle' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string, restId: string }> }
) {
  const { restId } = await params;
  try {
    const data = await req.json();

    const updated = await (db as any).restriction.update({
      where: { id: restId },
      data: {
        title: data.title,
        type: data.type,
        description: data.description,
        projectActivityId: data.projectActivityId,
        locationId: data.locationId,
        wbsId: data.wbsId,
        priority: data.priority,
        status: data.status,
        responsible: data.responsible,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        impact: data.impact,
        observations: data.observations,
        resolutionDate: data.resolutionDate ? new Date(data.resolutionDate) : (data.status === 'RESUELTA' || data.status === 'CERRADA' ? new Date() : null),
        resolutionNotes: data.resolutionNotes
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating restriction:', error);
    return NextResponse.json({ error: 'Error actualizando restricción' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string, restId: string }> }
) {
  const { restId } = await params;
  try {
    await (db as any).restriction.delete({
      where: { id: restId }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting restriction:', error);
    return NextResponse.json({ error: 'Error al eliminar restricción' }, { status: 500 });
  }
}
