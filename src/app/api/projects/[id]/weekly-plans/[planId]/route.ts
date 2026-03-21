import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string, planId: string }> }
) {
  const { planId } = await params;
  try {
    const plan = await (db as any).weeklyPlan.findUnique({
      where: { id: planId },
      include: {
        activities: {
          include: {
            projectActivity: {
              include: { location: true, wbs: true }
            }
          }
        }
      }
    });
    if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error fetching plan:', error);
    return NextResponse.json({ error: 'Error al cargar plan' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string, planId: string }> }
) {
  const { planId } = await params;
  try {
    const data = await req.json();

    const plan = await (db as any).weeklyPlan.update({
      where: { id: planId },
      data: {
        weekName: data.weekName,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        generalManager: data.generalManager,
        status: data.status,
        observations: data.observations
      }
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error updating plan:', error);
    return NextResponse.json({ error: 'Error actualizando' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string, planId: string }> }
) {
  const { planId } = await params;
  try {
    await (db as any).weeklyPlan.delete({
      where: { id: planId }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting plan:', error);
    return NextResponse.json({ error: 'Error eliminando el plan semanal' }, { status: 500 });
  }
}
