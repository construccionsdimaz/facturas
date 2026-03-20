import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string, constraintId: string }> }
) {
  const { constraintId } = await params;
  try {
    const data = await req.json();
    const constraint = await (db as any).projectConstraint.update({
      where: { id: constraintId },
      data: {
        title: data.title,
        type: data.type,
        description: data.description,
        impact: data.impact,
        priority: data.priority,
        manager: data.manager,
        status: data.status,
        targetResolutionDate: data.targetResolutionDate ? new Date(data.targetResolutionDate) : null,
        comments: data.comments
      }
    });
    return NextResponse.json(constraint);
  } catch (error) {
    console.error('Error updating constraint:', error);
    return NextResponse.json({ error: 'Error al actualizar restricción' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string, constraintId: string }> }
) {
  const { constraintId } = await params;
  try {
    await (db as any).projectConstraint.delete({
      where: { id: constraintId }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting constraint:', error);
    return NextResponse.json({ error: 'Error al eliminar restricción' }, { status: 500 });
  }
}
