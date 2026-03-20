import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string, milestoneId: string }> }
) {
  const { milestoneId } = await params;
  try {
    const data = await req.json();
    const milestone = await (db as any).projectMilestone.update({
      where: { id: milestoneId },
      data: {
        name: data.name,
        description: data.description,
        targetDate: new Date(data.targetDate),
        priority: data.priority,
        manager: data.manager,
        status: data.status,
        observations: data.observations
      }
    });
    return NextResponse.json(milestone);
  } catch (error) {
    console.error('Error updating milestone:', error);
    return NextResponse.json({ error: 'Error al actualizar hito' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string, milestoneId: string }> }
) {
  const { milestoneId } = await params;
  try {
    await (db as any).projectMilestone.delete({
      where: { id: milestoneId }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    return NextResponse.json({ error: 'Error al eliminar hito' }, { status: 500 });
  }
}
