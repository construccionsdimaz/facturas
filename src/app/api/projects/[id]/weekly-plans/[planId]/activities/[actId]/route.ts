import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string, planId: string, actId: string }> }
) {
  const { actId } = await params;
  try {
    const data = await req.json();

    const updated = await (db as any).weeklyPlanActivity.update({
      where: { id: actId },
      data: {
        priority: data.priority,
        weeklyStatus: data.weeklyStatus,
        executionDays: data.executionDays,
        operationalNotes: data.operationalNotes
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating weekly activity:', error);
    return NextResponse.json({ error: 'Error actualizando tarea semanal' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string, planId: string, actId: string }> }
) {
  const { actId } = await params;
  try {
    await (db as any).weeklyPlanActivity.delete({
      where: { id: actId }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing activity from plan:', error);
    return NextResponse.json({ error: 'Error desvinculando actividad' }, { status: 500 });
  }
}
