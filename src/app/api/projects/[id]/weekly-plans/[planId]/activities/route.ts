import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string, planId: string }> }
) {
  const { planId } = await params;
  try {
    const data = await req.json();
    const { projectActivityIds } = data; // Expecting an array of IDs from the Lookahead/Schedule

    if (!Array.isArray(projectActivityIds) || projectActivityIds.length === 0) {
      return NextResponse.json({ error: 'No se enviaron actividades a incorporar' }, { status: 400 });
    }

    // Usar createMany para eficiencia, ignorando duplicados si el esquema lo permite, o loop con try/catch.
    const createdActivities = [];
    for (const activityId of projectActivityIds) {
      try {
        const act = await (db as any).weeklyPlanActivity.create({
          data: {
            weeklyPlanId: planId,
            projectActivityId: activityId,
            weeklyStatus: 'PENDIENTE',
            priority: 'NORMAL'
          }
        });
        createdActivities.push(act);
      } catch (err: any) {
        // Ignoramos duplicados (P2002) silenciosamente
        if (err.code !== 'P2002') console.error(err);
      }
    }

    return NextResponse.json({ success: true, count: createdActivities.length });
  } catch (error) {
    console.error('Error adding activities to plan:', error);
    return NextResponse.json({ error: 'Error inyectando el compromiso semanal' }, { status: 500 });
  }
}
