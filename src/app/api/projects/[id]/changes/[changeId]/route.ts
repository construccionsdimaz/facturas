import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string, changeId: string }> }
) {
  const { changeId } = await params;
  try {
    const data = await req.json();

    const updated = await (db as any).projectChangeRequest.update({
      where: { id: changeId },
      data: {
        title: data.title,
        description: data.description,
        reason: data.reason,
        impact: data.impact,
        priority: data.priority,
        status: data.status,
        responsible: data.responsible,
        approvedDate: (data.status === 'APROBADO' || data.status === 'IMPLEMENTADO') ? new Date() : null,
        observations: data.observations
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Error actualizando cambio' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string, changeId: string }> }
) {
  const { changeId } = await params;
  try {
    await (db as any).projectChangeRequest.delete({
      where: { id: changeId }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
