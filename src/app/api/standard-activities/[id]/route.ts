import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await req.json();

    if (data.code) {
      const existing = await (db as any).standardActivity.findFirst({
        where: { 
          code: data.code,
          NOT: { id: id }
        }
      });
      if (existing) {
        return NextResponse.json({ error: 'Ya existe otra actividad con este código' }, { status: 400 });
      }
    }

    const activity = await (db as any).standardActivity.update({
      where: { id },
      data: {
        code: data.code || null,
        name: data.name,
        category: data.category,
        description: data.description,
        observations: data.observations,
        status: data.status,
        
        defaultUnit: data.defaultUnit,
        requiresQuantity: data.requiresQuantity,
        requiresLocation: data.requiresLocation,
        requiresManager: data.requiresManager,
        requiresCrew: data.requiresCrew,
        
        canBeInSchedule: data.canBeInSchedule,
        canBeInLookahead: data.canBeInLookahead,
        canBeInWeeklyPlan: data.canBeInWeeklyPlan,
        
        requiresInspection: data.requiresInspection,
        relatedToPurchases: data.relatedToPurchases,
        generatesWait: data.generatesWait,
        actsAsMilestone: data.actsAsMilestone,
        allowsRepetition: data.allowsRepetition
      }
    });
    return NextResponse.json(activity);
  } catch (error) {
    console.error('Error updating standard activity:', error);
    return NextResponse.json({ error: 'Error al actualizar la actividad' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await (db as any).standardActivity.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting standard activity:', error);
    return NextResponse.json({ error: 'Error al eliminar la actividad' }, { status: 500 });
  }
}
