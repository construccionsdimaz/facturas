import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string, depId: string }> }
) {
  const { depId } = await params;
  try {
    const data = await req.json();

    const dependency = await (db as any).activityDependency.update({
      where: { id: depId },
      data: {
        dependencyType: data.dependencyType,
        lagDays: data.lagDays !== undefined ? parseFloat(data.lagDays) : undefined,
        observations: data.observations
      },
    });

    return NextResponse.json(dependency);
  } catch (error) {
    console.error('Error updating dependency:', error);
    return NextResponse.json({ error: 'Error al actualizar dependencia' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string, depId: string }> }
) {
  const { depId } = await params;
  try {
    await (db as any).activityDependency.delete({
      where: { id: depId }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dependency:', error);
    return NextResponse.json({ error: 'Error eliminando el vínculo temporal' }, { status: 500 });
  }
}
